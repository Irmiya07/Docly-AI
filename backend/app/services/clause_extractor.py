import json
from typing import List, Dict, Any

from app.services.llm import llm_service


class ClauseExtractor:
    """
    Extract legal clauses from a contract.
    """

    def __init__(self):
        self.llm = llm_service

    def _build_prompt(
        self,
        text: str
    ) -> str:

        return f"""
You are an expert Legal AI Assistant.

Extract all important legal clauses from the following contract.

For each clause provide:

- title
- category
- content

Return ONLY valid JSON.

Example:

[
    {{
        "title": "Payment Terms",
        "category": "Financial",
        "content": "Payment shall be made within 30 days."
    }},
    {{
        "title": "Termination",
        "category": "Termination",
        "content": "Either party may terminate with 60 days notice."
    }}
]

Contract:

{text}
"""

    def extract_clauses(
        self,
        text: str
    ) -> List[Dict[str, Any]] | Dict[str, Any]:

        prompt = self._build_prompt(text)

        response = self.llm.generate(prompt)

        try:
            return self.llm.generate_json(prompt)

        except json.JSONDecodeError:

            return {
                "error": "Invalid JSON returned by the LLM.",
                "raw_response": response
            }


clause_extractor = ClauseExtractor()