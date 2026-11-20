import math
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models import DocumentChunk, Document

logger = logging.getLogger("app.vector_store")


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Calculates cosine similarity between two float vectors."""
    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot_product / (norm_a * norm_b)


class VectorStoreService:
    """
    Manages vector storage and top-K similarity retrieval.
    Optimized for Supabase pgvector in production, with fallback cosine calculation
    for local development environments.
    """

    def search_similar_chunks(
        self,
        db: Session,
        user_id: str,
        query_vector: List[float],
        top_k: int = 5,
        threshold: float = 0.20,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves the top-K most similar document chunks for a given user.
        """
        bind = db.get_bind()
        dialect_name = bind.dialect.name

        # If connected to PostgreSQL with pgvector enabled
        if dialect_name == "postgresql":
            try:
                # Format vector as string for pgvector: '[0.1, 0.2, ...]'
                vec_str = "[" + ",".join(f"{x:.6f}" for x in query_vector) + "]"
                sql = text("""
                    SELECT 
                        dc.id,
                        dc.document_id,
                        d.file_name,
                        dc.content,
                        dc.page_number,
                        (1 - (dc.embedding <=> CAST(:query_vec AS vector))) AS similarity
                    FROM document_chunks dc
                    JOIN documents d ON d.id = dc.document_id
                    WHERE dc.user_id = :user_id
                      AND (1 - (dc.embedding <=> CAST(:query_vec AS vector))) > :threshold
                    ORDER BY dc.embedding <=> CAST(:query_vec AS vector) ASC
                    LIMIT :top_k;
                """)
                result = db.execute(
                    sql,
                    {
                        "query_vec": vec_str,
                        "user_id": user_id,
                        "threshold": threshold,
                        "top_k": top_k,
                    }
                )
                rows = result.fetchall()
                if rows:
                    return [
                        {
                            "id": str(r[0]),
                            "document_id": str(r[1]),
                            "file_name": str(r[2]),
                            "content": str(r[3]),
                            "page_number": int(r[4]) if r[4] else 1,
                            "similarity": float(r[5]),
                        }
                        for r in rows
                    ]
            except Exception as e:
                logger.warning(f"PostgreSQL pgvector query error ({e}). Falling back to ORM cosine scan.")

        # Universal fallback (SQLite / standard PostgreSQL table scan)
        chunks = (
            db.query(DocumentChunk, Document.file_name)
            .join(Document, Document.id == DocumentChunk.document_id)
            .filter(DocumentChunk.user_id == user_id)
            .all()
        )

        scored = []
        for chunk, file_name in chunks:
            chunk_embedding = chunk.embedding
            if isinstance(chunk_embedding, list) and len(chunk_embedding) == len(query_vector):
                sim = cosine_similarity(query_vector, chunk_embedding)
                if sim >= threshold:
                    scored.append({
                        "id": chunk.id,
                        "document_id": chunk.document_id,
                        "file_name": file_name,
                        "content": chunk.content,
                        "page_number": chunk.page_number,
                        "similarity": sim,
                    })

        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]


vector_store = VectorStoreService()
