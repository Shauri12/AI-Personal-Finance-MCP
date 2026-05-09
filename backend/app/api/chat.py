"""AI Chat API routes - RAG-based financial assistant with streaming support.

This is the main chat interface that ties together:
- MCP Context Engine (financial data summarization)
- Intent Detection (understanding user queries)
- RAG Retrieval (vector similarity search)
- LLM Integration (OpenAI/Gemini/fallback)
- Conversation Memory (session persistence)
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from typing import List
from datetime import datetime, timedelta, timezone
import uuid
import json
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.financial import Transaction, Investment, Goal, ChatMessage
from app.schemas.schemas import ChatRequest, ChatResponse, ChatMessageResponse
from app.ai.rag.retriever import RAGEngine
from app.ai.llm_client import generate_response, generate_response_stream, get_provider
from app.ai.memory import ConversationMemory
from app.ai.intent_detector import detect_intent

router = APIRouter(prefix="/api/chat", tags=["AI Chat"])


@router.post("/send", response_model=ChatResponse)
async def send_message(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the AI financial assistant (non-streaming)."""
    session_id = data.session_id or str(uuid.uuid4())

    # Initialize AI components
    rag_engine = RAGEngine(current_user, db)
    memory = ConversationMemory(current_user, db, session_id)

    # 1. Retrieve context using RAG pipeline
    retrieval = await rag_engine.retrieve_context(data.message)

    # 2. Get conversation history
    chat_history = await memory.get_sliding_window(window_size=10)

    # 3. Generate AI response
    response_text = await generate_response(
        system_prompt=retrieval["context_for_llm"],
        user_message=data.message,
        chat_history=chat_history,
    )

    # 4. Save conversation
    context_summary = f"Intent: {retrieval['intent']} ({retrieval['confidence']:.0%})"
    await memory.save_exchange(data.message, response_text, context_summary)

    return ChatResponse(
        response=response_text,
        context_used=context_summary,
        session_id=session_id,
    )


@router.post("/stream")
async def stream_message(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and receive streaming response via Server-Sent Events."""
    session_id = data.session_id or str(uuid.uuid4())

    # Initialize AI components
    rag_engine = RAGEngine(current_user, db)
    memory = ConversationMemory(current_user, db, session_id)

    # 1. Retrieve context
    retrieval = await rag_engine.retrieve_context(data.message)

    # 2. Get conversation history
    chat_history = await memory.get_sliding_window(window_size=10)

    async def event_stream():
        """Generate Server-Sent Events stream."""
        full_response = []

        # Send session_id first
        yield f"data: {json.dumps({'type': 'session', 'session_id': session_id})}\n\n"

        # Send intent info
        yield f"data: {json.dumps({'type': 'intent', 'intent': retrieval['intent'], 'confidence': retrieval['confidence']})}\n\n"

        # Stream the response
        try:
            async for chunk in generate_response_stream(
                system_prompt=retrieval["context_for_llm"],
                user_message=data.message,
                chat_history=chat_history,
            ):
                full_response.append(chunk)
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Save conversation after streaming is complete
            response_text = "".join(full_response)
            context_summary = f"Intent: {retrieval['intent']} ({retrieval['confidence']:.0%})"
            await memory.save_exchange(data.message, response_text, context_summary)

            # Send completion signal
            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history", response_model=List[ChatMessageResponse])
async def get_chat_history(
    session_id: str = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for a session or all sessions."""
    query = select(ChatMessage).where(ChatMessage.user_id == current_user.id)
    if session_id:
        query = query.where(ChatMessage.session_id == session_id)
    query = query.order_by(ChatMessage.created_at.asc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/sessions")
async def get_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all chat sessions for the current user."""
    memory = ConversationMemory(current_user, db, "")
    sessions = await memory.get_all_sessions()

    # Add first message preview for each session
    for session in sessions:
        result = await db.execute(
            select(ChatMessage.content).where(
                and_(
                    ChatMessage.user_id == current_user.id,
                    ChatMessage.session_id == session["session_id"],
                    ChatMessage.role == "user",
                )
            ).order_by(ChatMessage.created_at.asc()).limit(1)
        )
        first_msg = result.scalar()
        session["preview"] = (first_msg[:80] + "...") if first_msg and len(first_msg) > 80 else first_msg

    return sessions


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat session."""
    result = await db.execute(
        select(ChatMessage).where(
            and_(
                ChatMessage.user_id == current_user.id,
                ChatMessage.session_id == session_id,
            )
        )
    )
    messages = result.scalars().all()
    for msg in messages:
        await db.delete(msg)

    return {"status": "deleted", "session_id": session_id}


@router.get("/status")
async def get_ai_status():
    """Get current AI engine status."""
    provider = get_provider()
    return {
        "provider": provider,
        "status": "active",
        "capabilities": {
            "streaming": True,
            "context_aware": True,
            "intent_detection": True,
            "rag_retrieval": True,
            "conversation_memory": True,
        },
        "model": {
            "openai": "Connected to OpenAI" if provider == "openai" else "Not configured",
            "gemini": "Connected to Gemini" if provider == "gemini" else "Not configured",
            "fallback": "Active — intelligent rule-based engine" if provider == "fallback" else "Standby",
        },
    }
