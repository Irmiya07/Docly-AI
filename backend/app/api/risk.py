import os

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from app.services.chunker import chunk_service
from app.services.contract_analyzer import contract_analyzer
from app.services.auth_service import get_current_user


router = APIRouter(
  prefix="/risk",
  tags=["risk"]
)

import asyncio
import logging
import traceback

logger = logging.getLogger("docly.risk")
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".bmp", ".tiff"}
MAX_FILE_SIZE = 15 * 1024 * 1024 # 15MB

@router.post("/")
async def risk_router(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Early format and size validations
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
    file_path = os.path.join("temp", f"risk_{file.filename}")

    try:
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

        logger.info(f"Number of chunks: {len(chunks)}")

        if not chunks:
            raise HTTPException(
                status_code=400,
                detail="No text chunks found in the document."
            )

        contract_text = "\n".join(chunk["text"] for chunk in chunks)

        # Run risk analysis in thread pool
        risk_analysis_results = await asyncio.to_thread(contract_analyzer.analyze, contract_text)

        risks = risk_analysis_results.get("risks", [])

        # Proactive file cleanup
        if os.path.exists(file_path):
            os.remove(file_path)
        file_path = None

        return {
            "document": file.filename,
            "total_risk": len(risks),
            "risks": risks
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing risks: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as err:
                logger.error(f"Failed to clean up temp file '{file_path}': {err}")