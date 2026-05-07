"""AI Chat API routes - RAG-based financial assistant."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from typing import List
from datetime import datetime, timedelta, timezone
import uuid
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.financial import Transaction, Investment, Goal, ChatMessage
from app.schemas.schemas import ChatRequest, ChatResponse, ChatMessageResponse

router = APIRouter(prefix="/api/chat", tags=["AI Chat"])


async def _build_financial_context(user: User, db: AsyncSession) -> str:
    """Build MCP financial context for the AI assistant."""
    now = datetime.now(timezone.utc)
    ms = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Monthly summary
    inc_r = await db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        and_(Transaction.user_id == user.id, Transaction.transaction_type == "income", Transaction.timestamp >= ms)))
    income = float(inc_r.scalar())
    exp_r = await db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        and_(Transaction.user_id == user.id, Transaction.transaction_type == "expense", Transaction.timestamp >= ms)))
    expenses = float(exp_r.scalar())

    # Top categories
    cat_r = await db.execute(select(Transaction.category, func.sum(Transaction.amount)).where(
        and_(Transaction.user_id == user.id, Transaction.transaction_type == "expense", Transaction.timestamp >= ms)
    ).group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).limit(5))
    top_cats = cat_r.all()

    # Recent transactions
    rec_r = await db.execute(select(Transaction).where(Transaction.user_id == user.id).order_by(desc(Transaction.timestamp)).limit(10))
    recent = rec_r.scalars().all()

    # Investments
    inv_r = await db.execute(select(Investment).where(and_(Investment.user_id == user.id, Investment.is_active == True)))
    investments = inv_r.scalars().all()

    # Goals
    goal_r = await db.execute(select(Goal).where(and_(Goal.user_id == user.id, Goal.is_completed == False)))
    goals = goal_r.scalars().all()

    # Subscriptions (recurring)
    sub_r = await db.execute(select(Transaction.merchant, func.sum(Transaction.amount)).where(
        and_(Transaction.user_id == user.id, Transaction.is_recurring == True)
    ).group_by(Transaction.merchant))
    subs = sub_r.all()

    ctx = f"""=== FINANCIAL CONTEXT FOR {user.full_name} ===
Monthly Income: ₹{income:,.0f} | Monthly Expenses: ₹{expenses:,.0f} | Savings: ₹{income - expenses:,.0f} ({((income - expenses) / max(income, 1) * 100):.0f}%)
Currency: {user.currency}

