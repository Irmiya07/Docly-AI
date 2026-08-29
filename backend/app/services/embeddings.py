import logging
from typing import List, Optional

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger("docly.embeddings")


class EmbeddingService:
    """
    Service for generating embeddings using Sentence Transformers.

    The model is loaded lazily so that FastAPI startup does not
    immediately allocate the embedding model in memory.
    """

    def __init__(self):
        self.model: Optional[SentenceTransformer] = None

    def _get_model(self) -> SentenceTransformer:
        """
        Load the embedding model only when embeddings are required.
        """

        if self.model is None:
            logger.info("Loading embedding model...")

            self.model = SentenceTransformer(
                "all-MiniLM-L6-v2",
                device="cpu"
            )

            logger.info("Embedding model loaded.")

        return self.model

    def generate_embeddings(
        self,
        texts: List[str]
    ) -> np.ndarray:
        """
        Generate embeddings for a list of texts.
        """

        if not texts:
            return np.array([])
        
        logger.info("EMBEDDING START")
        logger.info(f"Generating embeddings for {len(texts)} texts")

        model = self._get_model()

        embeddings = model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
            batch_size=4,
        )
        logger.info("EMBEDDING COMPLETE")
        return embeddings


embedding_service = EmbeddingService()