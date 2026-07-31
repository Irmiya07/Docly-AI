from typing import List, Dict, Any, Optional

from app.services.embeddings import embedding_service
from app.services.vector_store import vector_store


class Retriever:
    """
    Retrieves the most relevant document chunks from the vector store.
    """

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve the top-k relevant chunks for a user query.

        Args:
            query: User question.
            top_k: Number of chunks to retrieve.
            filters: Optional metadata filters.

        Returns:
            List of retrieved chunks.
        """

        if not query.strip():
            return []

        # Generate embedding
        query_embedding = (
            embedding_service
            .generate_embeddings([query])[0]
            .tolist()
        )

        # Search vector database
        results = vector_store.search(
            query_embedding=query_embedding,
            n_results=top_k,
            where=filters
        )

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        retrieved_chunks = []

        for document, metadata, distance in zip(
            documents,
            metadatas,
            distances
        ):

            retrieved_chunks.append(
                {
                    "text": document,
                    "metadata": metadata,
                    "distance": distance
                }
            )

        return retrieved_chunks


retriever = Retriever()