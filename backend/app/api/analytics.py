"""Analytics API routes - Dashboard summary, spending analysis, financial health."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.financial import Transaction, Investment, Goal
from app.schemas.schemas import (
    DashboardSummary, SpendingByCategory, MonthlyTrend,
    FinancialHealthScore, TransactionResponse,
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get complete dashboard summary."""
    now = datetime.now(timezone.utc)
    ms = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    inc_r = await db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        and_(Transaction.user_id == current_user.id, Transaction.transaction_type == "income", Transaction.timestamp >= ms)))
    total_income = float(inc_r.scalar())

    exp_r = await db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        and_(Transaction.user_id == current_user.id, Transaction.transaction_type == "expense", Transaction.timestamp >= ms)))
    total_expenses = float(exp_r.scalar())

    inv_r = await db.execute(select(func.coalesce(func.sum(Investment.current_value), 0), func.coalesce(func.sum(Investment.invested_amount), 0)).where(
        and_(Investment.user_id == current_user.id, Investment.is_active == True)))
    inv_row = inv_r.one()
    total_inv = float(inv_row[0])
    inv_returns = total_inv - float(inv_row[1])

    goals_r = await db.execute(select(func.count()).where(and_(Goal.user_id == current_user.id, Goal.is_completed == False)))
    active_goals = goals_r.scalar()

    cat_r = await db.execute(select(Transaction.category, func.sum(Transaction.amount), func.count()).where(
        and_(Transaction.user_id == current_user.id, Transaction.transaction_type == "expense", Transaction.timestamp >= ms)
    ).group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()))
    sbc = []
    for cat, total, count in cat_r.all():
        pct = (total / total_expenses * 100) if total_expenses > 0 else 0
        sbc.append(SpendingByCategory(category=cat, total=round(total, 2), percentage=round(pct, 1), count=count))

    trends = []
    for i in range(5, -1, -1):
        s = (now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        e = (now - timedelta(days=30 * (i - 1))).replace(day=1) if i > 0 else now
        ir = await db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            and_(Transaction.user_id == current_user.id, Transaction.transaction_type == "income", Transaction.timestamp >= s, Transaction.timestamp < e)))
        er = await db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            and_(Transaction.user_id == current_user.id, Transaction.transaction_type == "expense", Transaction.timestamp >= s, Transaction.timestamp < e)))
        mi, me = float(ir.scalar()), float(er.scalar())
        trends.append(MonthlyTrend(month=s.strftime("%b %Y"), income=round(mi, 2), expenses=round(me, 2), savings=round(mi - me, 2)))

    rec_r = await db.execute(select(Transaction).where(Transaction.user_id == current_user.id).order_by(Transaction.timestamp.desc()).limit(10))
    recent = [TransactionResponse.model_validate(t) for t in rec_r.scalars().all()]

    ns = total_income - total_expenses
    sr = (ns / total_income * 100) if total_income > 0 else 0
    hs = min(100, max(0, int(sr * 0.3 + min(total_inv / max(current_user.monthly_income * 6, 1), 1) * 30 + 20 + min(active_goals, 3) / 3 * 20)))

    insights = _gen_insights(total_income, total_expenses, sbc, sr, trends)

    return DashboardSummary(total_income=round(total_income, 2), total_expenses=round(total_expenses, 2),
        net_savings=round(ns, 2), total_investments=round(total_inv, 2), investment_returns=round(inv_returns, 2),
        net_worth=round(total_inv + ns, 2), active_goals=active_goals, financial_health_score=hs,
        spending_by_category=sbc, monthly_trends=trends, recent_transactions=recent, ai_insights=insights)


@router.get("/health-score", response_model=FinancialHealthScore)
async def get_health_score(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Calculate detailed financial health score."""
    now = datetime.now(timezone.utc)
    ms = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ir = await db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        and_(Transaction.user_id == current_user.id, Transaction.transaction_type == "income", Transaction.timestamp >= ms)))
    income = float(ir.scalar())
    er = await db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        and_(Transaction.user_id == current_user.id, Transaction.transaction_type == "expense", Transaction.timestamp >= ms)))
    expenses = float(er.scalar())
    inv_r = await db.execute(select(func.coalesce(func.sum(Investment.current_value), 0)).where(
        and_(Investment.user_id == current_user.id, Investment.is_active == True)))
    investments = float(inv_r.scalar())

    sr = round((income - expenses) / income * 100, 1) if income > 0 else 0
    emr = round(investments / max(expenses, 1), 1)
    it_r = await db.execute(select(func.count(func.distinct(Investment.investment_type))).where(
        and_(Investment.user_id == current_user.id, Investment.is_active == True)))
    dc = it_r.scalar() or 0
    idiv = min(round(dc / 5 * 100, 1), 100)
    ss = min(round(70 + sr * 0.3, 1), 100)
    dr_r = await db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        and_(Transaction.user_id == current_user.id, Transaction.transaction_type == "expense", Transaction.category == "emi", Transaction.timestamp >= ms)))
    dr = round(float(dr_r.scalar()) / income * 100, 1) if income > 0 else 0

    overall = min(100, max(0, int(max(0, sr) * 0.25 + min(emr, 6) / 6 * 25 + ss * 0.2 + idiv * 0.15 + max(0, (100 - dr)) * 0.15)))
    recs = []
    if sr < 20: recs.append("Aim to save at least 20% of your income each month.")
    if emr < 3: recs.append("Build an emergency fund covering 3-6 months of expenses.")
    if idiv < 60: recs.append("Diversify investments across more asset classes.")
    if dr > 40: recs.append("High debt-to-income ratio. Focus on debt reduction.")
    if not recs: recs.append("Great job! Consider increasing SIP contributions.")

    return FinancialHealthScore(overall_score=overall, savings_ratio=sr, debt_ratio=dr,
        spending_stability=ss, emergency_reserve=emr, investment_diversity=idiv,
        explanation=f"Score {overall}/100. Saving {sr:.0f}% of income, {emr:.1f} months emergency reserves, {dc} investment types.",
        recommendations=recs)


def _gen_insights(income, expenses, cats, sr, trends) -> List[str]:
    ins = []
    if sr > 30: ins.append(f"💰 Great saving habit! You're saving {sr:.0f}% of income.")
    elif sr > 10: ins.append(f"📊 Saving {sr:.0f}% of income. Push above 20%.")
    elif sr > 0: ins.append(f"⚠️ Low savings ({sr:.0f}%). Review non-essential spending.")
    else: ins.append("🚨 Spending exceeds income. Immediate review needed.")
    if cats: ins.append(f"🏷️ Top category: {cats[0].category.title()} (₹{cats[0].total:,.0f})")
    if len(trends) >= 2 and trends[-2].expenses > 0:
        chg = ((trends[-1].expenses - trends[-2].expenses) / trends[-2].expenses) * 100
        if chg > 20: ins.append(f"📈 Spending up {chg:.0f}% vs last month.")
        elif chg < -20: ins.append("📉 Spending decreased vs last month!")
    ins.append("💡 Set financial goals to track your milestones.")
    return ins[:5]
