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

import asyncio
import logging
import traceback

logger = logging.getLogger("docly.upload")
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_FILE_SIZE = 15 * 1024 * 1024 # 15MB

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

  logger.info("UPLOAD START")
  os.makedirs("temp", exist_ok=True)

  total_chunks = 0
  uploaded_files = []
  is_guest = current_user.get("role") == "guest"
  user_id_str = str(current_user["_id"])
  temp_paths_to_clean = []

  # Early validation of formats and sizes
  for file in files:
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}' for file '{file.filename}'. Supported formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File '{file.filename}' exceeds the maximum size limit of 15MB."
        )

  try:
    for file in files:
      file_path = os.path.join("temp", file.filename)
      temp_paths_to_clean.append(file_path)

      # Stream large files in 1MB chunks instead of full memory buffering
      total_bytes_written = 0
      with open(file_path, "wb") as f:
        while True:
          chunk = await file.read(1024 * 1024)
          if not chunk:
            break
          total_bytes_written += len(chunk)
          if total_bytes_written > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File '{file.filename}' exceeds the maximum size limit of 15MB."
            )
          f.write(chunk)

      logger.info(f"Buffered {file.filename} to temp: {total_bytes_written} bytes.")

      # Process document extraction in a thread pool
      chunks = await asyncio.to_thread(chunk_service.process_text, [file_path])
      logger.info("DOCUMENT PARSING COMPLETE")

      if not chunks:
         logger.warning(f"No text extracted from {file.filename}.")
         continue

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
      batch_size = 16
      for i in range(0, len(chunks), batch_size):
        batch_chunks = chunks[i : i + batch_size]
        batch_texts = [c["text"] for c in batch_chunks]

        # Generate embeddings in a thread pool (sentence transformers are CPU/GPU-bound)
        batch_embeddings = await asyncio.to_thread(embedding_service.generate_embeddings, batch_texts)

        for chunk, embedding in zip(batch_chunks, batch_embeddings):
          chunk["embedding"] = embedding.tolist()
          chunk["metadata"]["user_id"] = user_id_str
          chunk["metadata"]["created_at"] = now_ts
          chunk["metadata"]["is_guest"] = is_guest
          if document_id:
            chunk["metadata"]["document_id"] = document_id

        # Store in vector store in thread pool
        await asyncio.to_thread(vector_store.add_documents, batch_chunks)
        logger.info("CHROMA INSERT COMPLETE")

      uploaded_files.append(file.filename)
      total_chunks += len(chunks)
      
      # Proactive cleanup of this file
      if os.path.exists(file_path):
        os.remove(file_path)
        if file_path in temp_paths_to_clean:
          temp_paths_to_clean.remove(file_path)

    return {
        "message": "upload successful",
        "uploaded_files": uploaded_files,
        "total_chunks": total_chunks
    }
  except HTTPException:
    raise
  except Exception as e:
    logger.error(f"Error in upload_router: {traceback.format_exc()}")
    raise HTTPException(status_code=500, detail=str(e))
  finally:
    for path in temp_paths_to_clean:
      if os.path.exists(path):
        try:
          os.remove(path)
        except Exception as err:
          logger.error(f"Failed to clean up temp file {path}: {err}")



@router.get("/")
async def list_documents(
  current_user: dict = Depends(get_current_user)
):
  db = get_db()
  cursor = db.documents.find({"user_id": current_user["_id"]})
  docs = []
  async for doc in cursor:
    ext = doc["filename"].split(".")[-1].lower()
    mime_type = "application/octet-stream"
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


  