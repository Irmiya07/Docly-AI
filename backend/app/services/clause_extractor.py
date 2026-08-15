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

        import re
        # Compress redundant whitespaces and newlines
        text = re.sub(r'\n\s*\n', '\n', text)
        text = re.sub(r' {2,}', ' ', text)
        
        # Truncate if unnecessarily large
        if len(text) > 50000:
            import logging
            logger = logging.getLogger("docly.clause_extractor")
            logger.warning(f"Input text too large ({len(text)} chars). Truncating to 50000.")
            text = text[:50000] + "\n\n[... Truncated for length limits ...]"

        prompt = self._build_prompt(text)

        return self.llm.generate_json(prompt)


clause_extractor = ClauseExtractor()