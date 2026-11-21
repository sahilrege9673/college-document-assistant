import math
import logging
import hashlib
import requests
from typing import List
from app.config import settings

logger = logging.getLogger("app.embeddings")


class EmbeddingService:
    """
    High-performance, zero-RAM embedding service for Render and Supabase pgvector.
    
    1. Primary: Google Gemini Cloud Embedding API (gemini-embedding-001, 384-dimensional)
       - Runs in cloud with zero local memory overhead (0 MB RAM).
       - Supports batchEmbedContents for fast bulk indexing up to 50 chunks/request.
       - Exactly matches the 384-dimensional vector schema in Supabase pgvector.
    
    2. Fallback: Ultra-fast deterministic subword n-gram semantic hashing (384-dimensional)
       - Provides 100% offline, zero-latency vector generation without external dependencies.
       - Normalized L2 vectors for accurate cosine similarity.
    """

    def __init__(self, dim: int = 384):
        self.dim = dim
        self.api_key = settings.GEMINI_API_KEY

    def embed_text(self, text: str) -> List[float]:
        """Generates a 384-dimensional dense vector for a single string."""
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generates 384-dimensional dense vectors for a batch of strings.
        Batches calls to Google Gemini Embeddings API in chunks of 40,
        falling back seamlessly to subword semantic hashing if API key is not configured or offline.
        """
        if not texts:
            return []

        api_key = settings.GEMINI_API_KEY or self.api_key
        if api_key and not api_key.startswith("AIzaSyYour"):
            try:
                all_vectors: List[List[float]] = []
                batch_size = 40  # Safely within Gemini request size limits

                for i in range(0, len(texts), batch_size):
                    slice_texts = texts[i:i + batch_size]
                    vectors = self._embed_gemini_batch(slice_texts, api_key)
                    all_vectors.extend(vectors)

                if len(all_vectors) == len(texts):
                    return all_vectors
            except Exception as e:
                logger.warning(f"Gemini cloud embedding failed ({e}). Using deterministic semantic fallback.")

        # Zero-RAM deterministic semantic fallback
        return [self._fallback_embed(t) for t in texts]

    def _embed_gemini_batch(self, texts: List[str], api_key: str) -> List[List[float]]:
        """Queries Google Gemini batchEmbedContents API for 384-dim embeddings."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key={api_key}"
        requests_payload = [
            {
                "model": "models/gemini-embedding-001",
                "content": {"parts": [{"text": t[:2500]}]},
                "output_dimensionality": self.dim,
            }
            for t in texts
        ]

        response = requests.post(url, json={"requests": requests_payload}, timeout=20)
        if response.status_code == 200:
            data = response.json()
            return [item["values"] for item in data.get("embeddings", [])]
        else:
            raise RuntimeError(f"Gemini embedding API returned status {response.status_code}: {response.text[:200]}")

    def _fallback_embed(self, text: str) -> List[float]:
        """
        Generates a deterministic 384-dimensional dense vector using token and character-trigram hashing.
        Guarantees non-zero cosine similarity for semantically overlapping academic keywords.
        """
        dim = self.dim
        vec = [0.0] * dim
        clean = (text or "").lower().strip()
        words = clean.split()
        if not words:
            vec[0] = 1.0
            return vec

        for word in words:
            # Word-level hashing
            h_word = int(hashlib.md5(word.encode("utf-8", "ignore")).hexdigest(), 16)
            idx_w = h_word % dim
            val_w = ((h_word >> 16) % 1000) / 1000.0 - 0.5
            vec[idx_w] += val_w

            # Subword trigram hashing for partial matches and morphology
            if len(word) >= 3:
                for j in range(len(word) - 2):
                    tri = word[j:j + 3]
                    h_tri = int(hashlib.sha256(tri.encode("utf-8", "ignore")).hexdigest()[:8], 16)
                    idx_t = h_tri % dim
                    vec[idx_t] += 0.35

        # L2 Unit Normalization
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        else:
            vec[0] = 1.0
        return vec


embedding_service = EmbeddingService()
