"""Pydantic schemas for request/response validation."""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth Schemas ──────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    password: str
    monthly_income: Optional[float] = 0.0


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    monthly_income: float
    currency: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    monthly_income: Optional[float] = None
    currency: Optional[str] = None


# ── Transaction Schemas ───────────────────────────────────

class TransactionCreate(BaseModel):
    amount: float
    transaction_type: str
    category: str
    merchant: Optional[str] = None
    description: Optional[str] = None
    payment_method: str = "upi"
    source: str = "manual"
    is_recurring: bool = False
    tags: Optional[str] = None
    timestamp: Optional[datetime] = None


class TransactionResponse(BaseModel):
    id: int
    amount: float
    transaction_type: str
    category: str
    merchant: Optional[str]
    description: Optional[str]
    payment_method: str
    source: str
    is_recurring: bool
    tags: Optional[str]
    timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    merchant: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None


# ── Investment Schemas ────────────────────────────────────

class InvestmentCreate(BaseModel):
    name: str
    investment_type: str
    invested_amount: float
    current_value: float
    returns_pct: float = 0.0
    risk_score: float = 5.0
    units: Optional[float] = None
    nav: Optional[float] = None
    platform: Optional[str] = None
    start_date: Optional[datetime] = None
    maturity_date: Optional[datetime] = None


class InvestmentResponse(BaseModel):
    id: int
    name: str
    investment_type: str
    invested_amount: float
    current_value: float
    returns_pct: float
    risk_score: float
    units: Optional[float]
    nav: Optional[float]
    platform: Optional[str]
    start_date: datetime
    maturity_date: Optional[datetime]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Goal Schemas ──────────────────────────────────────────

class GoalCreate(BaseModel):
    name: str
    description: Optional[str] = None
    target_amount: float
    current_amount: float = 0.0
    target_date: datetime
    category: str = "general"
    priority: str = "medium"


class GoalResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    target_amount: float
    current_amount: float
    target_date: datetime
    category: str
    priority: str
    is_completed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class GoalUpdate(BaseModel):
    current_amount: Optional[float] = None
    target_amount: Optional[float] = None
    target_date: Optional[datetime] = None
    is_completed: Optional[bool] = None


# ── Chat Schemas ──────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    context_used: Optional[str] = None
    session_id: str


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Analytics Schemas ─────────────────────────────────────

class SpendingByCategory(BaseModel):
    category: str
    total: float
    percentage: float
    count: int


class MonthlyTrend(BaseModel):
    month: str
    income: float
    expenses: float
    savings: float


class FinancialHealthScore(BaseModel):
    overall_score: int
    savings_ratio: float
    debt_ratio: float
    spending_stability: float
    emergency_reserve: float
    investment_diversity: float
    explanation: str
    recommendations: List[str]


class DashboardSummary(BaseModel):
    total_income: float
    total_expenses: float
    net_savings: float
    total_investments: float
    investment_returns: float
    net_worth: float
    active_goals: int
    financial_health_score: int
    spending_by_category: List[SpendingByCategory]
    monthly_trends: List[MonthlyTrend]
    recent_transactions: List[TransactionResponse]
    ai_insights: List[str]
