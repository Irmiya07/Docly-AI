import logging
import httpx
from google import genai
from google.genai import types

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

        for key in [GEMINI_API_KEY_1, GEMINI_API_KEY_2]:
            if key:
                self.clients.append(
                    genai.Client(
                        api_key=key,
                        http_options=types.HttpOptions(
                            timeout=20000
                        )
                    )
                )

        self.model = MODEL_NAME

    def generate(self, prompt: str) -> str:

        if not prompt.strip():
            raise ValueError("Prompt cannot be empty.")

        if not self.clients:
            raise RuntimeError(
                "No Gemini API clients configured."
            )

        last_error = None

        for client in self.clients:

            try:
                logger.info("GEMINI REQUEST START")
                logger.info(
                    "Calling Gemini model=%s prompt_chars=%d",
                    self.model,
                    len(prompt)
                )

                response = client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                )

                logger.info("GEMINI RESPONSE COMPLETE")

                if not response.text:
                    raise RuntimeError(
                        "Gemini returned an empty response."
                    )

                return response.text.strip()

            except (httpx.HTTPError, TimeoutError) as e:
                last_error = e
                logger.warning(
                    "Gemini request failed: %s",
                    e
                )
                continue

            except Exception as e:
                last_error = e
                logger.exception(
                    "Gemini request failed"
                )
                continue

        raise RuntimeError(
            f"Gemini request failed: {last_error}"
        )


    def _build_context(self, retrieved_chunks):

        context = []

        for chunk in retrieved_chunks:

            metadata = chunk.get("metadata", {})

            context.append(
                f"""
Source: {metadata.get("source", "Unknown")}
Page: {metadata.get("page", "Unknown")}

Content:
{chunk.get("text", "")}
"""
            )

        return "\n-------------------\n".join(context)


    def generate_answer(
        self,
        question,
        retrieved_chunks
    ):

        context = self._build_context(
            retrieved_chunks
        )

        prompt = f"""
You are an AI Legal Assistant.

Answer ONLY using the provided context.

If the answer cannot be found in the context, say:
"I couldn't find this information in the uploaded documents."

Always mention the source document and page number.

Context:
{context}

Question:
{question}

Answer:
"""

        return self.generate(prompt)


llm_service = LLMService()