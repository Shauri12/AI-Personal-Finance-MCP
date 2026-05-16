"""Smart Budget Engine — AI-driven budget allocation and optimization.

Learns from spending patterns to suggest optimal budget allocations
per category, detect budget overruns, and provide real-time guidance.
"""

import numpy as np
from datetime import datetime, timedelta, timezone
from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.user import User
from app.models.financial import Transaction


class SmartBudgetEngine:
    """AI-powered budget optimization engine."""

    # Category importance weights for essential vs discretionary
    CATEGORY_WEIGHTS = {
        "rent": {"type": "essential", "priority": 1, "flexible": False},
        "utilities": {"type": "essential", "priority": 2, "flexible": False},
        "groceries": {"type": "essential", "priority": 3, "flexible": True},
        "healthcare": {"type": "essential", "priority": 4, "flexible": False},
        "insurance": {"type": "essential", "priority": 5, "flexible": False},
        "education": {"type": "essential", "priority": 6, "flexible": False},
        "emi": {"type": "debt", "priority": 7, "flexible": False},
        "transport": {"type": "semi-essential", "priority": 8, "flexible": True},
        "food": {"type": "discretionary", "priority": 9, "flexible": True},
        "shopping": {"type": "discretionary", "priority": 10, "flexible": True},
        "entertainment": {"type": "discretionary", "priority": 11, "flexible": True},
        "subscriptions": {"type": "discretionary", "priority": 12, "flexible": True},
        "travel": {"type": "discretionary", "priority": 13, "flexible": True},
    }

    def __init__(self, user: User, db: AsyncSession):
        self.user = user
        self.db = db
        self.now = datetime.now(timezone.utc)

    async def generate_smart_budget(self) -> Dict:
        """Generate AI-optimized budget allocation."""
        income = self.user.monthly_income or await self._get_avg_income()
        history = await self._get_spending_history(6)  # 6-month history

        if not history:
            return self._default_budget(income)

        # Calculate average spending per category
        avg_spending = {}
        for month_data in history:
            for cat, amount in month_data.items():
                avg_spending.setdefault(cat, []).append(amount)

        category_avgs = {cat: np.mean(vals) for cat, vals in avg_spending.items()}
        total_avg = sum(category_avgs.values())

        # Generate optimized budget
        target_savings = income * 0.20  # 20% savings target
        budget_pool = income - target_savings

        allocations = {}
        for cat, avg in sorted(category_avgs.items(), key=lambda x: x[1], reverse=True):
            meta = self.CATEGORY_WEIGHTS.get(cat, {"type": "other", "priority": 15, "flexible": True})

            if meta["flexible"]:
                # Flexible categories: suggest 90% of average (savings nudge)
                suggested = min(avg * 0.9, budget_pool * 0.3)
            else:
                # Fixed categories: keep at average
                suggested = avg

            allocations[cat] = {
                "suggested": round(suggested, 2),
                "average": round(avg, 2),
                "type": meta["type"],
                "flexible": meta["flexible"],
                "change_pct": round((suggested / max(avg, 1) - 1) * 100, 1),
            }

        # Budget utilization tracking
        current_spending = await self._get_current_month_spending()
        for cat in allocations:
            spent = current_spending.get(cat, 0)
            budget = allocations[cat]["suggested"]
            allocations[cat]["spent"] = round(spent, 2)
            allocations[cat]["remaining"] = round(max(0, budget - spent), 2)
            allocations[cat]["utilization"] = round((spent / max(budget, 1)) * 100, 1)

        # Identify savings opportunities
        savings_opps = []
        for cat, data in allocations.items():
            if data["flexible"] and data["average"] > income * 0.05:
                potential = data["average"] * 0.15  # 15% reduction potential
                savings_opps.append({
                    "category": cat,
                    "potential_savings": round(potential),
                    "suggestion": f"Reduce {cat} by 15% to save ₹{potential:,.0f}/month",
                })

        savings_opps.sort(key=lambda x: x["potential_savings"], reverse=True)

        return {
            "monthly_income": income,
            "target_savings": target_savings,
            "budget_pool": budget_pool,
            "allocations": allocations,
            "savings_opportunities": savings_opps[:5],
            "total_budgeted": round(sum(a["suggested"] for a in allocations.values()), 2),
            "insights": self._budget_insights(allocations, income, target_savings),
        }

    async def get_budget_status(self) -> Dict:
        """Get real-time budget status for current month."""
        budget = await self.generate_smart_budget()
        allocations = budget["allocations"]

        over_budget = [cat for cat, d in allocations.items() if d["utilization"] > 100]
        near_limit = [cat for cat, d in allocations.items() if 80 <= d["utilization"] <= 100]
        on_track = [cat for cat, d in allocations.items() if d["utilization"] < 80]

        days_in_month = 30
        day_of_month = self.now.day
        expected_utilization = (day_of_month / days_in_month) * 100

        alerts = []
        for cat in over_budget:
            alerts.append({
                "category": cat,
                "severity": "high",
                "message": f"{cat.title()} is {allocations[cat]['utilization']:.0f}% utilized (over budget!)",
            })
        for cat in near_limit:
            alerts.append({
                "category": cat,
                "severity": "medium",
                "message": f"{cat.title()} at {allocations[cat]['utilization']:.0f}% — approaching limit",
            })

        return {
            "status": "over_budget" if over_budget else "on_track",
            "day_of_month": day_of_month,
            "expected_utilization": round(expected_utilization, 1),
            "over_budget": over_budget,
            "near_limit": near_limit,
            "on_track": on_track,
            "alerts": alerts,
            "allocations": allocations,
        }

    def _default_budget(self, income: float) -> Dict:
        """Generate default 50/30/20 budget for new users."""
        return {
            "monthly_income": income,
            "target_savings": income * 0.20,
            "budget_pool": income * 0.80,
            "allocations": {
                "rent": {"suggested": income * 0.25, "type": "essential"},
                "groceries": {"suggested": income * 0.10, "type": "essential"},
                "utilities": {"suggested": income * 0.05, "type": "essential"},
                "transport": {"suggested": income * 0.05, "type": "semi-essential"},
                "food": {"suggested": income * 0.08, "type": "discretionary"},
                "shopping": {"suggested": income * 0.07, "type": "discretionary"},
                "entertainment": {"suggested": income * 0.05, "type": "discretionary"},
                "subscriptions": {"suggested": income * 0.03, "type": "discretionary"},
            },
            "savings_opportunities": [],
            "insights": ["Default 50/30/20 budget applied. Will personalize with spending data."],
        }

    def _budget_insights(self, allocations, income, target_savings) -> List[str]:
        insights = []
        total_flex = sum(d["suggested"] for d in allocations.values() if d.get("flexible"))
        flex_pct = (total_flex / income) * 100

        if flex_pct > 35:
            insights.append(f"💡 Flexible spending at {flex_pct:.0f}% — room for optimization.")
        else:
            insights.append(f"✅ Flexible spending well-controlled at {flex_pct:.0f}%.")

        over_budget_count = sum(1 for d in allocations.values() if d.get("utilization", 0) > 100)
        if over_budget_count:
            insights.append(f"⚠️ {over_budget_count} categories over budget this month.")

        insights.append(f"🎯 Target savings: ₹{target_savings:,.0f}/month (20% of income).")
        return insights

    async def _get_avg_income(self) -> float:
        r = await self.db.execute(select(func.avg(Transaction.amount)).where(
            and_(Transaction.user_id == self.user.id, Transaction.transaction_type == "income")))
        return float(r.scalar() or 50000)

    async def _get_spending_history(self, months: int) -> List[Dict]:
        history = []
        for i in range(months - 1, -1, -1):
            s = (self.now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            e = (self.now - timedelta(days=30 * (i - 1))).replace(day=1) if i > 0 else self.now
            r = await self.db.execute(select(Transaction.category, func.sum(Transaction.amount)).where(
                and_(Transaction.user_id == self.user.id, Transaction.transaction_type == "expense",
                     Transaction.timestamp >= s, Transaction.timestamp < e)
            ).group_by(Transaction.category))
            history.append({row[0]: float(row[1]) for row in r.all()})
        return history

    async def _get_current_month_spending(self) -> Dict[str, float]:
        ms = self.now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        r = await self.db.execute(select(Transaction.category, func.sum(Transaction.amount)).where(
            and_(Transaction.user_id == self.user.id, Transaction.transaction_type == "expense", Transaction.timestamp >= ms)
        ).group_by(Transaction.category))
        return {row[0]: float(row[1]) for row in r.all()}
