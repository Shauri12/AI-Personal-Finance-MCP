"""Investment Agent — Portfolio analysis and AI-powered investment recommendations.

Evaluates portfolio diversification, risk profile, and returns. Generates
actionable investment recommendations based on user risk tolerance and goals.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timezone
from typing import Dict, List
from app.models.user import User
from app.models.financial import Investment, Transaction
from app.ai.agents.orchestrator import AgentResult


class InvestmentAgent:
    """Specialist agent for investment analysis and recommendations."""

    # Asset class risk/return profiles
    ASSET_PROFILES = {
        "mutual_fund": {"risk": 6, "expected_return": 12, "category": "equity"},
        "stocks": {"risk": 8, "expected_return": 15, "category": "equity"},
        "sip": {"risk": 5, "expected_return": 12, "category": "equity"},
        "fixed_deposit": {"risk": 1, "expected_return": 6, "category": "debt"},
        "ppf": {"risk": 1, "expected_return": 7, "category": "debt"},
        "nps": {"risk": 4, "expected_return": 10, "category": "hybrid"},
        "gold": {"risk": 3, "expected_return": 8, "category": "commodity"},
        "crypto": {"risk": 10, "expected_return": 20, "category": "alternative"},
        "bonds": {"risk": 2, "expected_return": 7, "category": "debt"},
        "real_estate": {"risk": 5, "expected_return": 10, "category": "real_asset"},
    }

    def __init__(self, user: User, db: AsyncSession):
        self.user = user
        self.db = db

    async def analyze(self) -> AgentResult:
        """Run full investment analysis."""
        investments = await self._get_investments()
        monthly_income = self.user.monthly_income or 50000

        if not investments:
            return AgentResult(
                agent_name="Investment",
                analysis="No active investments detected. Starting an investment journey is crucial for long-term wealth building.",
                score=15.0,
                recommendations=[
                    f"Start a SIP of ₹{monthly_income * 0.1:,.0f}/month in a diversified equity fund.",
                    "Open a PPF account for tax-saving + guaranteed returns.",
                    "Build an emergency fund of 6 months' expenses before investing aggressively.",
                ],
                alerts=[{
                    "severity": "high",
                    "type": "no_investments",
                    "message": "No active investments found. Wealth isn't growing.",
                    "agent": "Investment",
                }],
                data={"total_invested": 0, "current_value": 0, "diversification_score": 0},
            )

        total_invested = sum(i.invested_amount for i in investments)
        total_current = sum(i.current_value for i in investments)
        total_returns = total_current - total_invested
        returns_pct = (total_returns / total_invested * 100) if total_invested > 0 else 0

        # Diversification analysis
        by_type = {}
        for inv in investments:
            by_type.setdefault(inv.investment_type, []).append(inv)

        allocation = {}
        for itype, items in by_type.items():
            type_value = sum(i.current_value for i in items)
            allocation[itype] = {
                "value": type_value,
                "percentage": (type_value / total_current * 100) if total_current > 0 else 0,
                "count": len(items),
            }

        # Category-level diversification
        category_allocation = {}
        for itype, data in allocation.items():
            profile = self.ASSET_PROFILES.get(itype, {"category": "other"})
            cat = profile["category"]
            category_allocation[cat] = category_allocation.get(cat, 0) + data["percentage"]

        diversification_score = self._calc_diversification(category_allocation)
        risk_score = self._calc_portfolio_risk(investments, total_current)
        performance_score = self._calc_performance_score(returns_pct)

        overall_score = (diversification_score * 0.3 + risk_score * 0.3 + performance_score * 0.4)

        analysis = self._build_analysis(total_invested, total_current, returns_pct,
                                         allocation, category_allocation, risk_score)
        recommendations = self._build_recommendations(allocation, category_allocation,
                                                       risk_score, monthly_income, total_invested)
        alerts = self._build_alerts(category_allocation, returns_pct, investments)

        return AgentResult(
            agent_name="Investment",
            analysis=analysis,
            score=overall_score,
            recommendations=recommendations,
            alerts=alerts,
            data={
                "total_invested": total_invested,
                "current_value": total_current,
                "total_returns": total_returns,
                "returns_pct": round(returns_pct, 2),
                "allocation": {k: {"value": v["value"], "pct": round(v["percentage"], 1)} for k, v in allocation.items()},
                "category_allocation": {k: round(v, 1) for k, v in category_allocation.items()},
                "diversification_score": round(diversification_score, 1),
                "risk_score": round(risk_score, 1),
            },
        )

    async def _get_investments(self) -> List[Investment]:
        result = await self.db.execute(
            select(Investment).where(
                and_(Investment.user_id == self.user.id, Investment.is_active == True)
            )
        )
        return result.scalars().all()

    def _calc_diversification(self, category_allocation: Dict) -> float:
        """Higher score for more diversified portfolios."""
        num_categories = len(category_allocation)
        if num_categories == 0:
            return 0

        # Ideal: 4+ categories with no single category > 50%
        score = min(num_categories / 4, 1.0) * 60

        # Penalize concentration
        max_alloc = max(category_allocation.values()) if category_allocation else 0
        if max_alloc > 70:
            score -= 20
        elif max_alloc > 50:
            score -= 10

        # Bonus for having debt + equity balance
        has_equity = category_allocation.get("equity", 0) > 10
        has_debt = category_allocation.get("debt", 0) > 10
        if has_equity and has_debt:
            score += 20

        return min(100, max(0, score))

    def _calc_portfolio_risk(self, investments: List, total_value: float) -> float:
        """Calculate weighted portfolio risk (lower risk = higher score for conservative)."""
        if not investments or total_value == 0:
            return 50

        weighted_risk = sum(
            (i.current_value / total_value) * i.risk_score for i in investments
        )
        # Score: moderate risk (4-6) is ideal
        if 4 <= weighted_risk <= 6:
            return 80
        elif 3 <= weighted_risk <= 7:
            return 65
        else:
            return 45

    def _calc_performance_score(self, returns_pct: float) -> float:
        if returns_pct >= 15:
            return 95
        elif returns_pct >= 10:
            return 80
        elif returns_pct >= 5:
            return 65
        elif returns_pct >= 0:
            return 50
        else:
            return 30

    def _build_analysis(self, invested, current, returns_pct, allocation, cat_alloc, risk) -> str:
        lines = [
            f"Portfolio: ₹{current:,.0f} (invested ₹{invested:,.0f}, returns {returns_pct:+.1f}%)",
            f"\n**Asset Allocation:**",
        ]
        for itype, data in sorted(allocation.items(), key=lambda x: x[1]["percentage"], reverse=True):
            lines.append(f"• {itype.replace('_', ' ').title()}: {data['percentage']:.1f}% (₹{data['value']:,.0f})")

        lines.append(f"\n**Category Mix:** " + ", ".join(
            f"{cat.title()} {pct:.0f}%" for cat, pct in cat_alloc.items()
        ))

        return "\n".join(lines)

    def _build_recommendations(self, allocation, cat_alloc, risk, income, invested) -> List[str]:
        recs = []
        equity_pct = cat_alloc.get("equity", 0)
        debt_pct = cat_alloc.get("debt", 0)

        if equity_pct > 80:
            recs.append("Portfolio is equity-heavy. Add debt instruments (PPF/FD) for stability.")
        elif debt_pct > 70:
            recs.append("Portfolio is too conservative. Add equity exposure via SIP for growth.")

        if "gold" not in [a for a in allocation] and "commodity" not in cat_alloc:
            recs.append("Consider 5-10% allocation to gold as an inflation hedge.")

        monthly_investment = income * 0.20
        if invested < income * 12:
            recs.append(f"Target monthly investment: ₹{monthly_investment:,.0f} (20% of income).")

        if not recs:
            recs.append("Portfolio is well-diversified. Continue current SIP strategy.")

        return recs

    def _build_alerts(self, cat_alloc, returns_pct, investments) -> List[Dict]:
        alerts = []

        if returns_pct < -5:
            alerts.append({
                "severity": "high",
                "type": "negative_returns",
                "message": f"Portfolio returns are negative ({returns_pct:.1f}%). Review holdings.",
                "agent": "Investment",
            })

        equity_pct = cat_alloc.get("equity", 0)
        if equity_pct > 85:
            alerts.append({
                "severity": "medium",
                "type": "concentration_risk",
                "message": f"Equity concentration at {equity_pct:.0f}%. Diversify.",
                "agent": "Investment",
            })

        return alerts
