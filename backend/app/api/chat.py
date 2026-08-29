import asyncio

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.services.retriever import retriever
from app.services.llm import llm_service
from app.services.citation import citation_service
from app.services.auth_service import get_current_user


router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


class ChatRequest(BaseModel):
    question: str


@router.post("/")
async def chat_router(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):

    try:

        if not request.question.strip():
            raise HTTPException(
                status_code=400,
                detail="Question cannot be empty.",
            )

        print("CHAT START")

        # ------------------------------------------
        # RETRIEVAL
        # ------------------------------------------

        retrieved_chunks = await asyncio.to_thread(
            retriever.retrieve,
            query=request.question,
            user_id=str(current_user["_id"]),
            top_k=3,
        )

        print(
            f"RETRIEVAL COMPLETE: "
            f"{len(retrieved_chunks)} chunks"
        )

        if not retrieved_chunks:

            return {
                "question": request.question,
                "answer": (
                    "I couldn't find this information "
                    "in the uploaded documents."
                ),
                "citations": [],
            }

        # ------------------------------------------
        # GEMINI
        # ------------------------------------------

        print("GEMINI START")

        answer = await asyncio.to_thread(
            llm_service.generate_answer,
            request.question,
            retrieved_chunks,
        )

        print("GEMINI COMPLETE")

        # ------------------------------------------
        # CITATIONS
        # ------------------------------------------

        citations = citation_service.format_sources(
            retrieved_chunks
        )

        print("CHAT COMPLETE")

        return {
            "question": request.question,
            "answer": answer,
            "citations": citations,
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            f"CHAT ERROR: {type(e).__name__}: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to generate answer.",
        )