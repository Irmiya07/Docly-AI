import json
from typing import List, Dict, Any

from app.services.llm import llm_service


class TimelineExtractor:
    """
    Extract important dates and timeline events from legal clauses.
    """

    def __init__(self):
        self.llm = llm_service

    def _build_prompt(
        self,
        clauses: List[Dict[str, Any]]
    ) -> str:
        """
        Build the prompt for timeline extraction.
        """

        return f"""
You are an expert legal contract analyst.

Extract every important timeline-related event from the contract.

For each event provide:

- event
- date
- description

Examples of events include:

- Contract Start
- Contract End
- Payment Deadline
- Delivery Date
- Renewal Date
- Notice Period
- Warranty Period
- Expiry Date
- Milestone

Return ONLY valid JSON.

Example:

[
    {{
        "event": "Contract Start",
        "date": "2026-01-01",
        "description": "Agreement begins."
    }},
    {{
        "event": "Payment Deadline",
        "date": "Within 30 days",
        "description": "Buyer must complete payment."
    }}
]

Clauses:

{json.dumps(clauses, indent=2)}
"""

    def extract(
        self,
        clauses: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]] | Dict[str, Any]:
        """
        Extract timeline events from contract clauses.
        """

        prompt = self._build_prompt(clauses)

        return self.llm.generate_json(prompt)


timeline_extractor = TimelineExtractor()