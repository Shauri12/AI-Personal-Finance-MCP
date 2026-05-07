"""Financial data models - Transactions, Investments, Goals, Subscriptions."""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base
import enum


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"


class TransactionCategory(str, enum.Enum):
    FOOD = "food"
    TRANSPORT = "transport"
    SHOPPING = "shopping"
    ENTERTAINMENT = "entertainment"
    UTILITIES = "utilities"
    RENT = "rent"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    TRAVEL = "travel"
    GROCERIES = "groceries"
    SUBSCRIPTIONS = "subscriptions"
    SALARY = "salary"
    FREELANCE = "freelance"
    INVESTMENT_INCOME = "investment_income"
    GIFT = "gift"
    EMI = "emi"
    INSURANCE = "insurance"
    OTHER = "other"


class PaymentMethod(str, enum.Enum):
    UPI = "upi"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    NET_BANKING = "net_banking"
    CASH = "cash"
    WALLET = "wallet"
    AUTO_DEBIT = "auto_debit"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String(20), nullable=False)
    category = Column(String(50), nullable=False)
    merchant = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    payment_method = Column(String(30), default="upi")
    source = Column(String(100), default="manual")  # bank, upi, credit_card, manual
    reference_id = Column(String(255), nullable=True)
    is_recurring = Column(Boolean, default=False)
    tags = Column(String(500), nullable=True)  # comma-separated tags
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="transactions")


class InvestmentType(str, enum.Enum):
    MUTUAL_FUND = "mutual_fund"
    STOCKS = "stocks"
    SIP = "sip"
    FIXED_DEPOSIT = "fixed_deposit"
    PPF = "ppf"
    NPS = "nps"
    GOLD = "gold"
    CRYPTO = "crypto"
    BONDS = "bonds"
    REAL_ESTATE = "real_estate"


class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    investment_type = Column(String(50), nullable=False)
    invested_amount = Column(Float, nullable=False)
    current_value = Column(Float, nullable=False)
    returns_pct = Column(Float, default=0.0)
    risk_score = Column(Float, default=5.0)  # 1-10 scale
    units = Column(Float, nullable=True)
    nav = Column(Float, nullable=True)
    platform = Column(String(100), nullable=True)
    start_date = Column(DateTime, nullable=False)
    maturity_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="investments")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    target_date = Column(DateTime, nullable=False)
    category = Column(String(100), default="general")  # emergency, vacation, car, education, house
    priority = Column(String(20), default="medium")  # low, medium, high
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="goals")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    context_used = Column(Text, nullable=True)  # financial context snippets used
    session_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="chat_messages")
