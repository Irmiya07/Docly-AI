import os

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from app.services.chunker import chunk_service
from app.services.contract_analyzer import contract_analyzer
from app.services.auth_service import get_current_user


router = APIRouter(
    prefix="/timeline",
    tags=["Timeline"]
)


import asyncio
import logging
import traceback

logger = logging.getLogger("docly.timeline")
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".bmp", ".tiff"}
MAX_FILE_SIZE = 15 * 1024 * 1024 # 15MB

@router.post("/")
async def timeline_router(
    file: UploadFile = File(None),
    filename: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Extract timeline events from a legal document.
    """

    user_id_str = str(current_user["_id"])
    contract_text = ""
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
            file_path = os.path.join("temp", f"timeline_{file.filename}")

            # Stream file to disk in 1MB chunks
            total_bytes_written = 0
            with open(file_path, "wb") as buffer:
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
                    buffer.write(chunk)

            # Process text chunks in thread pool
            chunks = await asyncio.to_thread(chunk_service.process_text, [file_path])

            if not chunks:
                raise HTTPException(
                    status_code=400,
                    detail="No text could be extracted."
                )

            contract_text = "\n".join(chunk["text"] for chunk in chunks)
            
            # Clean up uploaded file proactively
            if os.path.exists(file_path):
                os.remove(file_path)
            file_path = None
        elif filename:
            from app.services.vector_store import vector_store
            
            # Fetch document chunks from vector store in thread pool
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
                raise HTTPException(
                    status_code=404,
                    detail=f"Document '{filename}' not found in workspace."
                )
            
            metadatas = results.get("metadatas", [])
            documents = results.get("documents", [])
            sorted_chunks = sorted(zip(metadatas, documents), key=lambda x: (x[0].get("page", 1), x[0].get("chunk_index", 0)))
            contract_text = "\n".join([text for _, text in sorted_chunks])
        else:
            raise HTTPException(
                status_code=400,
                detail="Either file or filename must be provided."
            )

        # Run timeline extraction in thread pool
        analysis = await asyncio.to_thread(contract_analyzer.analyze, contract_text)

        return {
            "document": file.filename if file else filename,
            "total_events": len(analysis.get("timeline", [])),
            "timeline": analysis.get("timeline", [])
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting timeline events: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as err:
                logger.error(f"Failed to clean up temp file '{file_path}': {err}")