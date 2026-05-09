"""Embedding Pipeline - Converts financial text data into vector embeddings.

Uses sentence-transformers for local embedding generation, with fallback
to a simple TF-IDF based approach when sentence-transformers is not available.
"""

import hashlib
import json
import os
from typing import List, Optional
from app.core.config import settings

# Try to import sentence-transformers, fallback to simple approach
_embedding_model = None
_use_transformers = False


def _get_simple_embedding(text: str, dim: int = 384) -> List[float]:
    """Generate a deterministic pseudo-embedding using hash-based approach.
    
    This is a fallback when sentence-transformers is not installed.
    It creates consistent vectors for the same text, allowing basic
    similarity search without ML dependencies.
    """
    import struct

    # Create a deterministic hash-based embedding
    text_lower = text.lower().strip()
    vectors = []

    for i in range(dim):
        seed = f"{text_lower}_{i}"
        h = hashlib.md5(seed.encode()).digest()
        # Convert first 4 bytes to float
        val = struct.unpack('f', h[:4])[0]
        # Normalize to [-1, 1]
        val = (val % 2) - 1
        vectors.append(val)

    # L2 normalize
    norm = sum(v * v for v in vectors) ** 0.5
    if norm > 0:
        vectors = [v / norm for v in vectors]

    return vectors


def _init_model():
    """Lazily initialize the embedding model."""
    global _embedding_model, _use_transformers

    if _embedding_model is not None:
        return

    try:
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        _use_transformers = True
        print("✅ Loaded sentence-transformers model: all-MiniLM-L6-v2")
    except ImportError:
        _use_transformers = False
        _embedding_model = "fallback"
        print("⚠️ sentence-transformers not available, using hash-based embeddings")


def embed_text(text: str) -> List[float]:
    """Generate embedding vector for a single text string."""
    _init_model()

    if _use_transformers:
        embedding = _embedding_model.encode(text, normalize_embeddings=True)
        return embedding.tolist()
    else:
        return _get_simple_embedding(text)


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Generate embedding vectors for multiple text strings."""
    _init_model()

    if _use_transformers:
        embeddings = _embedding_model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()
    else:
        return [_get_simple_embedding(t) for t in texts]


def get_embedding_dim() -> int:
    """Get the dimensionality of the embedding vectors."""
    _init_model()
    if _use_transformers:
        return _embedding_model.get_sentence_embedding_dimension()
    return 384


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks for embedding.
    
    Args:
        text: Input text to chunk.
        chunk_size: Maximum characters per chunk.
        overlap: Number of overlapping characters between chunks.
    
    Returns:
        List of text chunks.
    """
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size

        # Try to break at sentence boundary
        if end < len(text):
            last_period = text.rfind(".", start, end)
            last_newline = text.rfind("\n", start, end)
            break_point = max(last_period, last_newline)
            if break_point > start + chunk_size // 2:
                end = break_point + 1

        chunks.append(text[start:end].strip())
        start = end - overlap

    return [c for c in chunks if c]
