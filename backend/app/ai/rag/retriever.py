"""RAG Retrieval Engine - Orchestrates context retrieval for AI responses.

Combines MCP financial context with vector store retrieval to build
the optimal context window for LLM reasoning.
"""

from typing import List, Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.ai.context_engine import MCPContextEngine
from app.ai.intent_detector import detect_intent, detect_all_intents, extract_entities
from app.ai.embeddings.pipeline import embed_text, chunk_text, embed_texts
from app.ai.rag.vector_store import (
    upsert_documents, query_similar, get_collection_count
)


class RAGEngine:
    """Retrieval-Augmented Generation engine for financial queries."""

    def __init__(self, user: User, db: AsyncSession):
        self.user = user
        self.db = db
        self.context_engine = MCPContextEngine(user, db)
        self.collection_name = f"user_{user.id}_finance"

    async def retrieve_context(self, query: str) -> Dict:
        """
        Main retrieval pipeline: detect intent, build context, search vectors.

        Returns:
            Dict with keys: intent, confidence, context, relevant_docs, entities
        """
        # 1. Detect intent
        intent, confidence = detect_intent(query)
        all_intents = detect_all_intents(query)
        entities = extract_entities(query)

        # 2. Build targeted MCP context
        mcp_context = await self.context_engine.build_targeted_context(intent)

        # 3. Index the financial context for future retrieval
        await self._index_context(mcp_context)

        # 4. Vector similarity search for relevant past context
        relevant_docs = await self._search_relevant(query)

        # 5. Build final context package
        return {
            "intent": intent,
            "confidence": confidence,
            "all_intents": all_intents,
            "entities": entities,
            "mcp_context": mcp_context,
            "relevant_docs": relevant_docs,
            "context_for_llm": self._build_llm_context(
                query, intent, mcp_context, relevant_docs
            ),
        }

    async def _index_context(self, context: str):
        """Index financial context chunks into vector store for retrieval."""
        chunks = chunk_text(context, chunk_size=400, overlap=50)

        if not chunks:
            return

        ids = [f"{self.collection_name}_chunk_{i}" for i in range(len(chunks))]
        embeddings = embed_texts(chunks)
        metadatas = [{"user_id": self.user.id, "type": "financial_context", "chunk_idx": i}
                     for i in range(len(chunks))]

        upsert_documents(
            collection_name=self.collection_name,
            ids=ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    async def _search_relevant(self, query: str, n_results: int = 3) -> List[Dict]:
        """Search vector store for relevant context chunks."""
        # Check if collection has documents
        count = get_collection_count(self.collection_name)
        if count == 0:
            return []

        query_embedding = embed_text(query)
        results = query_similar(
            collection_name=self.collection_name,
            query_embedding=query_embedding,
            n_results=min(n_results, count),
            where={"user_id": self.user.id},
        )

        return [
            {
                "id": doc_id,
                "content": doc,
                "similarity": score,
                "metadata": meta,
            }
            for doc_id, doc, score, meta in results
            if score > 0.1  # Minimum similarity threshold
        ]

    def _build_llm_context(
        self,
        query: str,
        intent: str,
        mcp_context: str,
        relevant_docs: List[Dict],
    ) -> str:
        """Build the final context string for LLM consumption."""
        parts = [
            "You are FinanceOS AI — a premium, expert AI financial advisor.",
            "You have access to the user's complete financial data below.",
            "Provide actionable, specific advice based on their real numbers.",
            "Always reference specific amounts and percentages from their data.",
            "Use Indian Rupees (₹) for all amounts. Be concise but thorough.",
            "Format responses with clear sections, bullet points, and emojis.",
            "",
            f"USER INTENT: {intent}",
            "",
            "═══ USER'S FINANCIAL DATA ═══",
            mcp_context,
        ]

        if relevant_docs:
            parts.append("\n═══ ADDITIONAL RELEVANT CONTEXT ═══")
            for doc in relevant_docs[:3]:
                parts.append(doc["content"])

        parts.extend([
            "",
            "═══ INSTRUCTIONS ═══",
            "- Answer the user's specific question using their data above",
            "- Provide personalized advice, not generic tips",
            "- If the user asks about something not in the data, say so clearly",
            "- Use a professional yet friendly tone",
            "- Include specific numbers from their data in your response",
            "- Suggest actionable next steps when appropriate",
        ])

        return "\n".join(parts)

    async def get_full_context_summary(self) -> str:
        """Get a full financial context summary (for health checks, etc.)."""
        return await self.context_engine.build_full_context()
