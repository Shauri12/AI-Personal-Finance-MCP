"""Savings Agent — Savings optimization and emergency fund tracking."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta, timezone
from typing import Dict, List
from app.models.user import User
from app.models.financial import Transaction, Goal
from app.ai.agents.orchestrator import AgentResult


class SavingsAgent:
    def __init__(self, user: User, db: AsyncSession):
        self.user = user
        self.db = db
        self.now = datetime.now(timezone.utc)
        self.month_start = self.now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    async def analyze(self) -> AgentResult:
        income = await self._get_total("income")
        expenses = await self._get_total("expense")
        savings = income - expenses
        rate = (savings / income * 100) if income > 0 else 0
        trends = await self._get_savings_trend()
        goals = await self._get_goals()

        score = min(100, max(0, 50 + rate * 1.5)) if rate > 0 else max(0, 30 + rate)

        # Goal progress
        goal_data = []
        for g in goals:
            progress = (g.current_amount / g.target_amount * 100) if g.target_amount > 0 else 0
            remaining = g.target_amount - g.current_amount
            days_left = max((g.target_date - self.now).days, 1) if g.target_date else 365
            monthly_needed = remaining / max(days_left / 30, 1)
            goal_data.append({
                "name": g.name, "progress": round(progress, 1),
                "remaining": remaining, "monthly_needed": round(monthly_needed),
                "on_track": savings >= monthly_needed,
            })

        trend_direction = "improving" if len(trends) >= 2 and trends[-1] > trends[-2] else "declining" if len(trends) >= 2 and trends[-1] < trends[-2] else "stable"

        analysis = f"Monthly savings: ₹{savings:,.0f} ({rate:.1f}%)\nTrend: {trend_direction}\n"
        if goal_data:
            analysis += "\n".join(f"• {g['name']}: {g['progress']:.0f}% — {'✅ On track' if g['on_track'] else '⚠️ Needs ₹' + format(g['monthly_needed'], ',.0f') + '/mo'}" for g in goal_data)

        recs = []
        if rate < 20:
            recs.append(f"Increase savings to ₹{income * 0.2:,.0f}/mo (20% target).")
        emergency_target = expenses * 6
        recs.append(f"Emergency fund target: ₹{emergency_target:,.0f} (6 months expenses).")
        off_track = [g for g in goal_data if not g["on_track"]]
        if off_track:
            recs.append(f"{len(off_track)} goal(s) off-track. Increase monthly contributions.")
        if rate >= 30:
            recs.append("Excellent saver! Consider investing surplus for higher returns.")

        alerts = []
        if rate < 0:
            alerts.append({"severity": "critical", "type": "negative_savings", "message": "Spending exceeds income!", "agent": "Savings"})
        elif rate < 10:
            alerts.append({"severity": "high", "type": "low_savings", "message": f"Savings rate only {rate:.1f}%.", "agent": "Savings"})

        return AgentResult("Savings", analysis, score, recs, alerts, {
            "monthly_savings": savings, "savings_rate": round(rate, 1),
            "trend": trends, "trend_direction": trend_direction,
            "goals": goal_data, "emergency_fund_target": expenses * 6,
        })

    async def _get_total(self, txn_type: str) -> float:
        r = await self.db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            and_(Transaction.user_id == self.user.id, Transaction.transaction_type == txn_type, Transaction.timestamp >= self.month_start)))
        return float(r.scalar())

    async def _get_savings_trend(self) -> List[float]:
        trend = []
        for i in range(5, -1, -1):
            s = (self.now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            e = (self.now - timedelta(days=30 * (i - 1))).replace(day=1) if i > 0 else self.now
            ir = await self.db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                and_(Transaction.user_id == self.user.id, Transaction.transaction_type == "income", Transaction.timestamp >= s, Transaction.timestamp < e)))
            er = await self.db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                and_(Transaction.user_id == self.user.id, Transaction.transaction_type == "expense", Transaction.timestamp >= s, Transaction.timestamp < e)))
            trend.append(float(ir.scalar()) - float(er.scalar()))
        return trend

    async def _get_goals(self) -> list:
        r = await self.db.execute(select(Goal).where(and_(Goal.user_id == self.user.id, Goal.is_completed == False)))
        return r.scalars().all()
