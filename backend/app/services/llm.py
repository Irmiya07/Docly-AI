import logging
import json
from typing import Any, Dict, List

import httpx
from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.config import (
    GEMINI_API_KEY_1,
    GEMINI_API_KEY_2,
    MODEL_NAME,
)


logger = logging.getLogger("docly.llm")


class GeminiQuotaExceededError(Exception):
    """Raised when all configured Gemini API keys have exhausted quota."""
    pass


class LLMService:

    def __init__(self):

        self.clients = []

        keys = [
            GEMINI_API_KEY_1,
            GEMINI_API_KEY_2,
        ]

        for key in keys:

            if key:

                self.clients.append(
                    genai.Client(
                        api_key=key,
                        http_options=types.HttpOptions(
                            timeout=60000
                        ),
                    )
                )

        self.model = MODEL_NAME

        logger.info(
            "LLM initialized: clients=%d model=%s",
            len(self.clients),
            self.model,
        )

    # ==================================================
    # ERROR HELPERS
    # ==================================================

    @staticmethod
    def _get_error_code(error: Exception):

        return getattr(
            error,
            "code",
            None,
        )

    @staticmethod
    def _is_quota_error(
        error: Exception,
    ) -> bool:

        if isinstance(
            error,
            APIError,
        ):

            code = getattr(
                error,
                "code",
                None,
            )

            if code == 429:
                return True

            message = (
                getattr(
                    error,
                    "message",
                    "",
                )
                or str(error)
            ).lower()

            quota_keywords = (
                "quota",
                "resource_exhausted",
                "rate limit",
                "too many requests",
                "generaterequestsperdayperproject",
            )

            return any(
                keyword in message
                for keyword in quota_keywords
            )

        return False

    @staticmethod
    def _is_transient_error(
        error: Exception,
    ) -> bool:

        if isinstance(
            error,
            APIError,
        ):

            code = getattr(
                error,
                "code",
                None,
            )

            # Do NOT retry 504 here.
            return code in {
                500,
                502,
                503,
            }

        if isinstance(
            error,
            (
                httpx.TimeoutException,
                TimeoutError,
                ConnectionError,
            ),
        ):

            return True

        message = str(
            error
        ).lower()

        return any(
            keyword in message
            for keyword in (
                "timeout",
                "connection",
                "handshake",
                "temporarily unavailable",
            )
        )

    # ==================================================
    # GEMINI REQUEST
    # ==================================================

    def _generate_with_client(
        self,
        client: genai.Client,
        prompt: str,
    ) -> str:

        logger.info(
            "Gemini request started: model=%s prompt_chars=%d",
            self.model,
            len(prompt),
        )

        response = client.models.generate_content(
            model=self.model,
            contents=prompt,
        )

        if not response.text:

            raise RuntimeError(
                "Gemini returned an empty response."
            )

        logger.info(
            "Gemini request completed successfully."
        )

        return response.text.strip()

    # ==================================================
    # NORMAL TEXT GENERATION
    # ==================================================

    def generate(
        self,
        prompt: str,
    ) -> str:

        if not prompt or not prompt.strip():

            raise ValueError(
                "Prompt cannot be empty."
            )

        if not self.clients:

            raise RuntimeError(
                "No Gemini API clients configured."
            )

        last_error = None

        for index, client in enumerate(
            self.clients,
            start=1,
        ):

            logger.info(
                "Trying Gemini client %d/%d",
                index,
                len(self.clients),
            )

            try:

                return self._generate_with_client(
                    client,
                    prompt,
                )

            except Exception as error:

                last_error = error

                code = self._get_error_code(
                    error
                )

                logger.error(
                    "Gemini client %d failed. code=%s error=%s",
                    index,
                    code,
                    error,
                )

                # ----------------------------------
                # QUOTA
                # ----------------------------------

                if self._is_quota_error(
                    error
                ):

                    logger.warning(
                        "Gemini quota exceeded. "
                        "Trying next API key."
                    )

                    continue

                # ----------------------------------
                # TRANSIENT SERVER ERROR
                # ----------------------------------

                if self._is_transient_error(
                    error
                ):

                    logger.warning(
                        "Transient Gemini error. "
                        "Trying next API key if available."
                    )

                    continue

                # ----------------------------------
                # 504 TIMEOUT
                # ----------------------------------

                if code == 504:

                    logger.error(
                        "Gemini request timed out."
                    )

                    raise RuntimeError(
                        "Gemini took too long to respond. "
                        "Please try again."
                    )

                # ----------------------------------
                # INVALID MODEL / REQUEST
                # ----------------------------------

                if code in {
                    400,
                    404,
                }:

                    logger.error(
                        "Gemini configuration/model error: %s",
                        error,
                    )

                    raise RuntimeError(
                        "Gemini model or request "
                        "configuration is invalid."
                    )

                # ----------------------------------
                # AUTHORIZATION
                # ----------------------------------

                if code == 403:

                    logger.error(
                        "Gemini API key was rejected."
                    )

                    continue

                # ----------------------------------
                # UNKNOWN ERROR
                # ----------------------------------

                raise error

        # ==================================================
        # ALL CLIENTS FAILED
        # ==================================================

        if last_error is not None:

            if self._is_quota_error(
                last_error
            ):

                raise GeminiQuotaExceededError(
                    "All configured Gemini API keys "
                    "have exhausted their quota."
                )

            raise RuntimeError(
                f"Gemini request failed: {last_error}"
            )

        raise RuntimeError(
            "Gemini generation failed."
        )

    # ==================================================
    # RAG CONTEXT
    # ==================================================

    def _build_context(
        self,
        retrieved_chunks: List[
            Dict[str, Any]
        ],
    ) -> str:

        context = []

        for chunk in retrieved_chunks:

            metadata = chunk.get(
                "metadata",
                {},
            )

            source = metadata.get(
                "source",
                "Unknown",
            )

            page = metadata.get(
                "page",
                "Unknown",
            )

            text = chunk.get(
                "text",
                "",
            )

            context.append(
                f"""
Source: {source}
Page: {page}

Content:
{text}
"""
            )

        return (
            "\n-----------------------------\n"
            .join(context)
        )

    # ==================================================
    # RAG PROMPT
    # ==================================================

    def _build_prompt(
        self,
        question: str,
        retrieved_chunks: List[
            Dict[str, Any]
        ],
    ) -> str:

        context = self._build_context(
            retrieved_chunks
        )

        return f"""
You are an AI Legal Assistant.

Answer ONLY using the provided context.

Do not use outside knowledge.

If the answer cannot be found in the context,
reply exactly:

"I couldn't find this information in the uploaded documents."

Always mention the source document and page number.

Context:
{context}

Question:
{question}

Answer:
"""

    # ==================================================
    # RAG ANSWER
    # ==================================================

    def generate_answer(
        self,
        question: str,
        retrieved_chunks: List[
            Dict[str, Any]
        ],
    ) -> str:

        if not question or not question.strip():

            return (
                "Please enter a question."
            )

        if not retrieved_chunks:

            return (
                "I couldn't find this information "
                "in the uploaded documents."
            )

        prompt = self._build_prompt(
            question,
            retrieved_chunks,
        )

        return self.generate(
            prompt
        )

    # ==================================================
    # JSON GENERATION
    # IMPORTANT: MUST BE INSIDE LLMService
    # ==================================================

    def generate_json(
        self,
        prompt: str,
    ) -> Any:

        if not prompt or not prompt.strip():

            raise ValueError(
                "Prompt cannot be empty."
            )

        response = self.generate(
            prompt
        )

        response = response.strip()

        # ----------------------------------
        # Remove markdown code fences
        # ----------------------------------

        if response.startswith(
            "```json"
        ):

            response = response[
                len("```json"):
            ].strip()

        elif response.startswith(
            "```"
        ):

            response = response[
                len("```"):
            ].strip()

        if response.endswith(
            "```"
        ):

            response = response[
                :-len("```")
            ].strip()

        # ----------------------------------
        # Parse JSON
        # ----------------------------------

        try:

            return json.loads(
                response
            )

        except json.JSONDecodeError as error:

            logger.error(
                "Gemini returned invalid JSON: %s",
                error,
            )

            logger.error(
                "Raw Gemini response: %s",
                response[:2000],
            )

            raise RuntimeError(
                "Gemini returned invalid JSON."
            ) from error


# ==================================================
# SINGLE LLM SERVICE INSTANCE
# ==================================================

llm_service = LLMService()