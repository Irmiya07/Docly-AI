import json
import re
from typing import List, Dict, Any

from google import genai

from app.config import GEMINI_API_KEY, MODEL_NAME


class LLMService:
    """
    Service responsible for interacting with the Gemini LLM.
    """

    def __init__(self):

        self.client = genai.Client(
            api_key=GEMINI_API_KEY
        )

        self.model = MODEL_NAME

    def _build_context(
        self,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> str:
        """
        Convert retrieved chunks into prompt context.
        """

        context = []

        for chunk in retrieved_chunks:

            metadata = chunk.get("metadata", {})

            context.append(
                f"""
Source: {metadata.get("source", "Unknown")}
Page: {metadata.get("page", "Unknown")}

Content:
{chunk["text"]}
"""
            )

        return "\n-----------------------------\n".join(context)

    def _build_prompt(
        self,
        question: str,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> str:
        """
        Build RAG prompt.
        """

        context = self._build_context(retrieved_chunks)

        return f"""
You are an AI Legal Assistant.

Answer ONLY using the provided context.

If the answer is not available, reply exactly:

"I couldn't find this information in the uploaded documents."

Always mention the source document and page number.

Context:

{context}

Question:

{question}

Answer:
"""

    def generate(
        self,
        prompt: str
    ) -> str:
        """
        Generate plain text.
        """

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt
        )

        return response.text.strip()

    def generate_json(
        self,
        prompt: str
    ):
        """
        Generate JSON response.
        Automatically removes markdown code fences.
        """

        response = self.generate(prompt)

        # Remove ```json and ```
        response = re.sub(r"^```(?:json)?\s*", "", response.strip())
        response = re.sub(r"\s*```$", "", response.strip())

        try:
            return json.loads(response)

        except json.JSONDecodeError:

            return {
                "error": "Invalid JSON returned by the LLM.",
                "raw_response": response
            }

    def generate_answer(
        self,
        question: str,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> str:
        """
        Generate answer for RAG.
        """

        prompt = self._build_prompt(
            question,
            retrieved_chunks
        )

        return self.generate(prompt)


llm_service = LLMService()