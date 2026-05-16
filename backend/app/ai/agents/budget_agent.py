"""Budget Agent — Smart budget analysis and optimization.

Analyzes spending patterns, detects budget overruns, and provides
actionable recommendations using the 50/30/20 rule and category-level insights.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta, timezone
from typing import Dict, List
from app.models.user import User
from app.models.financial import Transaction
from app.ai.agents.orchestrator import AgentResult


class BudgetAgent:
    """Specialist agent for budget optimization."""

    IDEAL_RATIOS = {
        "needs": 0.50,      # Rent, utilities, groceries, healthcare, insurance, emi
        "wants": 0.30,      # Shopping, entertainment, subscriptions, travel, food (dining)
        "savings": 0.20,    # Savings + investments
    }

    NEEDS_CATEGORIES = {"rent", "utilities", "groceries", "healthcare", "insurance", "emi", "education"}
    WANTS_CATEGORIES = {"shopping", "entertainment", "subscriptions", "travel", "food", "transport"}

    def __init__(self, user: User, db: AsyncSession):
        self.user = user
        self.db = db
        self.now = datetime.now(timezone.utc)
        self.month_start = self.now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    async def analyze(self) -> AgentResult:
        """Run full budget analysis."""
        income = await self._get_monthly_income()
        spending = await self._get_spending_by_category()
        total_expenses = sum(spending.values())

        # Classify spending
        needs_total = sum(v for k, v in spending.items() if k in self.NEEDS_CATEGORIES)
        wants_total = sum(v for k, v in spending.items() if k not in self.NEEDS_CATEGORIES)
        savings = income - total_expenses

        # Calculate ratios
        needs_ratio = needs_total / max(income, 1)
        wants_ratio = wants_total / max(income, 1)
        savings_ratio = savings / max(income, 1)

        # Score budget health (0-100)
        score = self._calculate_score(needs_ratio, wants_ratio, savings_ratio)

        # Generate analysis
        analysis = self._build_analysis(income, total_expenses, savings,
                                         needs_total, wants_total,
                                         needs_ratio, wants_ratio, savings_ratio,
                                         spending)

        # Generate recommendations
        recommendations = self._build_recommendations(
            needs_ratio, wants_ratio, savings_ratio, spending, income
        )

        # Generate alerts
        alerts = self._build_alerts(spending, income, savings_ratio, needs_ratio, wants_ratio)

        return AgentResult(
            agent_name="Budget",
            analysis=analysis,
            score=score,
            recommendations=recommendations,
            alerts=alerts,
            data={
                "income": income,
                "total_expenses": total_expenses,
                "savings": savings,
                "needs_total": needs_total,
                "wants_total": wants_total,
                "needs_ratio": round(needs_ratio * 100, 1),
                "wants_ratio": round(wants_ratio * 100, 1),
                "savings_ratio": round(savings_ratio * 100, 1),
                "category_breakdown": {k: round(v, 2) for k, v in spending.items()},
                "budget_allocation": {
                    "needs": {"actual": round(needs_ratio * 100, 1), "ideal": 50},
                    "wants": {"actual": round(wants_ratio * 100, 1), "ideal": 30},
                    "savings": {"actual": round(savings_ratio * 100, 1), "ideal": 20},
                },
            },
        )

    async def _get_monthly_income(self) -> float:
        result = await self.db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                and_(
                    Transaction.user_id == self.user.id,
                    Transaction.transaction_type == "income",
                    Transaction.timestamp >= self.month_start,
                )
            )
        )
        return float(result.scalar())

    async def _get_spending_by_category(self) -> Dict[str, float]:
        result = await self.db.execute(
            select(Transaction.category, func.sum(Transaction.amount)).where(
                and_(
                    Transaction.user_id == self.user.id,
                    Transaction.transaction_type == "expense",
                    Transaction.timestamp >= self.month_start,
                )
            ).group_by(Transaction.category)
        )
        return {row[0]: float(row[1]) for row in result.all()}

    def _calculate_score(self, needs_ratio: float, wants_ratio: float, savings_ratio: float) -> float:
        score = 50.0  # Base score

        # Savings scoring (40 pts max)
        if savings_ratio >= 0.30:
            score += 40
        elif savings_ratio >= 0.20:
            score += 30
        elif savings_ratio >= 0.10:
            score += 20
        elif savings_ratio > 0:
            score += 10

        # Needs ratio scoring (5 pts max)
        if needs_ratio <= 0.50:
            score += 5
        elif needs_ratio <= 0.60:
            score += 2

        # Wants ratio scoring (5 pts max)
        if wants_ratio <= 0.30:
            score += 5
        elif wants_ratio <= 0.40:
            score += 2

        return min(100, max(0, score))

    def _build_analysis(self, income, expenses, savings, needs, wants,
                        needs_r, wants_r, savings_r, breakdown) -> str:
        lines = [
            f"Monthly income: ₹{income:,.0f} | Expenses: ₹{expenses:,.0f} | Savings: ₹{savings:,.0f}",
            f"\n**50/30/20 Budget Analysis:**",
            f"• Needs (essential): {needs_r*100:.1f}% of income (ideal: ≤50%) — ₹{needs:,.0f}",
            f"• Wants (lifestyle): {wants_r*100:.1f}% of income (ideal: ≤30%) — ₹{wants:,.0f}",
            f"• Savings/Invest: {savings_r*100:.1f}% of income (ideal: ≥20%) — ₹{savings:,.0f}",
        ]

        if breakdown:
            top3 = sorted(breakdown.items(), key=lambda x: x[1], reverse=True)[:3]
            lines.append(f"\n**Top spending categories:** " +
                         ", ".join(f"{cat.title()} (₹{val:,.0f})" for cat, val in top3))

        return "\n".join(lines)

    def _build_recommendations(self, needs_r, wants_r, savings_r, spending, income) -> List[str]:
        recs = []

        if savings_r < 0.20:
            deficit = income * 0.20 - income * savings_r
            recs.append(f"Increase savings by ₹{deficit:,.0f}/month to hit the 20% target.")

        if wants_r > 0.30:
            excess = income * wants_r - income * 0.30
            recs.append(f"Reduce discretionary spending by ₹{excess:,.0f}/month.")

        # Suggest specific category cuts
        if "subscriptions" in spending and spending["subscriptions"] > income * 0.05:
            recs.append(f"Subscriptions at ₹{spending['subscriptions']:,.0f} — audit for unused services.")

        if "food" in spending and spending["food"] > income * 0.15:
            recs.append("Food spending is high. Consider meal planning to reduce costs.")

        if not recs:
            recs.append("Great budget discipline! Consider increasing investment allocation.")

        return recs

    def _build_alerts(self, spending, income, savings_r, needs_r, wants_r) -> List[Dict]:
        alerts = []

        if savings_r < 0:
            alerts.append({
                "severity": "critical",
                "type": "budget_deficit",
                "message": "Spending exceeds income this month!",
                "agent": "Budget",
            })
        elif savings_r < 0.10:
            alerts.append({
                "severity": "high",
                "type": "low_savings",
                "message": f"Savings rate at {savings_r*100:.1f}% — well below 20% target.",
                "agent": "Budget",
            })

        if wants_r > 0.40:
            alerts.append({
                "severity": "medium",
                "type": "high_discretionary",
                "message": f"Discretionary spending at {wants_r*100:.0f}% of income.",
                "agent": "Budget",
            })

        return alerts
