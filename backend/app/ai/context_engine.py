"""MCP Context Engine - Builds rich financial context for AI reasoning.

This is the heart of the MCP (Model Context Protocol) architecture.
It gathers, structures, and summarizes user financial data into a coherent
context window that the LLM can reason over.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from app.models.user import User
from app.models.financial import Transaction, Investment, Goal


class MCPContextEngine:
    """Builds structured financial context for LLM consumption."""

    def __init__(self, user: User, db: AsyncSession):
        self.user = user
        self.db = db
        self.now = datetime.now(timezone.utc)
        self.month_start = self.now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    async def build_full_context(self) -> str:
        """Build comprehensive financial context."""
        sections = await self._gather_all_sections()
        return "\n".join(sections)

    async def build_targeted_context(self, intent: str) -> str:
        """Build context targeted to a specific intent."""
        base = await self._build_header()
        sections = [base]

        if intent in ("spending", "budget", "expense"):
            sections.append(await self._build_spending_context())
            sections.append(await self._build_subscription_context())
        elif intent in ("saving", "savings"):
            sections.append(await self._build_savings_context())
            sections.append(await self._build_goals_context())
        elif intent in ("investment", "portfolio"):
            sections.append(await self._build_investment_context())
        elif intent in ("goal", "planning"):
            sections.append(await self._build_goals_context())
            sections.append(await self._build_savings_context())
        elif intent in ("subscription", "recurring"):
            sections.append(await self._build_subscription_context())
        elif intent in ("health", "score", "overview"):
            sections.extend(await self._gather_all_sections())
        else:
            sections.extend(await self._gather_all_sections())

        return "\n".join(sections)

    async def _gather_all_sections(self) -> List[str]:
        """Gather all context sections."""
        return [
            await self._build_header(),
            await self._build_spending_context(),
            await self._build_recent_transactions(),
            await self._build_investment_context(),
            await self._build_goals_context(),
            await self._build_subscription_context(),
            await self._build_trends_context(),
        ]

    async def _build_header(self) -> str:
        """Build the context header with monthly summary."""
        income = await self._get_monthly_total("income")
        expenses = await self._get_monthly_total("expense")
        savings = income - expenses
        savings_rate = (savings / income * 100) if income > 0 else 0

        return f"""═══ FINANCIAL CONTEXT: {self.user.full_name} ═══
