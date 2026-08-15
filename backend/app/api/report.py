import os 

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from app.services.chunker import chunk_service
from app.services.report_generator import report_generator
from app.services.auth_service import get_current_user

router = APIRouter(
  prefix="/report",
  tags=["report"]
)

import asyncio
import logging
import time
import uuid
import traceback

logger = logging.getLogger("docly.report")
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".bmp", ".tiff"}
MAX_FILE_SIZE = 15 * 1024 * 1024 # 15MB

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
  request_id = str(uuid.uuid4())[:8]
  user_id_str = str(current_user["_id"])
  file_path = None
  temp_chroma_filename = None
  start_time = time.time()

  logger.info(f"[{request_id}] Report generation request started. User: {user_id_str}")

  try:
    from app.services.report_retriever import report_retriever
    from app.services.vector_store import vector_store
    from app.services.embeddings import embedding_service

    doc_size = 0
    num_chunks = 0
    source_filename = None

    if file:
      ext = os.path.splitext(file.filename)[1].lower()
      if ext not in ALLOWED_EXTENSIONS:
        logger.warning(f"[{request_id}] Rejected: Unsupported file extension '{ext}' for file '{file.filename}'")
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Supported formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )
      if file.size and file.size > MAX_FILE_SIZE:
        logger.warning(f"[{request_id}] Rejected: File '{file.filename}' size {file.size} exceeds 15MB")
        raise HTTPException(
            status_code=413,
            detail=f"File '{file.filename}' exceeds the maximum size limit of 15MB."
        )

      os.makedirs("temp", exist_ok=True)
      file_path = os.path.join("temp", f"{request_id}_{file.filename}")

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

      logger.info(f"[{request_id}] Buffered file to temp: {total_bytes_written} bytes. Offloading extraction...")

      # Process document chunks in thread pool
      chunks = await asyncio.to_thread(chunk_service.process_text, [file_path])
      if not chunks:
          raise HTTPException(status_code=400, detail="No text chunks found in the document.")

      doc_size = sum(len(c["text"]) for c in chunks)
      num_chunks = len(chunks)

      # Generate embeddings in thread pool
      text_list = [c["text"] for c in chunks]
      embeddings = await asyncio.to_thread(embedding_service.generate_embeddings, text_list)

      temp_filename = f"temp_{request_id}_{file.filename}"
      is_guest = current_user.get("role") == "guest"
      now_ts = time.time()
      
      for chunk, embedding in zip(chunks, embeddings):
          chunk["embedding"] = embedding.tolist()
          if "metadata" not in chunk:
              chunk["metadata"] = {}
          chunk["metadata"]["user_id"] = user_id_str
          chunk["metadata"]["created_at"] = now_ts
          chunk["metadata"]["is_guest"] = is_guest
          chunk["metadata"]["source"] = temp_filename

      # Add chunks to ChromaDB
      await asyncio.to_thread(vector_store.add_documents, chunks)
      temp_chroma_filename = temp_filename
      
      # Clean up uploaded file proactively
      if os.path.exists(file_path):
        os.remove(file_path)
      file_path = None
      
      source_filename = temp_filename

    elif filename:
      logger.info(f"[{request_id}] Retrieving workspace document '{filename}' for User '{user_id_str}'")
      
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
      doc_size = sum(len(doc) for doc in documents)
      num_chunks = len(documents)
      source_filename = filename

    else:
      raise HTTPException(status_code=400, detail="Either file or filename must be provided.")

    logger.info(f"[{request_id}] Retrieving report-specific chunks from ChromaDB")
    
    # Retrieve report-specific chunks using report retriever
    retrieved_chunks = await asyncio.to_thread(
        report_retriever.retrieve_report_content,
        user_id_str,
        source_filename
    )
    
    unique_count = len(retrieved_chunks)
    context_chars = sum(len(c.get("text", "")) for c in retrieved_chunks)

    logger.info(f"[{request_id}] Triggering report generation. Chunks: {unique_count}, Context size: {context_chars} chars")
    
    gemini_start = time.time()
    # Run report generation in thread pool (Gemini LLM calls)
    report = await asyncio.to_thread(report_generator.generate_report, retrieved_chunks)
    gemini_duration = time.time() - gemini_start
    
    duration = time.time() - start_time
    
    logger.info(
        f"\nReport Performance Metrics [{request_id}]:\n"
        f"Document size: {doc_size} characters\n"
        f"Total document chunks: {num_chunks}\n"
        f"Clause retrieval Top-K chunks: {report_retriever.CLAUSE_TOP_K}\n"
        f"Risk retrieval Top-K chunks: {report_retriever.RISK_TOP_K}\n"
        f"Timeline retrieval Top-K chunks: {report_retriever.TIMELINE_TOP_K}\n"
        f"Unique chunks in context: {unique_count}\n"
        f"Final context characters: {context_chars}\n"
        f"Gemini API calls: 1\n"
        f"Gemini execution time: {gemini_duration:.2f}s\n"
        f"Total report execution time: {duration:.2f}s"
    )
    
    return report

  except HTTPException:
    raise
  except Exception as e:
    logger.error(f"[{request_id}] Exception inside report generation handler: {traceback.format_exc()}")
    raise HTTPException(
        status_code=500,
        detail="AI service is temporarily unavailable. Please try again."
    )
  finally:
    if file_path and os.path.exists(file_path):
        try:
          os.remove(file_path)
        except Exception as err:
          logger.error(f"[{request_id}] Failed to clean up temp file '{file_path}': {err}")
    if temp_chroma_filename:
        try:
          await asyncio.to_thread(vector_store.delete_document, user_id_str, temp_chroma_filename)
          logger.info(f"[{request_id}] Successfully cleaned up temp ChromaDB documents for source: {temp_chroma_filename}")
        except Exception as err:
          logger.error(f"[{request_id}] Failed to clean up temp ChromaDB documents '{temp_chroma_filename}': {err}")

  