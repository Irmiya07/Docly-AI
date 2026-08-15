import os
import asyncio
import logging
import traceback
from typing import List, Dict, Any

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    Depends,
)

from google.genai.errors import APIError

from app.services.chunker import chunk_service
from app.services.comparator import comparator
from app.services.retriever import retriever
from app.services.auth_service import get_current_user


router = APIRouter(
    prefix="/compare",
    tags=["compare"],
)


logger = logging.getLogger("docly.compare")


ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".doc",
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".tiff",
}

MAX_FILE_SIZE = 15 * 1024 * 1024

# Maximum chunks retained for each document
MAX_COMPARE_CHUNKS = 8

# Maximum characters sent from each document
MAX_COMPARE_CONTEXT_CHARS = 15000


# ---------------------------------------------------------
# Helper: Deduplicate chunks
# ---------------------------------------------------------

def deduplicate_chunks(
    chunks: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Remove duplicate chunks using source/page/chunk_index.
    """

    seen = set()
    unique_chunks = []

    for chunk in chunks:

        metadata = chunk.get("metadata", {})

        key = (
            metadata.get("source"),
            metadata.get("page"),
            metadata.get("chunk_index"),
        )

        if key in seen:
            continue

        seen.add(key)
        unique_chunks.append(chunk)

    return unique_chunks


# ---------------------------------------------------------
# Helper: Limit context
# ---------------------------------------------------------

def limit_chunks(
    chunks: List[Dict[str, Any]],
    max_chunks: int = MAX_COMPARE_CHUNKS,
    max_chars: int = MAX_COMPARE_CONTEXT_CHARS,
) -> List[Dict[str, Any]]:
    """
    Keep the most relevant chunks while enforcing
    chunk and character limits.
    """

    selected = []
    total_chars = 0

    for chunk in chunks:

        text = chunk.get("text", "")

        if not text:
            continue

        if len(selected) >= max_chunks:
            break

        if total_chars + len(text) > max_chars:

            # Skip this chunk rather than cutting it
            # in the middle.
            continue

        selected.append(chunk)

        total_chars += len(text)

    return selected


# ---------------------------------------------------------
# Helper: Convert uploaded document into chunks
# ---------------------------------------------------------

async def process_uploaded_file(
    file: UploadFile,
    prefix: str,
) -> List[Dict[str, Any]]:

    os.makedirs("temp", exist_ok=True)

    extension = os.path.splitext(
        file.filename
    )[1].lower()

    file_path = os.path.join(
        "temp",
        f"{prefix}_{file.filename}",
    )

    total_bytes = 0

    try:

        with open(file_path, "wb") as output_file:

            while True:

                data = await file.read(
                    1024 * 1024
                )

                if not data:
                    break

                total_bytes += len(data)

                if total_bytes > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"File '{file.filename}' "
                            "exceeds the maximum size limit "
                            "of 15MB."
                        ),
                    )

                output_file.write(data)

        chunks = await asyncio.to_thread(
            chunk_service.process_text,
            [file_path],
        )

        return chunks

    finally:

        if os.path.exists(file_path):

            try:
                os.remove(file_path)

            except Exception as error:

                logger.error(
                    "Failed to remove temp file %s: %s",
                    file_path,
                    error,
                )


# ---------------------------------------------------------
# Helper: Get stored document from ChromaDB
# ---------------------------------------------------------

async def get_stored_document(
    filename: str,
    user_id: str,
) -> List[Dict[str, Any]]:

    from app.services.vector_store import vector_store

    results = await asyncio.to_thread(
        vector_store.collection.get,
        where={
            "$and": [
                {
                    "user_id": user_id
                },
                {
                    "source": filename
                },
            ]
        },
    )

    if not results or not results.get("documents"):
        raise HTTPException(
            status_code=404,
            detail=(
                f"Document '{filename}' "
                "not found in workspace."
            ),
        )

    documents = results.get(
        "documents",
        [],
    )

    metadatas = results.get(
        "metadatas",
        [],
    )

    chunks = []

    for document, metadata in zip(
        documents,
        metadatas,
    ):

        chunks.append(
            {
                "text": document,
                "metadata": metadata or {},
            }
        )

    chunks.sort(
        key=lambda chunk: (
            chunk["metadata"].get(
                "page",
                1,
            ),
            chunk["metadata"].get(
                "chunk_index",
                0,
            ),
        )
    )

    return chunks


# ---------------------------------------------------------
# Helper: Retrieve relevant chunks
# ---------------------------------------------------------

def retrieve_relevant_chunks(
    chunks: List[Dict[str, Any]],
    query: str,
) -> List[Dict[str, Any]]:
    """
    Retrieve relevant chunks using the existing Retriever.

    If the document has already been processed but we only have
    local chunks, use lightweight keyword scoring as a fallback.
    """

    if not chunks:
        return []

    query_words = {
        word.lower()
        for word in query.split()
        if len(word) > 3
    }

    scored = []

    for index, chunk in enumerate(chunks):

        text = chunk.get(
            "text",
            "",
        )

        text_lower = text.lower()

        score = sum(
            1
            for word in query_words
            if word in text_lower
        )

        scored.append(
            (
                score,
                index,
                chunk,
            )
        )

    scored.sort(
        key=lambda item: item[0],
        reverse=True,
    )

    return [
        item[2]
        for item in scored
    ]


# ---------------------------------------------------------
# Main Compare Endpoint
# ---------------------------------------------------------

@router.post("/")
async def compare_router(
    file1: UploadFile = File(None),
    file2: UploadFile = File(None),
    filename1: str = Form(None),
    filename2: str = Form(None),
    current_user: dict = Depends(
        get_current_user
    ),
):
    """
    Compare two legal documents.

    Supports:

    1. Newly uploaded files
    2. Existing workspace documents

    Uses ONE Gemini call for the actual comparison.
    """

    user_id_str = str(
        current_user["_id"]
    )

    try:

        # ==================================================
        # Validate file extensions
        # ==================================================

        for file_object in [
            file1,
            file2,
        ]:

            if not file_object:
                continue

            extension = os.path.splitext(
                file_object.filename
            )[1].lower()

            if extension not in ALLOWED_EXTENSIONS:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Unsupported file format "
                        f"'{extension}' for file "
                        f"'{file_object.filename}'."
                    ),
                )

        # ==================================================
        # Get Document 1
        # ==================================================

        if file1:

            chunks1 = await process_uploaded_file(
                file1,
                "compare1",
            )

            document_name1 = file1.filename

        elif filename1:

            chunks1 = await get_stored_document(
                filename1,
                user_id_str,
            )

            document_name1 = filename1

        else:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Either file1 or filename1 "
                    "must be provided."
                ),
            )

        # ==================================================
        # Get Document 2
        # ==================================================

        if file2:

            chunks2 = await process_uploaded_file(
                file2,
                "compare2",
            )

            document_name2 = file2.filename

        elif filename2:

            chunks2 = await get_stored_document(
                filename2,
                user_id_str,
            )

            document_name2 = filename2

        else:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Either file2 or filename2 "
                    "must be provided."
                ),
            )

        logger.info(
            "Compare documents: %s vs %s",
            document_name1,
            document_name2,
        )

        logger.info(
            "Original chunks: document1=%d, document2=%d",
            len(chunks1),
            len(chunks2),
        )

        # ==================================================
        # Retrieve Relevant Comparison Content
        # ==================================================

        comparison_query = """
        Important legal contract clauses including
        payment terms, termination, liability,
        indemnity, confidentiality, warranty,
        delivery, intellectual property, renewal,
        governing law, dispute resolution,
        obligations, deadlines and other
        materially important contractual terms.
        """

        relevant1 = retrieve_relevant_chunks(
            chunks1,
            comparison_query,
        )

        relevant2 = retrieve_relevant_chunks(
            chunks2,
            comparison_query,
        )

        # ==================================================
        # Deduplicate
        # ==================================================

        relevant1 = deduplicate_chunks(
            relevant1
        )

        relevant2 = deduplicate_chunks(
            relevant2
        )

        # ==================================================
        # Limit Context
        # ==================================================

        relevant1 = limit_chunks(
            relevant1
        )

        relevant2 = limit_chunks(
            relevant2
        )

        logger.info(
            "Final comparison chunks: "
            "document1=%d, document2=%d",
            len(relevant1),
            len(relevant2),
        )

        logger.info(
            "Comparison context size: "
            "document1=%d chars, document2=%d chars",
            sum(
                len(
                    chunk.get(
                        "text",
                        "",
                    )
                )
                for chunk in relevant1
            ),
            sum(
                len(
                    chunk.get(
                        "text",
                        "",
                    )
                )
                for chunk in relevant2
            ),
        )

        if not relevant1:

            raise HTTPException(
                status_code=400,
                detail=(
                    "No relevant content found "
                    "in Document 1."
                ),
            )

        if not relevant2:

            raise HTTPException(
                status_code=400,
                detail=(
                    "No relevant content found "
                    "in Document 2."
                ),
            )

        # ==================================================
        # ONE GEMINI CALL
        # ==================================================

        comparison_results = await asyncio.to_thread(
            comparator.compare_documents,
            relevant1,
            relevant2,
        )

        # ==================================================
        # Map Comparison Results to Frontend Expectation
        # ==================================================
        added_clauses = []
        modified_clauses = []
        removed_clauses = []

        if isinstance(comparison_results, list):
            for result in comparison_results:
                status = str(result.get("status", "")).strip().lower()
                differences_text = result.get("differences", "")
                clause_text = result.get("clause", "")
                legal_impact = result.get("legal_impact", "")
                
                # Check for page/source info to format detail appropriately (e.g. including page number)
                page_str = ""
                if status == "added" and result.get("page_b"):
                    page_str = f"[Page {result['page_b']}] "
                elif status == "removed" and result.get("page_a"):
                    page_str = f"[Page {result['page_a']}] "
                elif status == "modified":
                    pages = []
                    if result.get("page_a"):
                        pages.append(f"v1 Page {result['page_a']}")
                    if result.get("page_b"):
                        pages.append(f"v2 Page {result['page_b']}")
                    if pages:
                        page_str = f"[{', '.join(pages)}] "

                detail_text = page_str + differences_text

                item = {
                    "type": clause_text,
                    "title": clause_text,
                    "text": detail_text,
                    "content": detail_text,
                    "diff": detail_text,
                    "impact": legal_impact,
                    "source_a": result.get("source_a", ""),
                    "page_a": result.get("page_a", ""),
                    "source_b": result.get("source_b", ""),
                    "page_b": result.get("page_b", "")
                }
                if status == "added":
                    added_clauses.append(item)
                elif status == "modified":
                    modified_clauses.append(item)
                elif status == "removed":
                    removed_clauses.append(item)

        comparison_response = {
            "added_clauses": added_clauses,
            "modified_clauses": modified_clauses,
            "removed_clauses": removed_clauses,
        }

        # ==================================================
        # Return Restructured Response
        # ==================================================

        return {
            "file1": document_name1,
            "file2": document_name2,
            "comparison_results": comparison_response,
        }

    except HTTPException:
        raise

    except APIError as error:

        status_code = getattr(
            error,
            "code",
            None,
        )

        logger.error(
            "Gemini error during comparison: %s",
            error,
        )

        if status_code == 429:

            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API quota has been "
                    "reached. Please try again later."
                ),
            )

        if status_code in {
            500,
            502,
            503,
            504,
        }:

            raise HTTPException(
                status_code=503,
                detail=(
                    "Gemini AI service is "
                    "temporarily unavailable. "
                    "Please try again."
                ),
            )

        if status_code == 404:

            raise HTTPException(
                status_code=503,
                detail=(
                    "The configured Gemini model "
                    "is unavailable."
                ),
            )

        raise HTTPException(
            status_code=500,
            detail=(
                "Gemini API error occurred "
                "during document comparison."
            ),
        )

    except Exception as error:

        logger.error(
            "Error comparing documents: %s",
            traceback.format_exc(),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to compare the documents."
            ),
        )