"""Financial data API routes - Transactions, Investments, Goals."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.financial import Transaction, Investment, Goal
from app.schemas.schemas import (
    TransactionCreate, TransactionResponse, TransactionUpdate,
    InvestmentCreate, InvestmentResponse,
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
