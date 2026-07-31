from pathlib import Path
from typing import List, Dict, Any

from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.services.parser import parser_service


class ChunkService:
    """
    Splits parsed documents into chunks while preserving metadata.
    """

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

    def process_text(
        self,
        file_paths: List[str]
    ) -> List[Dict[str, Any]]:

        all_chunks = []

        for file_path in file_paths:

            parsed_data = parser_service.parse_file(file_path)

            if not parsed_data:
                continue

            source = Path(file_path).name

            # PDF (page-wise)
            if isinstance(parsed_data, list):

                for page_data in parsed_data:

                    chunks = self.splitter.split_text(
                        page_data["text"]
                    )

                    for index, chunk in enumerate(chunks):

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

                chunks = self.splitter.split_text(parsed_data)

                for index, chunk in enumerate(chunks):

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