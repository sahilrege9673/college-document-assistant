import logging
import math
from typing import List

logger = logging.getLogger("app.embeddings")


class EmbeddingService:
    """
    Embedding service using sentence-transformers/all-MiniLM-L6-v2 (384-dimensional).
    Includes lazy loading and graceful CPU execution.
    """

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None

    def _load_model(self):
        if self.model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading embedding model: {self.model_name}")
                self.model = SentenceTransformer(self.model_name, device="cpu")
                logger.info("Embedding model loaded successfully.")
            except Exception as e:
                logger.warning(f"Failed to load SentenceTransformer ({e}). Using deterministic fallback.")
                self.model = "fallback"

    def embed_text(self, text: str) -> List[float]:
        """Generates a 384-dimensional dense vector for a single string."""
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generates 384-dimensional dense vectors for a batch of strings."""
        self._load_model()

        if self.model != "fallback" and self.model is not None:
            try:
                embeddings = self.model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
                return [emb.tolist() for emb in embeddings]
            except Exception as e:
                logger.warning(f"Error during SentenceTransformer encoding: {e}. Using fallback.")

        # Deterministic 384-dim fallback for offline or low-RAM environments
        return [self._fallback_embed(t) for t in texts]

    def _fallback_embed(self, text: str) -> List[float]:
        """Generates a pseudo-semantic deterministic 384-dim vector using token hashing."""
        dim = 384
        vec = [0.0] * dim
        words = text.lower().split()
        for i, word in enumerate(words):
            h = hash(word)
            idx = abs(h) % dim
            val = (h % 1000) / 1000.0
            vec[idx] += val

        # L2 Normalize
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        else:
            vec[0] = 1.0
        return vec


embedding_service = EmbeddingService()
