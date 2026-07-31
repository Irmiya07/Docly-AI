import json
from typing import List, Dict, Any

from app.services.llm import llm_service


class Comparator:
    """
    Compare two legal documents clause by clause.
    """

    def __init__(self):
        self.llm = llm_service

    def _build_prompt(
        self,
        clauses_doc1: List[Dict[str, Any]],
        clauses_doc2: List[Dict[str, Any]]
    ) -> str:

        return f"""
You are an expert legal contract comparison assistant.

Compare the clauses from Document A and Document B.

For each clause identify:

- clause
- status
    - Same
    - Modified
    - Added
    - Removed
- differences
- legal_impact

Return ONLY valid JSON.

Example:

[
    {{
        "clause": "Payment Terms",
        "status": "Modified",
        "differences": "Payment changed from 30 days to 45 days.",
        "legal_impact": "Buyer receives an additional 15 days for payment."
    }}
]

Document A:

{json.dumps(clauses_doc1, indent=2)}

Document B:

{json.dumps(clauses_doc2, indent=2)}
"""

    def compare(
        self,
        clauses_doc1: List[Dict[str, Any]],
        clauses_doc2: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]] | Dict[str, Any]:

        prompt = self._build_prompt(
            clauses_doc1,
            clauses_doc2
        )

        response = self.llm.generate(prompt)

        try:
            return self.llm.generate_json(prompt)

        except json.JSONDecodeError:

            return {
                "error": "Invalid JSON returned by the LLM.",
                "raw_response": response
            }


comparator = Comparator()