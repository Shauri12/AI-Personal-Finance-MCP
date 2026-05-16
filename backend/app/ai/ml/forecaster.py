"""Forecaster — Time-series spending prediction using statistical methods.

Uses exponential smoothing and linear regression for forecasting when
Prophet/XGBoost are unavailable, with graceful fallback.
"""

import numpy as np
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.user import User
from app.models.financial import Transaction


class FinancialForecaster:
    """Predicts future income, expenses, and savings using time-series analysis."""

    def __init__(self, user: User, db: AsyncSession):
        self.user = user
        self.db = db
        self.now = datetime.now(timezone.utc)

    async def forecast_spending(self, months_ahead: int = 3) -> Dict:
        """Forecast monthly spending for the next N months."""
        history = await self._get_monthly_history(12)

        if len(history) < 3:
            return {"error": "Need at least 3 months of data", "forecasts": []}

        expenses = [h["expenses"] for h in history]
        incomes = [h["income"] for h in history]
        savings = [h["savings"] for h in history]

        exp_forecast = self._forecast_series(expenses, months_ahead)
        inc_forecast = self._forecast_series(incomes, months_ahead)
        sav_forecast = [inc_forecast[i] - exp_forecast[i] for i in range(months_ahead)]

        # Category-level forecasts
        cat_history = await self._get_category_history(6)
        cat_forecasts = {}
        for cat, values in cat_history.items():
            if len(values) >= 3:
                cat_forecasts[cat] = self._forecast_series(values, months_ahead)

        # Build forecast months
        forecasts = []
        for i in range(months_ahead):
            month_date = self.now + timedelta(days=30 * (i + 1))
            forecasts.append({
                "month": month_date.strftime("%b %Y"),
                "predicted_income": round(inc_forecast[i], 2),
                "predicted_expenses": round(exp_forecast[i], 2),
                "predicted_savings": round(sav_forecast[i], 2),
                "confidence": round(max(0.5, 1 - 0.1 * i), 2),
            })

        # Trend analysis
        exp_trend = "increasing" if exp_forecast[-1] > expenses[-1] else "decreasing"
        sav_trend = "improving" if sav_forecast[-1] > savings[-1] else "declining"

        return {
            "historical": history,
            "forecasts": forecasts,
            "category_forecasts": {k: [round(v, 2) for v in vals] for k, vals in cat_forecasts.items()},
            "trends": {"expenses": exp_trend, "savings": sav_trend},
            "insights": self._generate_insights(history, forecasts, exp_trend, sav_trend),
        }

    def _forecast_series(self, data: List[float], steps: int) -> List[float]:
        """Forecast using exponential smoothing with trend."""
        if len(data) < 2:
            return [data[-1]] * steps if data else [0] * steps

        # Double exponential smoothing (Holt's method)
        alpha = 0.4  # Level smoothing
        beta = 0.2   # Trend smoothing

        level = data[0]
        trend = data[1] - data[0] if len(data) > 1 else 0

        for val in data[1:]:
            last_level = level
            level = alpha * val + (1 - alpha) * (level + trend)
            trend = beta * (level - last_level) + (1 - beta) * trend

        forecasts = []
        for i in range(1, steps + 1):
            forecast = level + i * trend
            forecasts.append(max(0, forecast))

        return forecasts

    async def _get_monthly_history(self, months: int) -> List[Dict]:
        """Get monthly income/expense/savings history."""
        history = []
        for i in range(months - 1, -1, -1):
            s = (self.now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            e = (self.now - timedelta(days=30 * (i - 1))).replace(day=1) if i > 0 else self.now

            ir = await self.db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                and_(Transaction.user_id == self.user.id, Transaction.transaction_type == "income",
                     Transaction.timestamp >= s, Transaction.timestamp < e)))
            er = await self.db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                and_(Transaction.user_id == self.user.id, Transaction.transaction_type == "expense",
                     Transaction.timestamp >= s, Transaction.timestamp < e)))
            inc, exp = float(ir.scalar()), float(er.scalar())
            history.append({"month": s.strftime("%b %Y"), "income": inc, "expenses": exp, "savings": inc - exp})

        return history

    async def _get_category_history(self, months: int) -> Dict[str, List[float]]:
        """Get spending history per category."""
        cat_data = {}
        for i in range(months - 1, -1, -1):
            s = (self.now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            e = (self.now - timedelta(days=30 * (i - 1))).replace(day=1) if i > 0 else self.now

            r = await self.db.execute(select(Transaction.category, func.sum(Transaction.amount)).where(
                and_(Transaction.user_id == self.user.id, Transaction.transaction_type == "expense",
                     Transaction.timestamp >= s, Transaction.timestamp < e)
            ).group_by(Transaction.category))

            month_cats = {row[0]: float(row[1]) for row in r.all()}
            for cat in month_cats:
                cat_data.setdefault(cat, []).append(month_cats[cat])

        return cat_data

    def _generate_insights(self, history, forecasts, exp_trend, sav_trend) -> List[str]:
        insights = []
        if exp_trend == "increasing":
            insights.append("📈 Spending is trending upward. Review discretionary expenses.")
        else:
            insights.append("📉 Spending trend is declining — great budget discipline!")

        if sav_trend == "improving":
            insights.append("💰 Savings trajectory is improving. Keep it up!")
        else:
            insights.append("⚠️ Savings trend is declining. Consider cutting expenses.")

        if forecasts:
            next_savings = forecasts[0]["predicted_savings"]
            if next_savings < 0:
                insights.append(f"🚨 Projected deficit next month: ₹{abs(next_savings):,.0f}")
            else:
                insights.append(f"✅ Projected savings next month: ₹{next_savings:,.0f}")

        return insights
