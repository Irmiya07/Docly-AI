from datetime import datetime

from app.services.contract_analyzer import contract_analyzer
from app.services.comparator import comparator


class ReportGenerator:

    def generate_report(
        self,
        contract_text: str,
        comparison_text: str | None = None
    ) -> dict:

        analysis = contract_analyzer.analyze(contract_text)

        clauses = analysis.get("clauses", [])
        risks = analysis.get("risks", [])
        timeline = analysis.get("timeline", [])

        comparison = None

        if comparison_text:

            comparison_analysis = contract_analyzer.analyze(
                comparison_text
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