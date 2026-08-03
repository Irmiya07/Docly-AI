import os

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.chunker import chunk_service
from app.services.contract_analyzer import contract_analyzer


router = APIRouter(
    prefix="/timeline",
    tags=["Timeline"]
)


@router.post("/")
async def timeline_router(
    file: UploadFile = File(...)
):
    """
    Extract timeline events from a legal document.
    """

    os.makedirs("temp", exist_ok=True)

    file_path = os.path.join(
        "temp",
        file.filename
    )

    try:

        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        chunks = chunk_service.process_text(
            [file_path]
        )

        if not chunks:

            raise HTTPException(
                status_code=400,
                detail="No text could be extracted."
            )

        contract_text = "\n".join(
            chunk["text"]
            for chunk in chunks
        )

        analysis = contract_analyzer.analyze(
            contract_text
        )

        return {
            "document": file.filename,
            "total_events": len(
                analysis.get("timeline", [])
            ),
            "timeline": analysis.get(
                "timeline",
                []
            )
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if os.path.exists(file_path):
            os.remove(file_path)