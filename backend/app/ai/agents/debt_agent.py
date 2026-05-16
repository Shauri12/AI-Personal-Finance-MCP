"""Debt Agent — Debt management analysis and payoff strategies."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timezone
from typing import Dict, List
from app.models.user import User
from app.models.financial import Transaction
from app.ai.agents.orchestrator import AgentResult


class DebtAgent:
    DEBT_CATEGORIES = {"emi", "insurance"}

    def __init__(self, user: User, db: AsyncSession):
        self.user = user
        self.db = db
        self.now = datetime.now(timezone.utc)
        self.month_start = self.now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    async def analyze(self) -> AgentResult:
        income = await self._get_monthly_income()
        debt_payments = await self._get_debt_payments()
        total_debt = sum(debt_payments.values())
        dti_ratio = (total_debt / max(income, 1)) * 100

        score = 95 if dti_ratio == 0 else 85 if dti_ratio < 15 else 70 if dti_ratio < 30 else 50 if dti_ratio < 40 else 15
        status = "🟢 Healthy" if dti_ratio < 20 else "🟡 Moderate" if dti_ratio < 40 else "🔴 High"

        analysis = f"**Debt-to-Income: {dti_ratio:.1f}%** {status}\nMonthly debt: ₹{total_debt:,.0f} / ₹{income:,.0f}"
        if debt_payments:
            analysis += "\n" + "\n".join(f"• {c.upper()}: ₹{a:,.0f}/mo" for c, a in debt_payments.items())
        else:
            analysis += "\n✅ No active debt obligations."

        recs = []
        if dti_ratio > 40:
            recs.extend(["Consider debt consolidation.", "Freeze non-essential credit spending."])
        elif dti_ratio > 20:
            recs.append("Pay off highest-interest debt first (avalanche method).")
        elif dti_ratio > 0:
            recs.append("Debt is manageable. Make extra payments to close loans faster.")
        else:
            recs.append("Debt-free! Direct surplus to investments.")

        alerts = []
        if dti_ratio > 50:
            alerts.append({"severity": "critical", "type": "extreme_debt", "message": f"Debt at {dti_ratio:.0f}% of income!", "agent": "Debt"})
        elif dti_ratio > 35:
            alerts.append({"severity": "high", "type": "high_debt", "message": f"DTI ratio at {dti_ratio:.0f}%.", "agent": "Debt"})

        return AgentResult("Debt", analysis, score, recs, alerts, {
            "total_debt_payments": total_debt, "debt_to_income": round(dti_ratio, 1),
            "monthly_income": income, "debt_breakdown": {k: round(v, 2) for k, v in debt_payments.items()},
        })

    async def _get_monthly_income(self) -> float:
        r = await self.db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            and_(Transaction.user_id == self.user.id, Transaction.transaction_type == "income", Transaction.timestamp >= self.month_start)))
        return float(r.scalar())

    async def _get_debt_payments(self) -> Dict[str, float]:
        r = await self.db.execute(select(Transaction.category, func.sum(Transaction.amount)).where(
            and_(Transaction.user_id == self.user.id, Transaction.transaction_type == "expense",
                 Transaction.category.in_(list(self.DEBT_CATEGORIES)), Transaction.timestamp >= self.month_start)
        ).group_by(Transaction.category))
        return {row[0]: float(row[1]) for row in r.all()}
