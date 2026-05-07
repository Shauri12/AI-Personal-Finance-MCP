"""Mock data seeder - generates realistic Indian financial data."""

import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.user import User
from app.models.financial import Transaction, Investment, Goal
from app.core.security import get_password_hash

MERCHANTS = {
    "food": ["Swiggy", "Zomato", "Dominos", "McDonald's", "Haldirams", "Barbeque Nation", "Local Restaurant"],
    "transport": ["Uber", "Ola", "Rapido", "Metro Card", "Petrol Pump", "IRCTC"],
    "shopping": ["Amazon", "Flipkart", "Myntra", "Reliance Digital", "Croma", "DMart"],
    "entertainment": ["Netflix", "Spotify", "Amazon Prime", "Hotstar", "PVR Cinemas", "BookMyShow"],
    "utilities": ["Electricity Bill", "Water Bill", "Gas Bill", "Internet - Jio", "Mobile Recharge"],
    "rent": ["House Rent", "PG Rent"],
    "healthcare": ["Apollo Pharmacy", "1mg", "PharmEasy", "Doctor Visit", "Lab Tests"],
    "education": ["Coursera", "Udemy", "Books - Amazon", "College Fee"],
    "groceries": ["BigBasket", "Blinkit", "Zepto", "JioMart", "Local Kirana"],
    "subscriptions": ["Netflix", "Spotify", "YouTube Premium", "ChatGPT Plus", "iCloud", "LinkedIn Premium"],
    "emi": ["Home Loan EMI", "Car Loan EMI", "Education Loan EMI", "Credit Card EMI"],
    "insurance": ["LIC Premium", "Health Insurance", "Term Insurance", "Vehicle Insurance"],
}

INCOME_SOURCES = [
    ("Salary Credit", "salary"), ("Freelance Payment", "freelance"),
    ("Interest Credit", "investment_income"), ("Dividend", "investment_income"),
    ("Cashback", "gift"), ("Refund", "other"),
]

INVESTMENTS_DATA = [
    ("Axis Bluechip Fund", "mutual_fund", 50000, 58500, 17.0, 6.5, "Groww"),
    ("Parag Parikh Flexi Cap", "mutual_fund", 75000, 89250, 19.0, 7.0, "Zerodha"),
    ("HDFC Mid-Cap Fund", "mutual_fund", 30000, 33900, 13.0, 7.5, "Groww"),
    ("Nifty 50 Index Fund", "mutual_fund", 100000, 115000, 15.0, 5.0, "Zerodha"),
    ("SBI SIP - Monthly", "sip", 60000, 68400, 14.0, 5.5, "SBI MF"),
    ("Reliance Industries", "stocks", 25000, 31250, 25.0, 8.0, "Zerodha"),
    ("TCS", "stocks", 40000, 44000, 10.0, 6.0, "Groww"),
    ("Infosys", "stocks", 35000, 38500, 10.0, 6.5, "Zerodha"),
    ("Fixed Deposit - SBI", "fixed_deposit", 200000, 214000, 7.0, 2.0, "SBI"),
    ("PPF Account", "ppf", 150000, 163500, 7.1, 1.5, "Post Office"),
    ("Digital Gold", "gold", 20000, 23000, 15.0, 5.0, "Groww"),
    ("Sovereign Gold Bond", "bonds", 50000, 57500, 15.0, 4.0, "RBI"),
]

GOALS_DATA = [
    ("Emergency Fund", "Build 6 months expenses", 300000, 180000, 365, "emergency", "high"),
    ("Goa Vacation", "Annual trip with friends", 50000, 32000, 180, "vacation", "medium"),
    ("MacBook Pro", "For development work", 200000, 85000, 300, "general", "medium"),
    ("Higher Education", "Masters degree fund", 1500000, 250000, 730, "education", "high"),
    ("Car Purchase", "Buy Hyundai Creta", 1200000, 400000, 545, "car", "low"),
]


async def seed_demo_data(db: AsyncSession):
    """Seed the database with realistic demo data."""
    # Check if demo user exists
    result = await db.execute(select(func.count()).where(User.email == "demo@finmcp.ai"))
    if result.scalar() > 0:
        return  # Already seeded

    # Create demo user
    user = User(
        email="demo@finmcp.ai",
        username="demo_user",
        full_name="Arjun Sharma",
        hashed_password=get_password_hash("demo123"),
        monthly_income=85000,
        currency="INR",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    now = datetime.now(timezone.utc)

    # Generate 6 months of transactions
    transactions = []
    for month_offset in range(6):
        month_start = (now - timedelta(days=30 * month_offset)).replace(day=1)

        # Salary (income)
        transactions.append(Transaction(
            user_id=user.id, amount=85000 + random.randint(-2000, 5000),
            transaction_type="income", category="salary", merchant="TechCorp India",
            description="Monthly salary", payment_method="net_banking", source="bank",
            timestamp=month_start.replace(day=1),
        ))

        # Random freelance income
        if random.random() > 0.5:
            transactions.append(Transaction(
                user_id=user.id, amount=random.randint(5000, 25000),
                transaction_type="income", category="freelance", merchant="Upwork",
                description="Freelance project payment", payment_method="net_banking", source="bank",
                timestamp=month_start.replace(day=random.randint(5, 25)),
            ))

        # Generate 30-50 expenses per month
        for _ in range(random.randint(30, 50)):
            cat = random.choice(list(MERCHANTS.keys()))
            merchant = random.choice(MERCHANTS[cat])
            day = random.randint(1, 28)

            amount_ranges = {
                "food": (100, 2500), "transport": (50, 3000), "shopping": (500, 15000),
                "entertainment": (100, 2000), "utilities": (200, 5000), "rent": (15000, 25000),
                "healthcare": (200, 5000), "education": (500, 10000), "groceries": (200, 5000),
                "subscriptions": (149, 1499), "emi": (5000, 25000), "insurance": (1000, 10000),
            }
            lo, hi = amount_ranges.get(cat, (100, 5000))
            amount = random.randint(lo, hi)

            is_recurring = cat in ("subscriptions", "emi", "insurance", "rent", "utilities")
            pm = random.choice(["upi", "credit_card", "debit_card", "cash", "wallet"])

            transactions.append(Transaction(
                user_id=user.id, amount=amount,
                transaction_type="expense", category=cat, merchant=merchant,
                description=f"{merchant} payment", payment_method=pm,
                source=random.choice(["bank", "upi", "credit_card"]),
                is_recurring=is_recurring,
                timestamp=month_start.replace(day=day),
            ))

    db.add_all(transactions)

    # Add investments
    for name, itype, invested, current, ret, risk, platform in INVESTMENTS_DATA:
        db.add(Investment(
            user_id=user.id, name=name, investment_type=itype,
            invested_amount=invested, current_value=current, returns_pct=ret,
            risk_score=risk, platform=platform,
            start_date=now - timedelta(days=random.randint(90, 730)),
        ))

    # Add goals
    for name, desc, target, current, days, cat, priority in GOALS_DATA:
        db.add(Goal(
            user_id=user.id, name=name, description=desc,
            target_amount=target, current_amount=current,
            target_date=now + timedelta(days=days),
            category=cat, priority=priority,
        ))

    await db.flush()
    print(f"✅ Seeded {len(transactions)} transactions, {len(INVESTMENTS_DATA)} investments, {len(GOALS_DATA)} goals for demo user.")