TOP SPENDING CATEGORIES:
"""
    for cat, amt in top_cats:
        ctx += f"- {cat.title()}: ₹{amt:,.0f}\n"

    ctx += "\nRECENT TRANSACTIONS:\n"
    for t in recent[:7]:
        ctx += f"- {t.timestamp.strftime('%d %b')}: ₹{t.amount:,.0f} ({t.category}) {t.merchant or ''} [{t.transaction_type}]\n"

    if investments:
        total_inv = sum(i.current_value for i in investments)
        total_invested = sum(i.invested_amount for i in investments)
        ctx += f"\nINVESTMENTS (Total: ₹{total_inv:,.0f}, Returns: ₹{total_inv - total_invested:,.0f}):\n"
        for i in investments:
            ctx += f"- {i.name} ({i.investment_type}): ₹{i.current_value:,.0f} (invested ₹{i.invested_amount:,.0f}, {i.returns_pct:.1f}%)\n"

    if goals:
        ctx += "\nFINANCIAL GOALS:\n"
        for g in goals:
            pct = g.current_amount / max(g.target_amount, 1) * 100
            ctx += f"- {g.name}: ₹{g.current_amount:,.0f}/₹{g.target_amount:,.0f} ({pct:.0f}%) by {g.target_date.strftime('%b %Y')}\n"

    if subs:
        ctx += "\nRECURRING SUBSCRIPTIONS:\n"
        for merchant, amt in subs:
            ctx += f"- {merchant}: ₹{amt:,.0f}/month\n"

    return ctx


def _generate_ai_response(query: str, context: str, chat_history: list) -> str:
    """Generate AI response using financial context (rule-based fallback when no API key)."""
    q = query.lower()

    if any(w in q for w in ["spend", "expense", "spending"]):
        return f"Based on your financial data:\n\n{context.split('TOP SPENDING')[1].split('RECENT')[0] if 'TOP SPENDING' in context else 'No spending data available.'}\n\n💡 I can see your spending patterns. Would you like me to suggest areas where you could cut back?"

    if any(w in q for w in ["save", "saving"]):
        lines = context.split('\n')
        summary = lines[1] if len(lines) > 1 else "No data"
        return f"Here's your savings overview:\n\n{summary}\n\n💡 A good target is saving 20-30% of your income. Want me to create a savings plan?"

    if any(w in q for w in ["invest", "portfolio", "mutual fund", "sip", "stock"]):
        if "INVESTMENTS" in context:
            inv_section = context.split("INVESTMENTS")[1].split("\n\n")[0]
            return f"Your investment portfolio:\n\n{inv_section}\n\n💡 Diversification is key. Want me to analyze your portfolio risk?"
        return "You don't have any investments tracked yet. Would you like to add your investment details?"

    if any(w in q for w in ["goal", "target", "plan"]):
        if "GOALS" in context:
            goal_section = context.split("GOALS")[1].split("\n\n")[0]
            return f"Your financial goals:\n\n{goal_section}\n\n💡 Want me to suggest a savings strategy to reach your goals faster?"
        return "You haven't set any financial goals yet. Setting goals helps you stay on track. Want to create one?"

    if any(w in q for w in ["subscription", "recurring", "netflix", "spotify"]):
        if "SUBSCRIPTIONS" in context:
            sub_section = context.split("SUBSCRIPTIONS")[1].split("\n\n")[0]
            return f"Your active subscriptions:\n\n{sub_section}\n\n💡 Review unused subscriptions to save money!"
        return "I haven't detected any recurring subscriptions. They'll appear as I track more of your transactions."

    if any(w in q for w in ["afford", "can i buy", "purchase"]):
        return f"Let me check your financial position:\n\n{context.split(chr(10))[1]}\n\n💡 Based on your current savings rate, I'd recommend ensuring you have 3-6 months of emergency funds before major purchases."

    if any(w in q for w in ["health", "score", "how am i doing"]):
        lines = context.split('\n')
        summary = lines[1] if len(lines) > 1 else ""
        return f"Financial Health Check:\n\n{summary}\n\n💡 Key areas: maintain 20%+ savings rate, diversify investments, and keep debt-to-income below 30%."

    # Default
    summary = context.split('\n')[1] if '\n' in context else "No data available"
    return f"Here's a summary of your finances:\n\n{summary}\n\nI can help you with:\n• Spending analysis\n• Savings planning\n• Investment tracking\n• Goal planning\n• Subscription management\n\nWhat would you like to explore?"


@router.post("/send", response_model=ChatResponse)
async def send_message(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the AI financial assistant."""
    session_id = data.session_id or str(uuid.uuid4())

    # Build financial context
    context = await _build_financial_context(current_user, db)

    # Get chat history
    hist_r = await db.execute(
        select(ChatMessage).where(
            and_(ChatMessage.user_id == current_user.id, ChatMessage.session_id == session_id)
        ).order_by(desc(ChatMessage.created_at)).limit(10)
    )
    history = hist_r.scalars().all()

    # Generate response
    response = _generate_ai_response(data.message, context, history)

    # Save messages
    user_msg = ChatMessage(user_id=current_user.id, role="user", content=data.message, session_id=session_id)
    ai_msg = ChatMessage(user_id=current_user.id, role="assistant", content=response, context_used=context[:500], session_id=session_id)
    db.add(user_msg)
    db.add(ai_msg)

    return ChatResponse(response=response, context_used=context[:200], session_id=session_id)


@router.get("/history", response_model=List[ChatMessageResponse])
async def get_chat_history(
    session_id: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get chat history."""
    query = select(ChatMessage).where(ChatMessage.user_id == current_user.id)
    if session_id:
        query = query.where(ChatMessage.session_id == session_id)
    query = query.order_by(ChatMessage.created_at.desc()).limit(50)
    result = await db.execute(query)
    return result.scalars().all()
