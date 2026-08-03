
import os

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.chunker import chunk_service
from app.services.contract_analyzer import contract_analyzer

router = APIRouter(
  prefix="/clause",
  tags=["clause"]
)

@router.post("/")
async def analyze_clause(
  file: UploadFile = File(...),
):
  """
    Upload a legal document,
    analyze it clause by clause,
    and return the analysis results.
    """

  os.makedirs("temp", exist_ok=True)

  try:
    file_path = os.path.join("temp", file.filename)

    with open(file_path, "wb") as f:
      f.write(await file.read())

    chunks = chunk_service.process_text([file_path])
    if not chunks:
        raise HTTPException(status_code=400, detail="No text chunks found in the document.")

    contract_text = "\n".join([chunk["text"] for chunk in chunks])

    analysis_results = contract_analyzer.analyze(contract_text)

    os.remove(file_path)

    return {
      "document": file.filename,
      "total_clauses": len(analysis_results.get("clauses", [])),
      "clauses": analysis_results.get("clauses", [])
    }
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
  finally:
    if os.path.exists(file_path):
        os.remove(file_path)


  