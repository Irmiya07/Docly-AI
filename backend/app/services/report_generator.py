from datetime import datetime
from typing import List, Dict, Any

from app.services.contract_analyzer import contract_analyzer
from app.services.comparator import comparator


class ReportGenerator:

    def _build_context(self, chunks: List[Dict[str, Any]]) -> str:
        """
        Formats retrieved chunks with page and source references into a bounded context string.
        """
        context = []
        for chunk in chunks:
            metadata = chunk.get("metadata", {})
            source = metadata.get("source", "Unknown")
            page = metadata.get("page", "Unknown")
            content = chunk.get("text", "")
            
            context.append(
                f"[Source: {source} | Page: {page}]\n"
                f"{content}"
            )
            
        return "\n\n-----------------------------\n\n".join(context)

    def generate_report(
        self,
        chunks: List[Dict[str, Any]],
        comparison_chunks: List[Dict[str, Any]] | None = None
    ) -> dict:

        bounded_context = self._build_context(chunks)
        analysis = contract_analyzer.analyze(bounded_context)

        clauses = analysis.get("clauses", [])
        risks = analysis.get("risks", [])
        timeline = analysis.get("timeline", [])

        comparison = None

        if comparison_chunks:

            comparison_context = self._build_context(comparison_chunks)
            comparison_analysis = contract_analyzer.analyze(
                comparison_context
            )

            comparison = comparator.compare(
                clauses,
                comparison_analysis.get("clauses", [])
            )

        return {

            "generated_at": datetime.now().isoformat(),

            "summary": {

                "total_clauses": len(clauses),

                "total_risks": len(risks),

                "timeline_events": len(timeline)

            },

            "clauses": clauses,

            "risks": risks,

            "timeline": timeline,

            "comparison": comparison

        }


report_generator = ReportGenerator()