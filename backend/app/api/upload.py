import os
import time
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from app.services.chunker import chunk_service
from app.services.vector_store import vector_store
from app.services.embeddings import embedding_service
from app.services.auth_service import get_current_user
from app.services.database import get_db

router = APIRouter(
  prefix="/upload",
  tags=["upload"],
)

@router.post("/")
async def upload_router(
  files: list[UploadFile] = File(...),
  current_user: dict = Depends(get_current_user)
):
  """
    Upload one or more documents,
    generate embeddings,
    and store them in ChromaDB.
    """

  os.makedirs("temp", exist_ok=True)

  total_chunks = 0
  uploaded_files = []
  is_guest = current_user.get("role") == "guest"
  user_id_str = str(current_user["_id"])

  try:
    for file in files:
      file_path = os.path.join("temp", file.filename)

      with open(file_path, "wb") as f:
        f.write(await file.read())

      chunks = chunk_service.process_text([file_path])

      text = [chunk["text"] for chunk in chunks]

      embeddings = embedding_service.generate_embeddings(text)

      document_id = None
      if not is_guest:
        db = get_db()
        doc_record = {
            "user_id": current_user["_id"],
            "filename": file.filename,
            "upload_time": datetime.now(timezone.utc),
            "total_chunks": len(chunks),
            "document_status": "indexed"
        }
        result = await db.documents.insert_one(doc_record)
        document_id = str(result.inserted_id)

      now_ts = time.time()
      for chunk, embedding in zip(chunks, embeddings):
        chunk["embedding"] = embedding.tolist()
        chunk["metadata"]["user_id"] = user_id_str
        chunk["metadata"]["created_at"] = now_ts
        chunk["metadata"]["is_guest"] = is_guest
        if document_id:
          chunk["metadata"]["document_id"] = document_id

      vector_store.add_documents(chunks)
      uploaded_files.append(file.filename)
      total_chunks += len(chunks)
      os.remove(file_path)

    return {
        "message": "upload successful",
        "uploaded_files": uploaded_files,
        "total_chunks": total_chunks
    }
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
  finally:
    for file in files:
      file_path = os.path.join("temp", file.filename)
      if os.path.exists(file_path):
        os.remove(file_path)


@router.get("/")
async def list_documents(
  current_user: dict = Depends(get_current_user)
):
  is_guest = current_user.get("role") == "guest"
  if is_guest:
    return []
  db = get_db()
  cursor = db.documents.find({"user_id": current_user["_id"]})
  docs = []
  async for doc in cursor:
    ext = doc["filename"].split(".")[-1].lower()
    mime_type = "image/png"
    if ext == "pdf":
      mime_type = "application/pdf"
    elif ext in ["docx", "doc"]:
      mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    
    docs.append({
        "name": doc["filename"],
        "size": "N/A",
        "uploadedAt": doc["upload_time"].isoformat(),
        "clauses": doc.get("total_chunks", 12),
        "risks": 0,
        "events": 0,
        "type": mime_type
    })
  return docs


@router.delete("/{filename}")
async def delete_document(
  filename: str,
  current_user: dict = Depends(get_current_user)
):
  is_guest = current_user.get("role") == "guest"
  user_id_str = str(current_user["_id"])

  try:
    vector_store.collection.delete(
        where={
            "$and": [
                {"user_id": user_id_str},
                {"source": filename}
            ]
        }
    )
  except Exception as e:
    print(f"Chroma delete error: {e}")

  if not is_guest:
    db = get_db()
    await db.documents.delete_many({
        "user_id": current_user["_id"],
        "filename": filename
    })

  return {"message": "Document deleted successfully."}


  