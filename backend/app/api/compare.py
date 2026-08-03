import os

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.chunker import chunk_service
from app.services.contract_analyzer import contract_analyzer
from app.services.comparator import comparator

router = APIRouter(
  prefix="/compare",
  tags=["compare"]
)

@router.post("/")
async def compare_router(
  file1: UploadFile = File(...),
  file2: UploadFile = File(...)
):
  """
    Upload two legal documents,
    compare them clause by clause,
    and return the comparison results.
    """
  os.makedirs("temp", exist_ok=True)

  try:
    file1_path = os.path.join("temp", file1.filename)
    file2_path = os.path.join("temp", file2.filename)

    with open(file1_path, "wb") as f:
      f.write(await file1.read())

    with open(file2_path, "wb") as f:
      f.write(await file2.read())

    chunks1=chunk_service.process_text([file1_path])
    chunks2=chunk_service.process_text([file2_path])
    contract1="\n".join([chunk["text"] for chunk in chunks1])
    contract2="\n".join([chunk["text"] for chunk in chunks2])

    analysis1=contract_analyzer.analyze(contract1)
    analysis2=contract_analyzer.analyze(contract2)

    comparison_results = comparator.compare(analysis1["clauses"], analysis2["clauses"])

    os.remove(file1_path)
    os.remove(file2_path)

    return {
      "file1": file1.filename,
      "file2": file2.filename,
      "comparison_results": comparison_results
    }
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
  