"""Financial data API routes - Transactions, Investments, Goals."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.financial import Transaction, Investment, Goal, SIPInstallment
from app.schemas.schemas import (
    TransactionCreate, TransactionResponse, TransactionUpdate,
    InvestmentCreate, InvestmentResponse, InvestmentUpdate,
    PortfolioSummary, AssetAllocation, InvestmentPerformer, InvestmentAlert,
    SIPInstallmentCreate, SIPInstallmentResponse,
    GoalCreate, GoalResponse, GoalUpdate,
)

router = APIRouter(prefix="/api/finance", tags=["Finance"])


# ── Transactions ──────────────────────────────────────────

@router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    limit: int = Query(50, le=500),
    offset: int = 0,
    category: Optional[str] = None,
    transaction_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user transactions with optional filters."""
    query = select(Transaction).where(Transaction.user_id == current_user.id)
    
    if category:
        query = query.where(Transaction.category == category)
    if transaction_type:
        query = query.where(Transaction.transaction_type == transaction_type)
    if start_date:
        query = query.where(Transaction.timestamp >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.where(Transaction.timestamp <= datetime.fromisoformat(end_date))
    
    query = query.order_by(desc(Transaction.timestamp)).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/transactions", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new transaction."""
    txn = Transaction(
        user_id=current_user.id,
        amount=data.amount,
        transaction_type=data.transaction_type,
        category=data.category,
        merchant=data.merchant,
        description=data.description,
        payment_method=data.payment_method,
        source=data.source,
        is_recurring=data.is_recurring,
        tags=data.tags,
        timestamp=data.timestamp or datetime.now(timezone.utc),
    )
    db.add(txn)
    await db.flush()
    await db.refresh(txn)
    return txn


@router.put("/transactions/{txn_id}", response_model=TransactionResponse)
async def update_transaction(
    txn_id: int,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a transaction."""
    result = await db.execute(
        select(Transaction).where(and_(Transaction.id == txn_id, Transaction.user_id == current_user.id))
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(txn, field, value)
    
    await db.flush()
    await db.refresh(txn)
    return txn


@router.delete("/transactions/{txn_id}", status_code=204)
async def delete_transaction(
    txn_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a transaction."""
    result = await db.execute(
        select(Transaction).where(and_(Transaction.id == txn_id, Transaction.user_id == current_user.id))
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await db.delete(txn)



# ── Investments ───────────────────────────────────────────

@router.get("/investments/summary", response_model=PortfolioSummary)
async def get_portfolio_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return aggregated portfolio analytics:
    total value, P&L, CAGR estimate, asset allocation breakdown,
    risk label, and best/worst performers.
    """
    result = await db.execute(
        select(Investment).where(
            and_(Investment.user_id == current_user.id, Investment.is_active == True)
        )
    )
    investments = result.scalars().all()

    if not investments:
        return PortfolioSummary(
            total_invested=0, total_current_value=0, total_pnl=0,
            total_pnl_pct=0, cagr=None, risk_label="N/A",
            avg_risk_score=0, asset_allocation=[], best_performer=None,
            worst_performer=None, total_investments=0,
        )

    total_invested = sum(i.invested_amount for i in investments)
    total_current  = sum(i.current_value for i in investments)
    total_pnl      = total_current - total_invested
    total_pnl_pct  = (total_pnl / total_invested * 100) if total_invested > 0 else 0.0

    # CAGR estimate using oldest start_date
    oldest = min(investments, key=lambda i: i.start_date)
    years_held = (datetime.now(timezone.utc) - oldest.start_date.replace(tzinfo=timezone.utc)).days / 365.25
    cagr = None
    if years_held > 0.1 and total_invested > 0:
        cagr = round(((total_current / total_invested) ** (1 / years_held) - 1) * 100, 2)

    # Risk label
    avg_risk = sum(i.risk_score for i in investments) / len(investments)
    if avg_risk <= 3.5:
        risk_label = "Conservative"
    elif avg_risk <= 6.5:
        risk_label = "Balanced"
    else:
        risk_label = "Aggressive"

    # Asset allocation breakdown
    allocation_map: dict = {}
    for inv in investments:
        t = inv.investment_type
        if t not in allocation_map:
            allocation_map[t] = {"invested": 0.0, "current": 0.0, "count": 0}
        allocation_map[t]["invested"] += inv.invested_amount
        allocation_map[t]["current"]  += inv.current_value
        allocation_map[t]["count"]    += 1

    asset_allocation = []
    for inv_type, vals in allocation_map.items():
        pnl     = vals["current"] - vals["invested"]
        pnl_pct = (pnl / vals["invested"] * 100) if vals["invested"] > 0 else 0.0
        pct     = (vals["current"] / total_current * 100) if total_current > 0 else 0.0
        asset_allocation.append(AssetAllocation(
            investment_type=inv_type,
            total_invested=round(vals["invested"], 2),
            total_current_value=round(vals["current"], 2),
            count=vals["count"],
            percentage=round(pct, 2),
            pnl=round(pnl, 2),
            pnl_pct=round(pnl_pct, 2),
        ))
    asset_allocation.sort(key=lambda x: x.percentage, reverse=True)

    # Best & worst performers
    def _to_performer(inv: Investment) -> InvestmentPerformer:
        return InvestmentPerformer(
            id=inv.id, name=inv.name,
            investment_type=inv.investment_type,
            returns_pct=round(inv.returns_pct, 2),
            invested_amount=inv.invested_amount,
            current_value=inv.current_value,
            pnl=round(inv.current_value - inv.invested_amount, 2),
        )

    sorted_inv = sorted(investments, key=lambda i: i.returns_pct, reverse=True)
    best  = _to_performer(sorted_inv[0])  if sorted_inv else None
    worst = _to_performer(sorted_inv[-1]) if len(sorted_inv) > 1 else None

    return PortfolioSummary(
        total_invested=round(total_invested, 2),
        total_current_value=round(total_current, 2),
        total_pnl=round(total_pnl, 2),
        total_pnl_pct=round(total_pnl_pct, 2),
        cagr=cagr,
        risk_label=risk_label,
        avg_risk_score=round(avg_risk, 1),
        asset_allocation=asset_allocation,
        best_performer=best,
        worst_performer=worst,
        total_investments=len(investments),
    )


@router.get("/investments/alerts", response_model=List[InvestmentAlert])
async def get_investment_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate smart investment alerts:
    - Maturity reminders (FD/bonds within 30 / 7 days)
    - Rebalancing suggestions (single type > 40% of portfolio)
    - Negative returns warning (> -10%)
    """
    result = await db.execute(
        select(Investment).where(
            and_(Investment.user_id == current_user.id, Investment.is_active == True)
        )
    )
    investments = result.scalars().all()
    alerts: List[InvestmentAlert] = []

    now = datetime.now(timezone.utc)
    total_current = sum(i.current_value for i in investments) or 1.0

    # Maturity alerts
    for inv in investments:
        if inv.maturity_date:
            mat = inv.maturity_date.replace(tzinfo=timezone.utc) if inv.maturity_date.tzinfo is None else inv.maturity_date
            days_left = (mat - now).days
            if days_left < 0:
                alerts.append(InvestmentAlert(
                    alert_type="maturity", severity="critical",
                    investment_id=inv.id, investment_name=inv.name,
                    message=f"'{inv.name}' matured {abs(days_left)} days ago — consider renewing or reinvesting.",
                    action="Renew or withdraw funds",
                ))
            elif days_left <= 7:
                alerts.append(InvestmentAlert(
                    alert_type="maturity", severity="critical",
                    investment_id=inv.id, investment_name=inv.name,
                    message=f"'{inv.name}' matures in {days_left} day(s)! Take action immediately.",
                    action="Log in to your platform to renew or withdraw",
                ))
            elif days_left <= 30:
                alerts.append(InvestmentAlert(
                    alert_type="maturity", severity="warning",
                    investment_id=inv.id, investment_name=inv.name,
                    message=f"'{inv.name}' matures in {days_left} days. Start planning your next move.",
                    action="Review and decide: renew, reinvest, or withdraw",
                ))

    # Over-concentration rebalancing alert
    type_totals: dict = {}
    for inv in investments:
        type_totals[inv.investment_type] = type_totals.get(inv.investment_type, 0) + inv.current_value

    for inv_type, value in type_totals.items():
        pct = (value / total_current) * 100
        if pct > 50:
            alerts.append(InvestmentAlert(
                alert_type="rebalance", severity="warning",
                investment_id=None, investment_name=None,
                message=f"{inv_type.replace('_', ' ').title()} makes up {pct:.1f}% of your portfolio — above the 50% safe threshold.",
                action=f"Consider diversifying into other asset classes to reduce concentration risk",
            ))
        elif pct > 40:
            alerts.append(InvestmentAlert(
                alert_type="rebalance", severity="info",
                investment_id=None, investment_name=None,
                message=f"{inv_type.replace('_', ' ').title()} is {pct:.1f}% of your portfolio. Watch for over-concentration.",
                action="Monitor and consider gradual diversification",
            ))

    # Negative returns warning
    for inv in investments:
        if inv.returns_pct <= -10:
            alerts.append(InvestmentAlert(
                alert_type="drop", severity="critical",
                investment_id=inv.id, investment_name=inv.name,
                message=f"'{inv.name}' is down {abs(inv.returns_pct):.1f}% from your purchase price.",
                action="Review your investment thesis or consider stop-loss action",
            ))
        elif inv.returns_pct <= -5:
            alerts.append(InvestmentAlert(
                alert_type="drop", severity="warning",
                investment_id=inv.id, investment_name=inv.name,
                message=f"'{inv.name}' has declined {abs(inv.returns_pct):.1f}%.",
                action="Monitor closely",
            ))

    return alerts


@router.get("/investments", response_model=List[InvestmentResponse])
async def get_investments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all investments for the current user."""
    result = await db.execute(
        select(Investment).where(Investment.user_id == current_user.id).order_by(desc(Investment.current_value))
    )
    return result.scalars().all()


@router.get("/opportunities")
async def get_investment_opportunities(
    current_user: User = Depends(get_current_user),
):
    """Scrape and return live investment opportunities from multiple sources."""
    from app.services.scraper import get_all_opportunities
    opportunities = await get_all_opportunities()
    return {"opportunities": opportunities, "count": len(opportunities)}


@router.post("/investments", response_model=InvestmentResponse, status_code=201)
async def create_investment(
    data: InvestmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new investment."""
    inv = Investment(
        user_id=current_user.id,
        name=data.name,
        investment_type=data.investment_type,
        invested_amount=data.invested_amount,
        current_value=data.current_value,
        returns_pct=data.returns_pct,
        risk_score=data.risk_score,
        units=data.units,
        nav=data.nav,
        platform=data.platform,
        start_date=data.start_date or datetime.now(timezone.utc),
        maturity_date=data.maturity_date,
    )
    db.add(inv)
    await db.flush()
    await db.refresh(inv)
    return inv


@router.put("/investments/{inv_id}", response_model=InvestmentResponse)
async def update_investment(
    inv_id: int,
    data: InvestmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing investment (current value, NAV, units, risk, maturity date, etc.)."""
    result = await db.execute(
        select(Investment).where(and_(Investment.id == inv_id, Investment.user_id == current_user.id))
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")

    update_data = data.model_dump(exclude_unset=True)

    # Auto-recalculate returns_pct if current_value or invested_amount changed
    if "current_value" in update_data or "invested_amount" in update_data:
        new_current  = update_data.get("current_value",  inv.current_value)
        new_invested = update_data.get("invested_amount", inv.invested_amount)
        if new_invested > 0 and "returns_pct" not in update_data:
            update_data["returns_pct"] = round(((new_current - new_invested) / new_invested) * 100, 2)

    for field, value in update_data.items():
        setattr(inv, field, value)

    await db.flush()
    await db.refresh(inv)
    return inv


@router.delete("/investments/{inv_id}", status_code=204)
async def delete_investment(
    inv_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an investment."""
    result = await db.execute(
        select(Investment).where(and_(Investment.id == inv_id, Investment.user_id == current_user.id))
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    await db.delete(inv)


# ── SIP Installments ──────────────────────────────────────

@router.get("/investments/{inv_id}/sip", response_model=List[SIPInstallmentResponse])
async def get_sip_installments(
    inv_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all SIP installments for a specific investment."""
    # Verify the investment belongs to the user
    inv_result = await db.execute(
        select(Investment).where(and_(Investment.id == inv_id, Investment.user_id == current_user.id))
    )
    if not inv_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Investment not found")

    result = await db.execute(
        select(SIPInstallment)
        .where(and_(SIPInstallment.investment_id == inv_id, SIPInstallment.user_id == current_user.id))
        .order_by(desc(SIPInstallment.date))
    )
    return result.scalars().all()


@router.post("/investments/{inv_id}/sip", response_model=SIPInstallmentResponse, status_code=201)
async def add_sip_installment(
    inv_id: int,
    data: SIPInstallmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log a new SIP installment for an investment."""
    # Verify the investment belongs to the user
    inv_result = await db.execute(
        select(Investment).where(and_(Investment.id == inv_id, Investment.user_id == current_user.id))
    )
    inv = inv_result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")

    installment = SIPInstallment(
        user_id=current_user.id,
        investment_id=inv_id,
        amount=data.amount,
        date=data.date or datetime.now(timezone.utc),
        units_purchased=data.units_purchased,
        nav_at_purchase=data.nav_at_purchase,
        notes=data.notes,
    )
    db.add(installment)

    # Also update invested_amount on the parent investment
    inv.invested_amount = round(inv.invested_amount + data.amount, 2)
    if inv.invested_amount > 0:
        inv.returns_pct = round(((inv.current_value - inv.invested_amount) / inv.invested_amount) * 100, 2)

    await db.flush()
    await db.refresh(installment)
    return installment


@router.delete("/investments/{inv_id}/sip/{sip_id}", status_code=204)
async def delete_sip_installment(
    inv_id: int,
    sip_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a SIP installment entry."""
    result = await db.execute(
        select(SIPInstallment).where(
            and_(
                SIPInstallment.id == sip_id,
                SIPInstallment.investment_id == inv_id,
                SIPInstallment.user_id == current_user.id,
            )
        )
    )
    sip = result.scalar_one_or_none()
    if not sip:
        raise HTTPException(status_code=404, detail="SIP installment not found")

    # Reverse the invested_amount update
    inv_result = await db.execute(
        select(Investment).where(and_(Investment.id == inv_id, Investment.user_id == current_user.id))
    )
    inv = inv_result.scalar_one_or_none()
    if inv:
        inv.invested_amount = max(0, round(inv.invested_amount - sip.amount, 2))
        if inv.invested_amount > 0:
            inv.returns_pct = round(((inv.current_value - inv.invested_amount) / inv.invested_amount) * 100, 2)

    await db.delete(sip)


# ── Goals ─────────────────────────────────────────────────

@router.get("/goals", response_model=List[GoalResponse])
async def get_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all goals for the current user."""
    result = await db.execute(
        select(Goal).where(Goal.user_id == current_user.id).order_by(desc(Goal.created_at))
    )
    return result.scalars().all()


@router.post("/goals", response_model=GoalResponse, status_code=201)
async def create_goal(
    data: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new financial goal."""
    goal = Goal(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        target_amount=data.target_amount,
        current_amount=data.current_amount,
        target_date=data.target_date,
        category=data.category,
        priority=data.priority,
    )
    db.add(goal)
    await db.flush()
    await db.refresh(goal)
    return goal


@router.put("/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    data: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a goal."""
    result = await db.execute(
        select(Goal).where(and_(Goal.id == goal_id, Goal.user_id == current_user.id))
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    
    await db.flush()
    await db.refresh(goal)
    return goal


@router.delete("/goals/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a goal."""
    result = await db.execute(
        select(Goal).where(and_(Goal.id == goal_id, Goal.user_id == current_user.id))
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
