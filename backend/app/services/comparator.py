import json
from typing import List, Dict, Any

from app.services.llm import llm_service


class Comparator:
    """
    Compare two legal documents using a single Gemini request.
    """

    def __init__(self):
        self.llm = llm_service

    def _build_prompt(
        self,
        document_a: List[Dict[str, Any]],
        document_b: List[Dict[str, Any]]
    ) -> str:
        """
        Build a comparison prompt using relevant chunks
        from both documents.
        """

        return f"""
You are an expert legal contract comparison assistant.

Compare Document A and Document B.

Use ONLY the information provided in the document contexts.

Identify important differences in:

- Payment terms
- Termination
- Liability
- Indemnity
- Confidentiality
- Warranty
- Delivery
- Intellectual Property
- Renewal
- Governing Law
- Dispute Resolution
- Obligations
- Other materially important clauses

For each important clause, determine its status:

- Same
- Modified
- Added
- Removed

For every result return:

- clause
- status
- differences
- legal_impact
- source_a
- page_a
- source_b
- page_b

Rules:

1. Do not invent information.
2. Use only the supplied document context.
3. If a clause exists only in Document A, mark it as "Removed".
4. If a clause exists only in Document B, mark it as "Added".
5. If the clause exists in both but has changed, mark it as "Modified".
6. If there is no meaningful difference, mark it as "Same".
7. Keep differences concise.
8. Keep legal_impact concise.
9. Preserve source and page information.
10. Return ONLY valid JSON.
11. Do not return markdown code fences.

Expected JSON format:

[
    {{
        "clause": "Payment Terms",
        "status": "Modified",
        "differences": "Payment period changed from 30 days to 45 days.",
        "legal_impact": "The buyer receives an additional 15 days to make payment.",
        "source_a": "contract_a.pdf",
        "page_a": 3,
        "source_b": "contract_b.pdf",
        "page_b": 4
    }}
]

DOCUMENT A:

{json.dumps(document_a, indent=2, ensure_ascii=False)}

DOCUMENT B:

{json.dumps(document_b, indent=2, ensure_ascii=False)}
"""

    def compare_documents(
        self,
        document_a: List[Dict[str, Any]],
        document_b: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]] | Dict[str, Any]:
        """
        Compare two documents using ONE Gemini request.
        """

        if not document_a:
            return {
                "error": "No relevant content found for Document A."
            }

        if not document_b:
            return {
                "error": "No relevant content found for Document B."
            }

        prompt = self._build_prompt(
            document_a,
            document_b
        )

        return self.llm.generate_json(prompt)


comparator = Comparator()