Date: {self.now.strftime('%d %B %Y')} | Currency: {self.user.currency}
Monthly Income: ₹{income:,.0f} | Expenses: ₹{expenses:,.0f}
Net Savings: ₹{savings:,.0f} ({savings_rate:.1f}% savings rate)
Declared Monthly Income: ₹{self.user.monthly_income:,.0f}"""

    async def _build_spending_context(self) -> str:
        """Build spending breakdown context."""
        result = await self.db.execute(
            select(
                Transaction.category,
                func.sum(Transaction.amount).label("total"),
                func.count().label("count")
            ).where(
                and_(
                    Transaction.user_id == self.user.id,
                    Transaction.transaction_type == "expense",
                    Transaction.timestamp >= self.month_start
                )
            ).group_by(Transaction.category)
            .order_by(func.sum(Transaction.amount).desc())
            .limit(10)
        )
        categories = result.all()

        if not categories:
            return "\n📊 SPENDING BREAKDOWN: No spending data this month."

        total_expenses = sum(c.total for c in categories)
        lines = ["\n📊 SPENDING BREAKDOWN (This Month):"]
        for cat in categories:
            pct = (cat.total / total_expenses * 100) if total_expenses > 0 else 0
            bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
            lines.append(f"  {cat.category.title():15s} ₹{cat.total:>10,.0f} ({pct:5.1f}%) {bar} [{cat.count} txns]")

        return "\n".join(lines)

    async def _build_recent_transactions(self) -> str:
        """Build recent transactions context."""
        result = await self.db.execute(
            select(Transaction).where(
                Transaction.user_id == self.user.id
            ).order_by(desc(Transaction.timestamp)).limit(10)
        )
        transactions = result.scalars().all()

        if not transactions:
            return "\n📋 RECENT TRANSACTIONS: None."

        lines = ["\n📋 RECENT TRANSACTIONS:"]
        for t in transactions:
            arrow = "⬆" if t.transaction_type == "income" else "⬇"
            lines.append(
                f"  {arrow} {t.timestamp.strftime('%d %b')} | ₹{t.amount:>8,.0f} | "
                f"{t.category:12s} | {t.merchant or 'N/A':15s} | {t.payment_method}"
            )

        return "\n".join(lines)

    async def _build_investment_context(self) -> str:
        """Build investment portfolio context."""
        result = await self.db.execute(
            select(Investment).where(
                and_(Investment.user_id == self.user.id, Investment.is_active == True)
            ).order_by(desc(Investment.current_value))
        )
        investments = result.scalars().all()

        if not investments:
            return "\n💼 INVESTMENTS: No active investments."

        total_invested = sum(i.invested_amount for i in investments)
        total_current = sum(i.current_value for i in investments)
        total_returns = total_current - total_invested
        returns_pct = (total_returns / total_invested * 100) if total_invested > 0 else 0

        lines = [
            f"\n💼 INVESTMENT PORTFOLIO:",
            f"  Total Invested: ₹{total_invested:,.0f} | Current Value: ₹{total_current:,.0f}",
            f"  Overall Returns: ₹{total_returns:,.0f} ({returns_pct:+.1f}%)",
            f"  ─────────────────────────────────────────────"
        ]

        # Group by type
        by_type: Dict[str, List] = {}
        for inv in investments:
            by_type.setdefault(inv.investment_type, []).append(inv)

        for itype, items in by_type.items():
            type_total = sum(i.current_value for i in items)
            allocation = (type_total / total_current * 100) if total_current > 0 else 0
            lines.append(f"  {itype.replace('_', ' ').title()} ({allocation:.1f}% allocation):")
            for i in items:
                ret = i.current_value - i.invested_amount
                lines.append(
                    f"    • {i.name}: ₹{i.current_value:,.0f} (invested ₹{i.invested_amount:,.0f}, "
                    f"{i.returns_pct:+.1f}%) via {i.platform or 'N/A'}"
                )

        # Risk assessment
        avg_risk = sum(i.risk_score for i in investments) / len(investments)
        risk_label = "Conservative" if avg_risk < 4 else "Moderate" if avg_risk < 7 else "Aggressive"
        lines.append(f"  Portfolio Risk: {risk_label} (avg score: {avg_risk:.1f}/10)")

        return "\n".join(lines)

    async def _build_goals_context(self) -> str:
        """Build financial goals context."""
        result = await self.db.execute(
            select(Goal).where(Goal.user_id == self.user.id)
            .order_by(desc(Goal.priority == "high"), Goal.target_date)
        )
        goals = result.scalars().all()

        if not goals:
            return "\n🎯 FINANCIAL GOALS: No goals set."

        lines = ["\n🎯 FINANCIAL GOALS:"]
        for g in goals:
            progress = (g.current_amount / g.target_amount * 100) if g.target_amount > 0 else 0
            remaining = g.target_amount - g.current_amount
            days_left = (g.target_date - self.now).days if g.target_date else 0
            status = "✅ COMPLETED" if g.is_completed else f"{'🔴' if progress < 30 else '🟡' if progress < 70 else '🟢'} {progress:.0f}%"

            bar = "█" * int(progress / 5) + "░" * (20 - int(progress / 5))
            lines.append(
                f"  {status} {g.name} [{g.priority.upper()}]\n"
                f"       ₹{g.current_amount:,.0f} / ₹{g.target_amount:,.0f} {bar}\n"
                f"       Remaining: ₹{remaining:,.0f} | Deadline: {g.target_date.strftime('%b %Y') if g.target_date else 'None'} ({max(0, days_left)} days)"
            )
            if days_left > 0 and remaining > 0:
                monthly_needed = remaining / max(days_left / 30, 1)
                lines.append(f"       Monthly savings needed: ₹{monthly_needed:,.0f}")

        return "\n".join(lines)

    async def _build_subscription_context(self) -> str:
        """Build recurring subscription context."""
        result = await self.db.execute(
            select(
                Transaction.merchant,
                Transaction.category,
                func.sum(Transaction.amount).label("total"),
                func.count().label("count")
            ).where(
                and_(
                    Transaction.user_id == self.user.id,
                    Transaction.is_recurring == True
                )
            ).group_by(Transaction.merchant, Transaction.category)
            .order_by(func.sum(Transaction.amount).desc())
        )
        subs = result.all()

        if not subs:
            return "\n🔄 RECURRING SUBSCRIPTIONS: None detected."

        total = sum(s.total for s in subs)
        lines = [f"\n🔄 RECURRING SUBSCRIPTIONS (Total: ₹{total:,.0f}/month):"]
        for s in subs:
            lines.append(f"  • {s.merchant or 'Unknown'} ({s.category}): ₹{s.total:,.0f}")

        return "\n".join(lines)

    async def _build_trends_context(self) -> str:
        """Build monthly spending trends context."""
        lines = ["\n📈 MONTHLY TRENDS (Last 4 months):"]

        for i in range(3, -1, -1):
            start = (self.now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end = (self.now - timedelta(days=30 * (i - 1))).replace(day=1) if i > 0 else self.now

            income = await self._get_total_in_range("income", start, end)
            expenses = await self._get_total_in_range("expense", start, end)
            savings = income - expenses

            lines.append(
                f"  {start.strftime('%b %Y'):8s} | Income: ₹{income:>10,.0f} | "
                f"Expenses: ₹{expenses:>10,.0f} | Savings: ₹{savings:>10,.0f}"
            )

        return "\n".join(lines)

    async def _get_monthly_total(self, txn_type: str) -> float:
        """Get total amount for a transaction type this month."""
        result = await self.db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                and_(
                    Transaction.user_id == self.user.id,
                    Transaction.transaction_type == txn_type,
                    Transaction.timestamp >= self.month_start
                )
            )
        )
        return float(result.scalar())

    async def _get_total_in_range(self, txn_type: str, start: datetime, end: datetime) -> float:
        """Get total amount for a transaction type in a date range."""
        result = await self.db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                and_(
                    Transaction.user_id == self.user.id,
                    Transaction.transaction_type == txn_type,
                    Transaction.timestamp >= start,
                    Transaction.timestamp < end
                )
            )
        )
        return float(result.scalar())
