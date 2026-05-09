"""Vector Store - ChromaDB integration for financial data retrieval.

Stores embedded financial context chunks in ChromaDB for semantic search.
Falls back to in-memory similarity search if ChromaDB is unavailable.
"""

import os
import json
from typing import List, Dict, Optional, Tuple
from app.core.config import settings

# In-memory fallback store
_memory_store: Dict[str, Dict] = {}  # collection -> {ids, documents, embeddings, metadatas}
_chroma_client = None
_use_chroma = False


def _init_store():
    """Initialize the vector store (ChromaDB or in-memory fallback)."""
    global _chroma_client, _use_chroma

    if _chroma_client is not None:
        return

    try:
        import chromadb
        from chromadb.config import Settings as ChromaSettings

        persist_dir = settings.CHROMA_PERSIST_DIR
        os.makedirs(persist_dir, exist_ok=True)

        _chroma_client = chromadb.Client(ChromaSettings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=persist_dir,
            anonymized_telemetry=False,
        ))
        _use_chroma = True
        print(f"✅ ChromaDB initialized at {persist_dir}")
    except Exception as e:
        _use_chroma = False
        _chroma_client = "fallback"
        print(f"⚠️ ChromaDB not available ({e}), using in-memory vector store")


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def get_or_create_collection(name: str):
    """Get or create a ChromaDB collection (or in-memory equivalent)."""
    _init_store()

    if _use_chroma:
        return _chroma_client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"}
        )
    else:
        if name not in _memory_store:
            _memory_store[name] = {
                "ids": [],
                "documents": [],
                "embeddings": [],
                "metadatas": [],
            }
        return name  # Return collection name as handle


def upsert_documents(
    collection_name: str,
    ids: List[str],
    documents: List[str],
    embeddings: List[List[float]],
    metadatas: Optional[List[Dict]] = None,
):
    """Add or update documents in the vector store."""
    _init_store()

    if not metadatas:
        metadatas = [{}] * len(ids)

    if _use_chroma:
        collection = _chroma_client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )
    else:
        store = _memory_store.setdefault(collection_name, {
            "ids": [], "documents": [], "embeddings": [], "metadatas": []
        })

        for i, doc_id in enumerate(ids):
            if doc_id in store["ids"]:
                idx = store["ids"].index(doc_id)
                store["documents"][idx] = documents[i]
                store["embeddings"][idx] = embeddings[i]
                store["metadatas"][idx] = metadatas[i]
            else:
                store["ids"].append(doc_id)
                store["documents"].append(documents[i])
                store["embeddings"].append(embeddings[i])
                store["metadatas"].append(metadatas[i])


def query_similar(
    collection_name: str,
    query_embedding: List[float],
    n_results: int = 5,
    where: Optional[Dict] = None,
) -> List[Tuple[str, str, float, Dict]]:
    """
    Query the vector store for similar documents.
    
    Returns:
        List of (id, document, similarity_score, metadata) tuples.
    """
    _init_store()

    if _use_chroma:
        collection = _chroma_client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )

        kwargs = {
            "query_embeddings": [query_embedding],
            "n_results": min(n_results, collection.count()) if collection.count() > 0 else 1,
        }
        if where:
            kwargs["where"] = where

        try:
            results = collection.query(**kwargs)
        except Exception:
            return []

        if not results or not results["ids"] or not results["ids"][0]:
            return []

        output = []
        for i in range(len(results["ids"][0])):
            doc_id = results["ids"][0][i]
            doc = results["documents"][0][i] if results["documents"] else ""
            distance = results["distances"][0][i] if results["distances"] else 0
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            similarity = 1 - distance  # ChromaDB returns distance, convert to similarity
            output.append((doc_id, doc, similarity, meta))

        return output

    else:
        # In-memory similarity search
        store = _memory_store.get(collection_name)
        if not store or not store["ids"]:
            return []

        scores = []
        for i, emb in enumerate(store["embeddings"]):
            sim = _cosine_similarity(query_embedding, emb)

            # Apply metadata filter
            if where:
                meta = store["metadatas"][i]
                match = all(meta.get(k) == v for k, v in where.items())
                if not match:
                    continue

            scores.append((
                store["ids"][i],
                store["documents"][i],
                sim,
                store["metadatas"][i],
            ))

        scores.sort(key=lambda x: x[2], reverse=True)
        return scores[:n_results]


def delete_collection(collection_name: str):
    """Delete an entire collection."""
    _init_store()

    if _use_chroma:
        try:
            _chroma_client.delete_collection(collection_name)
        except Exception:
            pass
    else:
        _memory_store.pop(collection_name, None)


def get_collection_count(collection_name: str) -> int:
    """Get the number of documents in a collection."""
    _init_store()

    if _use_chroma:
        try:
            collection = _chroma_client.get_or_create_collection(name=collection_name)
            return collection.count()
        except Exception:
            return 0
    else:
        store = _memory_store.get(collection_name)
        return len(store["ids"]) if store else 0
