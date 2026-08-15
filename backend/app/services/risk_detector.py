import json
from typing import List, Dict, Any

from app.services.llm import llm_service


class RiskDetector:
    """
    Analyze legal clauses and identify potential risks.
    """

    def __init__(self):
        self.llm = llm_service

    def _build_prompt(
        self,
        clauses: List[Dict[str, Any]]
    ) -> str:
        """
        Build the prompt for legal risk analysis.
        """

        return f"""
You are an expert Legal Risk Analyst.

Analyze the following contract clauses.

For each clause identify:

1. Clause
2. Risk Level
   - Low
   - Medium
   - High
3. Reason
4. Recommendation

Return ONLY valid JSON.

Example:

[
    {{
        "clause": "Termination",
        "risk_level": "High",
        "reason": "Only one party can terminate the agreement.",
        "recommendation": "Provide equal termination rights to both parties."
    }}
]

Clauses:

{json.dumps(clauses, indent=2)}
"""

    def analyze(
        self,
        clauses: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]] | Dict[str, Any]:
        """
        Analyze clauses and return identified risks.
        """

        prompt = self._build_prompt(clauses)

        return self.llm.generate_json(prompt)


risk_detector = RiskDetector()