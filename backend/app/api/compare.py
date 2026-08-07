import os

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from app.services.chunker import chunk_service
from app.services.contract_analyzer import contract_analyzer
from app.services.comparator import comparator
from app.services.auth_service import get_current_user

router = APIRouter(
  prefix="/compare",
  tags=["compare"]
)

@router.post("/")
async def compare_router(
  file1: UploadFile = File(None),
  file2: UploadFile = File(None),
  filename1: str = Form(None),
  filename2: str = Form(None),
  current_user: dict = Depends(get_current_user)
):
  """
    Upload two legal documents,
    compare them clause by clause,
    and return the comparison results.
    """
  user_id_str = str(current_user["_id"])
  contract1 = ""
  contract2 = ""
  file1_path = None
  file2_path = None

  try:
    # Get Contract 1 Text
    if file1:
      os.makedirs("temp", exist_ok=True)
      file1_path = os.path.join("temp", file1.filename)
      with open(file1_path, "wb") as f:
        f.write(await file1.read())
      chunks1 = chunk_service.process_text([file1_path])
      contract1 = "\n".join([chunk["text"] for chunk in chunks1])
      os.remove(file1_path)
      file1_path = None
    elif filename1:
      from app.services.vector_store import vector_store
      results = vector_store.collection.get(
          where={
              "$and": [
                  {"user_id": user_id_str},
                  {"source": filename1}
              ]
          }
      )
      if not results or not results.get("documents"):
          raise HTTPException(status_code=404, detail=f"Document '{filename1}' not found in workspace.")
      metadatas = results.get("metadatas", [])
      documents = results.get("documents", [])
      sorted_chunks = sorted(zip(metadatas, documents), key=lambda x: (x[0].get("page", 1), x[0].get("chunk_index", 0)))
      contract1 = "\n".join([text for _, text in sorted_chunks])
    else:
      raise HTTPException(status_code=400, detail="Either file1 or filename1 must be provided.")

    # Get Contract 2 Text
    if file2:
      os.makedirs("temp", exist_ok=True)
      file2_path = os.path.join("temp", file2.filename)
      with open(file2_path, "wb") as f:
        f.write(await file2.read())
      chunks2 = chunk_service.process_text([file2_path])
      contract2 = "\n".join([chunk["text"] for chunk in chunks2])
      os.remove(file2_path)
      file2_path = None
    elif filename2:
      from app.services.vector_store import vector_store
      results = vector_store.collection.get(
          where={
              "$and": [
                  {"user_id": user_id_str},
                  {"source": filename2}
              ]
          }
      )
      if not results or not results.get("documents"):
          raise HTTPException(status_code=404, detail=f"Document '{filename2}' not found in workspace.")
      metadatas = results.get("metadatas", [])
      documents = results.get("documents", [])
      sorted_chunks = sorted(zip(metadatas, documents), key=lambda x: (x[0].get("page", 1), x[0].get("chunk_index", 0)))
      contract2 = "\n".join([text for _, text in sorted_chunks])
    else:
      raise HTTPException(status_code=400, detail="Either file2 or filename2 must be provided.")

    analysis1 = contract_analyzer.analyze(contract1)
    analysis2 = contract_analyzer.analyze(contract2)

    comparison_results = comparator.compare(analysis1["clauses"], analysis2["clauses"])

    return {
      "file1": file1.filename if file1 else filename1,
      "file2": file2.filename if file2 else filename2,
      "comparison_results": comparison_results
    }
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
  finally:
    if file1_path and os.path.exists(file1_path):
      os.remove(file1_path)
    if file2_path and os.path.exists(file2_path):
      os.remove(file2_path)
  