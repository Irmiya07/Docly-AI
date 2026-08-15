from typing import List, Dict, Any


class CitationService:
    """
    Service responsible for formatting citations.
    """

    def format_sources(
        self,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Extract unique citations from retrieved chunks.
        """

        citations = []
        seen = set()

        for chunk in retrieved_chunks:

            metadata = chunk.get("metadata", {})

            source = metadata.get("source", "Unknown")
            page = metadata.get("page", 1)
            chunk_index = metadata.get("chunk_index", 0)

            key = (source, page)

            if key not in seen:

                seen.add(key)

                citations.append({
                    "source": source,
                    "page": page,
                    "chunk_index": chunk_index,
                    "text": chunk.get("text", "")
                })

        citations.sort(
            key=lambda item: (
                item["source"],
                item["page"],
                item["chunk_index"]
            )
        )

        return citations

    def format_text(
        self,
        citations: List[Dict[str, Any]]
    ) -> str:
        """
        Convert citations into readable text.
        """

        return "\n".join(
            f'{citation["source"]} (Page {citation["page"]})'
            for citation in citations
        )


citation_service = CitationService()