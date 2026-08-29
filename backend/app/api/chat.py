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

import asyncio

@router.post("/")
async def chat_router(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):

    try:
        print("Chart started")
        retrieved_chunks = await asyncio.to_thread(
            retriever.retrieve,
            query=request.question,
            user_id=str(current_user["_id"]),
            top_k=5
        )

        if not retrieved_chunks:
            return {
                "question": request.question,
                "answer": "I couldn't find this information in the uploaded documents.",
                "citations": []
            }
        print("RETRIEVAL COMPLETE")
        answer = await asyncio.to_thread(
            llm_service.generate_answer,
            request.question,
            retrieved_chunks
        )
        print("GEMINI COMPLETE")

        citations = citation_service.format_sources(
            retrieved_chunks
        )
        return {

            "question": request.question,

            "answer": answer,

            "citations": citations

        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


