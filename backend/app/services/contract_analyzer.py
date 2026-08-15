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

Analyze the following contract context.

Strict Instructions:
1. ONLY use the supplied contract context. Do NOT invent clauses, risks, or timeline events.
2. Do NOT infer information that isn't directly present in the context.
3. Preserve dates exactly as they appear in the contract.
4. For each extracted clause, risk, and timeline event, determine which page it was found on (based on the '[Source: ... | Page: ...]' headers in the context), and prepend the reference to the text/content field. For example:
   - For clauses content: "[Page 3] The buyer shall pay..."
   - For risks reason: "[Page 5] Only one party holds termination rights..."
   - For timeline descriptions: "[Page 2] Delivery of services must be completed..."

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

Contract Context:

{contract_text}
"""

    def clean_contract_text(self, text: str, max_chars: int = 50000) -> str:
        """
        Compress whitespace and truncate text to prevent excessive token use.
        """
        import re
        # Remove consecutive empty lines and excessive spaces
        text = re.sub(r'\n\s*\n', '\n', text)
        text = re.sub(r' {2,}', ' ', text)
        
        if len(text) > max_chars:
            import logging
            logger = logging.getLogger("docly.analyzer")
            logger.warning(f"Contract text too large ({len(text)} chars). Truncating to {max_chars}.")
            text = text[:max_chars] + "\n\n[... Remaining contract text has been truncated for length limits ...]"
        return text.strip()

    def analyze(
        self,
        contract_text: str
    ) -> Dict[str, Any]:
        cleaned_text = self.clean_contract_text(contract_text)
        prompt = self._build_prompt(cleaned_text)

        return self.llm.generate_json(prompt)


contract_analyzer = ContractAnalyzer()