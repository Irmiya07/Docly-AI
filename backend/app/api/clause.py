
import os

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from app.services.chunker import chunk_service
from app.services.contract_analyzer import contract_analyzer
from app.services.auth_service import get_current_user

router = APIRouter(
  prefix="/clause",
  tags=["clause"]
)

import asyncio
import logging
import traceback

logger = logging.getLogger("docly.clause")
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".bmp", ".tiff"}
MAX_FILE_SIZE = 15 * 1024 * 1024 # 15MB

@router.post("/")
async def analyze_clause(
  file: UploadFile = File(None),
  filename: str = Form(None),
  current_user: dict = Depends(get_current_user)
):
  """
    Upload a legal document, or select it from the workspace,
    analyze it clause by clause,
    and return the analysis results.
    """
  user_id_str = str(current_user["_id"])
  file_path = None
  
  try:
    if file:
      ext = os.path.splitext(file.filename)[1].lower()
      if ext not in ALLOWED_EXTENSIONS:
          raise HTTPException(
              status_code=400,
              detail=f"Unsupported file format '{ext}'. Supported formats: {', '.join(ALLOWED_EXTENSIONS)}"
          )
      if file.size and file.size > MAX_FILE_SIZE:
          raise HTTPException(
              status_code=413,
              detail="File exceeds the maximum size limit of 15MB."
          )

      os.makedirs("temp", exist_ok=True)
      file_path = os.path.join("temp", f"clause_{file.filename}")

      # Stream file to disk in 1MB chunks
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
                detail="File exceeds the maximum size limit of 15MB."
            )
          f.write(chunk)

      # Process text chunks in thread pool
      chunks = await asyncio.to_thread(chunk_service.process_text, [file_path])
      if not chunks:
          raise HTTPException(status_code=400, detail="No text chunks found in the document.")

      contract_text = "\n".join([chunk["text"] for chunk in chunks])
      document_name = file.filename
      
    elif filename:
      from app.services.vector_store import vector_store
      
      # Fetch document query chunks from vector store in thread pool
      results = await asyncio.to_thread(
          vector_store.collection.get,
          where={
              "$and": [
                  {"user_id": user_id_str},
                  {"source": filename}
              ]
          }
      )
      if not results or not results.get("documents"):
          raise HTTPException(status_code=404, detail=f"Document '{filename}' not found in workspace.")
      
      documents = results.get("documents", [])
      contract_text = "\n".join(documents)
      document_name = filename
      
    else:
      raise HTTPException(status_code=400, detail="Either file or filename must be provided.")

    # Run analysis in thread pool
    analysis_results = await asyncio.to_thread(contract_analyzer.analyze, contract_text)

    # Proactive file cleanup
    if file_path and os.path.exists(file_path):
      os.remove(file_path)
    file_path = None

    return {
      "document": document_name,
      "total_clauses": len(analysis_results.get("clauses", [])),
      "clauses": analysis_results.get("clauses", [])
    }
  except HTTPException:
    raise
  except Exception as e:
    logger.error(f"Error analyzing clauses: {traceback.format_exc()}")
    raise HTTPException(status_code=500, detail=str(e))
  finally:
    if file_path and os.path.exists(file_path):
      try:
        os.remove(file_path)
      except Exception as err:
        logger.error(f"Failed to clean up temp file '{file_path}': {err}")



  