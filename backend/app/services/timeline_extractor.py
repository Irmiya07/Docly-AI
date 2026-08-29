import json
import logging
from typing import List, Dict, Any

from app.services.llm import llm_service


logger = logging.getLogger("docly.timeline")


class TimelineExtractor:
    """
    Extract timeline events directly from contract text.

    This is intentionally separate from the full contract analyzer
    so Timeline does not ask Gemini to generate clauses and risks.
    """

    def __init__(self):
        self.llm = llm_service

    def _build_prompt(
        self,
        contract_text: str,
    ) -> str:

        return f"""
You are an expert legal contract analyst.

Extract ONLY important timeline events explicitly stated
in the supplied contract.

Do NOT analyze risks.
Do NOT extract clauses.
Do NOT use outside knowledge.
Do NOT invent dates or events.

Extract events such as:

- Contract Start
- Contract End
- Payment Deadline
- Delivery Date
- Renewal Date
- Notice Period
- Warranty Period
- Expiry Date
- Milestone
- Termination Date

For every event return:

- event
- date
- description

Preserve dates and time periods exactly as written.

If there are no timeline events, return an empty array.

Return ONLY valid JSON.

Expected format:

[
  {{
    "event": "Contract Start",
    "date": "January 1, 2026",
    "description": "The agreement begins on January 1, 2026."
  }}
]

CONTRACT:

{contract_text}
"""

    def extract(
        self,
        contract_text: str,
    ) -> List[Dict[str, Any]]:

        if not contract_text or not contract_text.strip():
            return []

        prompt = self._build_prompt(
            contract_text
        )

        result = self.llm.generate_json(
            prompt
        )

        # Gemini should return a list.
        if isinstance(result, list):
            return result

        # Safety if Gemini returns:
        # {"timeline": [...]}
        if isinstance(result, dict):

            timeline = result.get(
                "timeline",
                []
            )

            if isinstance(
                timeline,
                list
            ):
                return timeline

        logger.warning(
            "Unexpected timeline response: %s",
            type(result).__name__,
        )

        return []


timeline_extractor = TimelineExtractor()