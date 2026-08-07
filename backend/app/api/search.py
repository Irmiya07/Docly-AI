from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.services.retriever import retriever
from app.services.auth_service import get_current_user

router = APIRouter(
    prefix="/search",
    tags=["Search"]
)

class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    source: Optional[str] = None


@router.post("/")
async def search_router(
    request: SearchRequest,
    current_user: dict = Depends(get_current_user)
):
  try:
      filters=None

      if request.source:
            filters={"source": request.source}

      results=retriever.retrieve(
            query=request.query,
            user_id=str(current_user["_id"]),
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
