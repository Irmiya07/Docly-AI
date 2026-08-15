from pathlib import Path
from typing import List, Dict, Any

from app.services.parser import parser_service


class ChunkService:
    """
    Lightweight document chunking service.

    Splits text into overlapping chunks while preserving
    document metadata.
    """

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ):

        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def _split_text(
        self,
        text: str
    ) -> List[str]:

        text = text.strip()

        if not text:
            return []

        chunks = []

        start = 0
        text_length = len(text)

        while start < text_length:

            end = min(
                start + self.chunk_size,
                text_length
            )

            chunk = text[start:end].strip()

            if chunk:
                chunks.append(chunk)

            if end >= text_length:
                break

            start = end - self.chunk_overlap

        return chunks

    def process_text(
        self,
        file_paths: List[str]
    ) -> List[Dict[str, Any]]:

        all_chunks = []

        for file_path in file_paths:

            parsed_data = (
                parser_service.parse_file(
                    file_path
                )
            )

            if not parsed_data:
                continue

            source = Path(
                file_path
            ).name

            # PDF
            if isinstance(
                parsed_data,
                list
            ):

                for page_data in parsed_data:

                    chunks = self._split_text(
                        page_data["text"]
                    )

                    for index, chunk in enumerate(
                        chunks
                    ):

                        all_chunks.append({
                            "text": chunk,
                            "metadata": {
                                "source": source,
                                "page": page_data["page"],
                                "chunk_index": index
                            }
                        })

            # DOCX / Images
            else:

                chunks = self._split_text(
                    parsed_data
                )

                for index, chunk in enumerate(
                    chunks
                ):

                    all_chunks.append({
                        "text": chunk,
                        "metadata": {
                            "source": source,
                            "page": 1,
                            "chunk_index": index
                        }
                    })

        return all_chunks


chunk_service = ChunkService()