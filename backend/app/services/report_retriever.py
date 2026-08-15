from typing import List, Dict, Any, Optional
import logging
from app.services.retriever import retriever
from app.config import (
    CLAUSE_TOP_K,
    RISK_TOP_K,
    TIMELINE_TOP_K,
    MAX_REPORT_CHUNKS,
    MAX_CONTEXT_CHARS
)

logger = logging.getLogger("docly.report_retriever")

class ReportRetriever:
    # Configurable Top K and Limits from environment configurations
    CLAUSE_TOP_K = CLAUSE_TOP_K
    RISK_TOP_K = RISK_TOP_K
    TIMELINE_TOP_K = TIMELINE_TOP_K
    MAX_REPORT_CHUNKS = MAX_REPORT_CHUNKS
    MAX_CONTEXT_CHARS = MAX_CONTEXT_CHARS

    # Queries
    CLAUSE_QUERY = (
        "Important contract clauses including payment, "
        "termination, confidentiality, liability, "
        "indemnity, warranty, delivery, "
        "intellectual property, governing law, "
        "dispute resolution, renewal and obligations."
    )

    RISK_QUERY = (
        "Contract provisions that may create legal, "
        "financial, operational, compliance, "
        "liability or commercial risks including "
        "penalties, indemnity, termination, "
        "breach, default, warranty and limitation "
        "of liability."
    )

    TIMELINE_QUERY = (
        "Contract dates, deadlines, periods, "
        "payment deadlines, delivery dates, "
        "effective dates, expiry dates, "
        "renewal dates, termination notice periods, "
        "warranty periods and milestones."
    )

    def retrieve_report_content(self, user_id: str, filename: str) -> List[Dict[str, Any]]:
        """
        Retrieves report-specific chunks from ChromaDB for clauses, risks, and timelines,
        deduplicates them, and restricts them to the MAX_REPORT_CHUNKS and MAX_CONTEXT_CHARS.
        """
        filters = {"source": filename}
        logger.info(
            f"Retrieving report content for user {user_id}, doc {filename}. "
            f"Limits: top_k={self.CLAUSE_TOP_K}/{self.RISK_TOP_K}/{self.TIMELINE_TOP_K}"
        )

        clause_chunks = retriever.retrieve(
            query=self.CLAUSE_QUERY,
            user_id=user_id,
            top_k=self.CLAUSE_TOP_K,
            filters=filters
        )
        risk_chunks = retriever.retrieve(
            query=self.RISK_QUERY,
            user_id=user_id,
            top_k=self.RISK_TOP_K,
            filters=filters
        )
        timeline_chunks = retriever.retrieve(
            query=self.TIMELINE_QUERY,
            user_id=user_id,
            top_k=self.TIMELINE_TOP_K,
            filters=filters
        )

        logger.info(
            f"Retrieved counts - Clauses: {len(clause_chunks)}, Risks: {len(risk_chunks)}, "
            f"Timelines: {len(timeline_chunks)}"
        )

        # Round-robin list deduplication to ensure balanced context
        unique_chunks = []
        seen = set()

        max_len = max(len(clause_chunks), len(risk_chunks), len(timeline_chunks))
        for i in range(max_len):
            for chunks_list in (clause_chunks, risk_chunks, timeline_chunks):
                if i < len(chunks_list):
                    chunk = chunks_list[i]
                    metadata = chunk.get("metadata", {})
                    # Identity key: (source, page, chunk_index)
                    key = (
                        metadata.get("source"),
                        metadata.get("page"),
                        metadata.get("chunk_index")
                    )
                    if key not in seen:
                        seen.add(key)
                        unique_chunks.append(chunk)

        # Apply maximum chunk limit
        limited_chunks = unique_chunks[:self.MAX_REPORT_CHUNKS]

        # Apply maximum character limit
        final_chunks = []
        current_chars = 0
        for chunk in limited_chunks:
            text = chunk.get("text", "")
            text_len = len(text)
            if current_chars + text_len > self.MAX_CONTEXT_CHARS:
                # If first chunk is too large, truncate it so we fit within MAX_CONTEXT_CHARS.
                # Otherwise, stop adding more chunks.
                if not final_chunks:
                    chunk_copy = dict(chunk)
                    chunk_copy["text"] = text[:self.MAX_CONTEXT_CHARS]
                    final_chunks.append(chunk_copy)
                break
            final_chunks.append(chunk)
            current_chars += text_len

        logger.info(
            f"Deduplicated to {len(unique_chunks)} unique chunks. "
            f"Clamped to {len(final_chunks)} chunks, totaling {current_chars} characters."
        )

        return final_chunks

report_retriever = ReportRetriever()
