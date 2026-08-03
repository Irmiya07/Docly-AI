from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.retriever import retriever
from app.services.llm import llm_service
from app.services.citation import citation_service

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)

class ChatRequest(BaseModel):
    question: str

@router.post("/")
async def chat_router(request: ChatRequest):

    try:
        retrieved_chunks=retriever.retrieve(
            query=request.question,
            top_k=5
        )

        if not retrieved_chunks:
            return {
                "question": request.question,
                "answer": "I couldn't find this information in the uploaded documents.",
                "citations": []
            }

        answer=llm_service.generate_answer(
            request.question,
            retrieved_chunks
        )

        citations=citation_service.format_sources(
            retrieved_chunks
        )
        return {

            "question": request.question,

            "answer": answer,

            "citations": citations

        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

