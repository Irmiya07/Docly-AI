import os
import asyncio
import logging
import traceback

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    Depends,
)

from app.services.chunker import chunk_service
from app.services.timeline_extractor import timeline_extractor
from app.services.auth_service import get_current_user


router = APIRouter(
    prefix="/timeline",
    tags=["Timeline"],
)


logger = logging.getLogger(
    "docly.timeline"
)


# OCR/image support removed for Render
# memory efficiency.
ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".doc",
}

MAX_FILE_SIZE = 15 * 1024 * 1024


@router.post("/")
async def timeline_router(
    file: UploadFile = File(None),
    filename: str = Form(None),
    current_user: dict = Depends(
        get_current_user
    ),
):

    user_id_str = str(
        current_user["_id"]
    )

    file_path = None

    try:

        # ==================================================
        # DIRECT FILE UPLOAD
        # ==================================================

        if file:

            ext = os.path.splitext(
                file.filename
            )[1].lower()

            if ext not in ALLOWED_EXTENSIONS:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Unsupported file format "
                        f"'{ext}'. Supported formats: "
                        f"{', '.join(ALLOWED_EXTENSIONS)}"
                    ),
                )

            os.makedirs(
                "temp",
                exist_ok=True
            )

            file_path = os.path.join(
                "temp",
                f"timeline_{file.filename}"
            )

            total_bytes = 0

            with open(
                file_path,
                "wb"
            ) as buffer:

                while True:

                    data = await file.read(
                        1024 * 1024
                    )

                    if not data:
                        break

                    total_bytes += len(
                        data
                    )

                    if total_bytes > MAX_FILE_SIZE:

                        raise HTTPException(
                            status_code=413,
                            detail=(
                                "File exceeds "
                                "the maximum size "
                                "limit of 15MB."
                            ),
                        )

                    buffer.write(data)

            logger.info(
                "Timeline file buffered: %s (%d bytes)",
                file.filename,
                total_bytes,
            )

            # Parse document
            chunks = await asyncio.to_thread(
                chunk_service.process_text,
                [file_path],
            )

            if not chunks:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "No text could be "
                        "extracted from the document."
                    ),
                )

            document_name = file.filename

            # Preserve page metadata
            contract_text = "\n".join(
                (
                    f"[Source: "
                    f"{chunk['metadata'].get('source', document_name)} "
                    f"| Page: "
                    f"{chunk['metadata'].get('page', 1)}]\n"
                    f"{chunk['text']}"
                )
                for chunk in chunks
                if chunk.get("text")
            )

        # ==================================================
        # WORKSPACE DOCUMENT
        # ==================================================

        elif filename:

            from app.services.vector_store import (
                vector_store
            )

            results = await asyncio.to_thread(
                vector_store.collection.get,
                where={
                    "$and": [
                        {
                            "user_id": user_id_str
                        },
                        {
                            "source": filename
                        },
                    ]
                },
            )

            if (
                not results
                or not results.get("documents")
            ):

                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"Document '{filename}' "
                        "not found in workspace."
                    ),
                )

            documents = results.get(
                "documents",
                []
            )

            metadatas = results.get(
                "metadatas",
                []
            )

            # Preserve page order
            sorted_chunks = sorted(
                zip(
                    metadatas,
                    documents
                ),
                key=lambda item: (
                    item[0].get(
                        "page",
                        1
                    ),
                    item[0].get(
                        "chunk_index",
                        0
                    ),
                ),
            )

            contract_text = "\n".join(
                (
                    f"[Source: "
                    f"{metadata.get('source', filename)} "
                    f"| Page: "
                    f"{metadata.get('page', 1)}]\n"
                    f"{text}"
                )
                for metadata, text in sorted_chunks
                if text
            )

            document_name = filename

        # ==================================================
        # NOTHING PROVIDED
        # ==================================================

        else:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Either file or filename "
                    "must be provided."
                ),
            )

        if not contract_text.strip():

            raise HTTPException(
                status_code=400,
                detail=(
                    "No usable text was found "
                    "in the document."
                ),
            )

        logger.info(
            "Timeline extraction started: %s chars",
            len(contract_text),
        )

        # ==================================================
        # DIRECT TIMELINE EXTRACTION
        # ==================================================

        timeline_events = await asyncio.to_thread(
            timeline_extractor.extract,
            contract_text,
        )

        if not isinstance(
            timeline_events,
            list
        ):
            timeline_events = []

        logger.info(
            "Timeline extraction completed: %d events",
            len(timeline_events),
        )

        return {
            "document": document_name,
            "total_events": len(
                timeline_events
            ),
            "timeline": timeline_events,
        }

    except HTTPException:
        raise

    except Exception as error:

        logger.error(
            "Error extracting timeline:\n%s",
            traceback.format_exc(),
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    finally:

        if (
            file_path
            and os.path.exists(file_path)
        ):

            try:

                os.remove(
                    file_path
                )

            except Exception as error:

                logger.error(
                    "Failed to remove temporary file %s: %s",
                    file_path,
                    error,
                )