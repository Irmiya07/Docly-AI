import json
import logging
import re
from typing import Any, Dict, List

import httpx
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types
# pyrefly: ignore [missing-import]
from google.genai.errors import APIError
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

from app.config import (
    GEMINI_API_KEY_1,
    GEMINI_API_KEY_2,
    MODEL_NAME,
)


logger = logging.getLogger("docly.llm")


class GeminiQuotaExceededError(Exception):
    """Raised when all configured Gemini API keys have exhausted quota."""

    pass


def get_error_code(error: Exception):
    """Safely get Gemini HTTP status code."""

    return getattr(error, "code", None)


def is_quota_error(error: Exception) -> bool:
    """
    Detect Gemini quota/rate-limit errors.
    """

    if isinstance(error, APIError):

        code = get_error_code(error)

        if code == 429:
            return True

        message = (
            getattr(error, "message", "")
            or str(error)
        ).lower()

        quota_keywords = (
            "resource_exhausted",
            "resource exhausted",
            "quota exceeded",
            "rate limit",
            "generaterequestsperdayperproject",
            "too many requests",
        )

        return any(
            keyword in message
            for keyword in quota_keywords
        )

    return False


def is_transient_error(error: Exception) -> bool:
    """
    Errors that can temporarily recover and should be retried.
    """

    if is_quota_error(error):
        return False

    if isinstance(error, APIError):

        code = get_error_code(error)

        return code in {
            500,
            502,
            503,
            504,
        }

    if isinstance(error, httpx.HTTPError):
        return True

    if isinstance(
        error,
        (
            TimeoutError,
            ConnectionError,
        ),
    ):
        return True

    message = str(error).lower()

    return any(
        keyword in message
        for keyword in (
            "timeout",
            "connect",
            "handshake",
            "ssl",
        )
    )


def log_retry(retry_state):
    """
    Log retry attempts without exposing sensitive information.
    """

    error = retry_state.outcome.exception()

    logger.warning(
        "Gemini transient retry %d/2: %s",
        retry_state.attempt_number,
        error,
    )


