from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer


class EmbeddingService:
    """
    Service for generating embeddings using Sentence Transformers.
    """

    def __init__(self):
        # Load the model only once
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for a list of texts.

        Args:
            texts: List of text chunks.

        Returns:
            NumPy array of embeddings.
        """

        if not texts:
            return np.array([])

        embeddings = self.model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        return embeddings


# Singleton instance
embedding_service = EmbeddingService()