import json
import logging
import re
from typing import Dict, Any, List

from app.services.llm import llm_service


logger = logging.getLogger("docly.analyzer")


class ContractAnalyzer:
    """
    Analyze a contract using multiple smaller LLM requests.

    Splitting the contract prevents large Gemini requests from
    timing out and reduces memory/token usage.

    Returns:

    {
        "clauses": [...],
        "risks": [...],
        "timeline": [...]
    }
    """

    def __init__(
        self,
        max_chars_per_chunk: int = 12000,
    ):
        self.llm = llm_service
        self.max_chars_per_chunk = max_chars_per_chunk

    # ==================================================
    # CLEAN TEXT
    # ==================================================

    def clean_contract_text(
        self,
        text: str,
    ) -> str:

        if not text:
            return ""

        text = re.sub(
            r"\n\s*\n+",
            "\n",
            text,
        )

        text = re.sub(
            r"[ \t]{2,}",
            " ",
            text,
        )

        return text.strip()

    # ==================================================
    # SPLIT CONTRACT
    # ==================================================

    def _split_contract(
        self,
        text: str,
    ) -> List[str]:

        if len(text) <= self.max_chars_per_chunk:
            return [text]

        chunks = []

        start = 0
        text_length = len(text)

        while start < text_length:

            end = min(
                start + self.max_chars_per_chunk,
                text_length,
            )

            # Try to end at a paragraph/newline
            if end < text_length:

                newline_position = text.rfind(
                    "\n",
                    start,
                    end,
                )

                if (
                    newline_position > start
                    + self.max_chars_per_chunk // 2
                ):
                    end = newline_position

            chunk = text[start:end].strip()

            if chunk:
                chunks.append(chunk)

            start = end

        logger.info(
            "Contract split into %d analysis chunks.",
            len(chunks),
        )

        return chunks

    # ==================================================
    # ANALYSIS PROMPT
    # ==================================================

    def _build_prompt(
        self,
        contract_text: str,
        chunk_number: int,
        total_chunks: int,
    ) -> str:

        return f"""
You are an expert Legal AI Assistant.

Analyze ONLY the supplied contract context.

This is contract section {chunk_number} of {total_chunks}.

STRICT RULES:

1. Use ONLY information explicitly present in the supplied context.
2. Do NOT invent clauses, risks, dates, or events.
3. Do NOT use outside knowledge.
4. Extract only information actually present in this section.
5. Preserve dates exactly as they appear.
6. If no item exists, return an empty array.
7. Return ONLY valid JSON.
8. Do NOT use markdown.
9. Do NOT wrap the JSON in ```json.

Return EXACTLY this structure:

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

CONTRACT CONTEXT:

{contract_text}
"""

    # ==================================================
    # NORMALIZE RESULT
    # ==================================================

    def _normalize_result(
        self,
        result: Any,
    ) -> Dict[str, List]:

        if not isinstance(
            result,
            dict,
        ):
            return {
                "clauses": [],
                "risks": [],
                "timeline": [],
            }

        return {
            "clauses": (
                result.get("clauses", [])
                if isinstance(
                    result.get("clauses", []),
                    list,
                )
                else []
            ),
            "risks": (
                result.get("risks", [])
                if isinstance(
                    result.get("risks", []),
                    list,
                )
                else []
            ),
            "timeline": (
                result.get("timeline", [])
                if isinstance(
                    result.get("timeline", []),
                    list,
                )
                else []
            ),
        }

    # ==================================================
    # REMOVE DUPLICATES
    # ==================================================

    def _deduplicate(
        self,
        items: List[Dict[str, Any]],
        key_fields: List[str],
    ) -> List[Dict[str, Any]]:

        seen = set()
        unique = []

        for item in items:

            if not isinstance(
                item,
                dict,
            ):
                continue

            key = tuple(
                str(item.get(field, ""))
                .strip()
                .lower()
                for field in key_fields
            )

            if key in seen:
                continue

            seen.add(key)
            unique.append(item)

        return unique

    # ==================================================
    # ANALYZE
    # ==================================================

    def analyze(
        self,
        contract_text: str,
    ) -> Dict[str, Any]:

        cleaned_text = self.clean_contract_text(
            contract_text
        )

        if not cleaned_text:

            return {
                "clauses": [],
                "risks": [],
                "timeline": [],
            }

        contract_chunks = self._split_contract(
            cleaned_text
        )

        all_clauses = []
        all_risks = []
        all_timeline = []

        total_chunks = len(
            contract_chunks
        )

        for index, contract_chunk in enumerate(
            contract_chunks,
            start=1,
        ):

            logger.info(
                "Analyzing contract section %d/%d (%d chars)",
                index,
                total_chunks,
                len(contract_chunk),
            )

            prompt = self._build_prompt(
                contract_chunk,
                index,
                total_chunks,
            )

            try:

                result = self.llm.generate_json(
                    prompt
                )

                result = self._normalize_result(
                    result
                )

                all_clauses.extend(
                    result["clauses"]
                )

                all_risks.extend(
                    result["risks"]
                )

                all_timeline.extend(
                    result["timeline"]
                )

                logger.info(
                    "Section %d/%d completed.",
                    index,
                    total_chunks,
                )

            except Exception as error:

                logger.error(
                    "Contract section %d/%d failed: %s",
                    index,
                    total_chunks,
                    error,
                )

                # Continue processing remaining
                # sections instead of losing the
                # entire analysis.
                continue

        # ==================================================
        # DEDUPLICATE RESULTS
        # ==================================================

        all_clauses = self._deduplicate(
            all_clauses,
            [
                "title",
                "content",
            ],
        )

        all_risks = self._deduplicate(
            all_risks,
            [
                "clause",
                "reason",
            ],
        )

        all_timeline = self._deduplicate(
            all_timeline,
            [
                "event",
                "date",
                "description",
            ],
        )

        logger.info(
            "Analysis completed: clauses=%d risks=%d timeline=%d",
            len(all_clauses),
            len(all_risks),
            len(all_timeline),
        )

        return {
            "clauses": all_clauses,
            "risks": all_risks,
            "timeline": all_timeline,
        }


contract_analyzer = ContractAnalyzer()