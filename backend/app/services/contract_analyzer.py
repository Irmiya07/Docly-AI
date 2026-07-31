import json
from typing import Dict, Any

from app.services.llm import llm_service


class ContractAnalyzer:
    """
    Analyze an entire contract in a single LLM call.

    Returns:
    {
        "clauses": [...],
        "risks": [...],
        "timeline": [...]
    }
    """

    def __init__(self):
        self.llm = llm_service

    def _build_prompt(self, contract_text: str) -> str:

        return f"""
You are an expert Legal AI Assistant.

Analyze the following contract.

Return ONLY valid JSON.

Do NOT use markdown.

Do NOT wrap the response inside ```json.

The response must follow EXACTLY this schema:

{{
  "clauses": [
    {{
      "title": "string",
      "category": "string",
      "content": "string"
    }}
  ],

  "risks": [
    {{
      "clause": "string",
      "risk_level": "Low | Medium | High",
      "reason": "string",
      "recommendation": "string"
    }}
  ],

  "timeline": [
    {{
      "event": "string",
      "date": "string",
      "description": "string"
    }}
  ]
}}

Contract:

{contract_text}
"""

    def analyze(
        self,
        contract_text: str
    ) -> Dict[str, Any]:

        prompt = self._build_prompt(contract_text)

        return self.llm.generate_json(prompt)


contract_analyzer = ContractAnalyzer()