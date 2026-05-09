"""Conversation Memory Manager - Manages chat history and session state.

Provides conversation memory for the AI assistant, supporting:
- Session-based chat history
- Sliding window context
- Conversation summarization
"""

from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from app.models.financial import ChatMessage
from app.models.user import User


class ConversationMemory:
    """Manages conversation history for AI chat sessions."""

    def __init__(self, user: User, db: AsyncSession, session_id: str):
        self.user = user
        self.db = db
        self.session_id = session_id

    async def get_history(self, limit: int = 20) -> List[Dict[str, str]]:
        """
        Get recent chat history for the current session.

        Returns:
            List of {"role": str, "content": str} dicts in chronological order.
        """
        result = await self.db.execute(
            select(ChatMessage).where(
                and_(
                    ChatMessage.user_id == self.user.id,
                    ChatMessage.session_id == self.session_id,
                )
            ).order_by(desc(ChatMessage.created_at))
            .limit(limit)
        )
        messages = result.scalars().all()

        # Reverse to get chronological order
        return [
            {"role": msg.role, "content": msg.content}
            for msg in reversed(messages)
        ]

    async def get_sliding_window(self, window_size: int = 10) -> List[Dict[str, str]]:
        """
        Get the last N messages for context window management.
        
        This prevents the conversation from growing too large for the LLM context.
        """
        history = await self.get_history(limit=window_size)
        return history

    async def save_exchange(self, user_message: str, ai_response: str, context_used: str = ""):
        """Save a user-AI message exchange to the database."""
        user_msg = ChatMessage(
            user_id=self.user.id,
            role="user",
            content=user_message,
            session_id=self.session_id,
        )
        ai_msg = ChatMessage(
            user_id=self.user.id,
            role="assistant",
            content=ai_response,
            context_used=context_used[:1000] if context_used else None,
            session_id=self.session_id,
        )
        self.db.add(user_msg)
        self.db.add(ai_msg)

    async def get_session_count(self) -> int:
        """Get the number of messages in the current session."""
        result = await self.db.execute(
            select(func.count()).where(
                and_(
                    ChatMessage.user_id == self.user.id,
                    ChatMessage.session_id == self.session_id,
                )
            )
        )
        return result.scalar() or 0

    async def get_all_sessions(self) -> List[Dict]:
        """Get all chat sessions for the user."""
        result = await self.db.execute(
            select(
                ChatMessage.session_id,
                func.min(ChatMessage.created_at).label("started_at"),
                func.max(ChatMessage.created_at).label("last_message"),
                func.count().label("message_count"),
            ).where(
                ChatMessage.user_id == self.user.id
            ).group_by(ChatMessage.session_id)
            .order_by(func.max(ChatMessage.created_at).desc())
        )

        sessions = []
        for row in result.all():
            sessions.append({
                "session_id": row.session_id,
                "started_at": row.started_at.isoformat() if row.started_at else None,
                "last_message": row.last_message.isoformat() if row.last_message else None,
                "message_count": row.message_count,
            })

        return sessions

    async def get_conversation_summary(self) -> str:
        """Generate a brief summary of the conversation so far."""
        history = await self.get_history(limit=20)

        if not history:
            return "New conversation — no previous messages."

        user_messages = [m["content"] for m in history if m["role"] == "user"]
        topics = set()

        topic_keywords = {
            "spending": ["spend", "expense", "cost", "bill"],
            "savings": ["save", "saving", "savings"],
            "investments": ["invest", "portfolio", "mutual fund", "sip"],
            "goals": ["goal", "target", "plan"],
            "subscriptions": ["subscription", "recurring"],
            "health": ["health", "score", "status"],
        }

        for msg in user_messages:
            msg_lower = msg.lower()
            for topic, keywords in topic_keywords.items():
                if any(kw in msg_lower for kw in keywords):
                    topics.add(topic)

        topic_str = ", ".join(topics) if topics else "general finance"
        return f"Conversation with {len(history)} messages about: {topic_str}"