class LLMService:
    """
    Central Gemini service.

    Supports:

    - Multiple API keys
    - Quota failover
    - Limited transient retries
    - JSON generation
    - RAG answer generation
    """

    def __init__(self):

        self.clients = []
        self.client_names = []

        # ---------------------------------------------
        # API KEY 1
        # ---------------------------------------------

        if GEMINI_API_KEY_1:

            self.clients.append(
                genai.Client(
                    api_key=GEMINI_API_KEY_1,
                    http_options=types.HttpOptions(
                        timeout=30000
                    ),
                )
            )

            self.client_names.append(
                "API Key 1"
            )

        # ---------------------------------------------
        # API KEY 2
        # ---------------------------------------------

        if GEMINI_API_KEY_2:

            self.clients.append(
                genai.Client(
                    api_key=GEMINI_API_KEY_2,
                    http_options=types.HttpOptions(
                        timeout=30000
                    ),
                )
            )

            self.client_names.append(
                "API Key 2"
            )

        self.model = MODEL_NAME

        # Backward compatibility
        self.client = (
            self.clients[0]
            if self.clients
            else None
        )

        logger.info(
            "LLMService initialized with %d Gemini client(s). Model=%s",
            len(self.clients),
            self.model,
        )

    # =================================================
    # SINGLE CLIENT REQUEST
    # =================================================

    @retry(
        retry=retry_if_exception(
            is_transient_error
        ),
        stop=stop_after_attempt(2),
        wait=wait_exponential(
            multiplier=1,
            min=1,
            max=3,
        ),
        before_sleep=log_retry,
        reraise=True,
    )
    def _generate_with_client(
        self,
        client: genai.Client,
        prompt: str,
    ) -> str:
        """
        Make a Gemini request.

        Transient errors such as 503/504 are retried once.

        429 is NOT retried here.
        """

        response = client.models.generate_content(
            model=self.model,
            contents=prompt,
        )

        if not response.text:

            raise RuntimeError(
                "Gemini returned an empty response."
            )

        return response.text.strip()

    # =================================================
    # MAIN GENERATE
    # =================================================

    def generate(
        self,
        prompt: str,
    ) -> str:
        """
        Generate text with automatic API-key failover.

        Behavior:

        429:
            Immediately switch to next key.

        503/504:
            Retry current key once.
            If still failing, try next key.

        Timeout:
            Retry current key once.
            If still failing, try next key.

        400/403/404:
            Do not retry or switch keys.
        """

        if not prompt.strip():

            raise ValueError(
                "Prompt cannot be empty."
            )

        if not self.clients:

            raise RuntimeError(
                "No Gemini API clients configured."
            )

        last_error = None

        # ---------------------------------------------
        # Try each configured key
        # ---------------------------------------------

        for index, (
            client,
            client_name,
        ) in enumerate(
            zip(
                self.clients,
                self.client_names,
            )
        ):

            logger.info(
                "Gemini request: key=%s model=%s prompt_chars=%d",
                client_name,
                self.model,
                len(prompt),
            )

            try:

                result = self._generate_with_client(
                    client,
                    prompt,
                )

                logger.info(
                    "Gemini request successful using %s",
                    client_name,
                )

                return result

            except Exception as error:

                last_error = error

                code = get_error_code(
                    error
                )

                # -------------------------------------
                # QUOTA
                # -------------------------------------

                if is_quota_error(error):

                    logger.warning(
                        "%s quota exceeded. "
                        "Trying next API key.",
                        client_name,
                    )

                    continue

                # -------------------------------------
                # TRANSIENT ERROR
                # -------------------------------------

                if is_transient_error(error):

                    logger.warning(
                        "%s failed with transient "
                        "error after retry: %s",
                        client_name,
                        error,
                    )

                    # Try another configured key
                    # if one exists.
                    continue

                # -------------------------------------
                # MODEL NOT FOUND
                # -------------------------------------

                if code == 404:

                    logger.error(
                        "Gemini model '%s' is unavailable.",
                        self.model,
                    )

                    raise error

                # -------------------------------------
                # PERMANENT ERROR
                # -------------------------------------

                logger.error(
                    "Gemini request failed using %s: %s",
                    client_name,
                    error,
                )

                raise error

        # ---------------------------------------------
        # ALL KEYS FAILED
        # ---------------------------------------------

        if last_error and is_quota_error(
            last_error
        ):

            logger.error(
                "All Gemini API keys have "
                "exhausted their quota."
            )

            raise GeminiQuotaExceededError(
                "Gemini API quota has been "
                "reached on all configured keys."
            )

        # If all keys failed because of transient
        # errors, return the last error.

        if last_error:

            raise last_error

        raise RuntimeError(
            "Gemini generation failed."
        )

    # =================================================
    # JSON GENERATION
    # =================================================

    def generate_json(
        self,
        prompt: str,
    ) -> Any:
        """
        Generate and parse JSON from Gemini.
        """

        response = self.generate(
            prompt
        )

        # Remove ```json
        response = re.sub(
            r"^```(?:json)?\s*",
            "",
            response.strip(),
            flags=re.IGNORECASE,
        )

        # Remove ```
        response = re.sub(
            r"\s*```$",
            "",
            response.strip(),
        )

        try:

            return json.loads(
                response
            )

        except json.JSONDecodeError as error:

            logger.error(
                "Gemini returned invalid JSON: %s",
                error,
            )

            return {
                "error": (
                    "Invalid JSON returned "
                    "by the LLM."
                ),
                "raw_response": response,
            }

    # =================================================
    # BUILD RAG CONTEXT
    # =================================================

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

            context.append(
                f"""
Source: {source}
Page: {page}

Content:
{chunk.get("text", "")}
"""
            )

        return (
            "\n-----------------------------\n"
            .join(context)
        )

    # =================================================
    # BUILD RAG PROMPT
    # =================================================

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

    # =================================================
    # RAG ANSWER
    # =================================================

    def generate_answer(
        self,
        question: str,
        retrieved_chunks: List[
            Dict[str, Any]
        ],
    ) -> str:

        if not question.strip():

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


llm_service = LLMService()