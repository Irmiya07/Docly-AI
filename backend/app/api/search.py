from typing import  Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.retriever import retriever

router = APIRouter(
    prefix="/search",
    tags=["Search"]
)

class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    source: Optional[str] = None


@router.post("/")
async def search_router(request: SearchRequest):
  try:
      filters=None

      if request.source:
            filters={"source": request.source}

      results=retriever.retrieve(
            query=request.query,
            top_k=request.top_k,
            filters=filters
        )
      return {
          
            "query": request.query,
            "results": results,
            "count": len(results)
        }
  except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))
