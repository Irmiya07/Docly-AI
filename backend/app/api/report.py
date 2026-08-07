import os 

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from app.services.chunker import chunk_service
from app.services.report_generator import report_generator
from app.services.auth_service import get_current_user

router = APIRouter(
  prefix="/report",
  tags=["report"]
)

@router.post("/")
async def report_router(
  file: UploadFile = File(None),
  filename: str = Form(None),
  current_user: dict = Depends(get_current_user)
):
  """
    Upload a legal document,
    analyze it,
    and generate a report.
    """

  user_id_str = str(current_user["_id"])
  contract_text = ""
  file_path = None

  try:
    if file:
      os.makedirs("temp", exist_ok=True)
      file_path = os.path.join("temp", file.filename)

      with open(file_path, "wb") as f:
        f.write(await file.read())

      chunks = chunk_service.process_text([file_path])
      if not chunks:
          raise HTTPException(status_code=400, detail="No text chunks found in the document.")

      contract_text = "\n".join([chunk["text"] for chunk in chunks])
      os.remove(file_path)
      file_path = None
    elif filename:
      from app.services.vector_store import vector_store
      results = vector_store.collection.get(
          where={
              "$and": [
                  {"user_id": user_id_str},
                  {"source": filename}
              ]
          }
      )
      if not results or not results.get("documents"):
          raise HTTPException(status_code=404, detail=f"Document '{filename}' not found in workspace.")
      
      metadatas = results.get("metadatas", [])
      documents = results.get("documents", [])
      sorted_chunks = sorted(zip(metadatas, documents), key=lambda x: (x[0].get("page", 1), x[0].get("chunk_index", 0)))
      contract_text = "\n".join([text for _, text in sorted_chunks])
    else:
      raise HTTPException(status_code=400, detail="Either file or filename must be provided.")

    report = report_generator.generate_report(contract_text)
    return report
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
  finally:
    if file_path and os.path.exists(file_path):
        os.remove(file_path)
  