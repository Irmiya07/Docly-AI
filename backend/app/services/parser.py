from pathlib import Path
from typing import List, Dict, Union

import fitz
from docx import Document


class ParserService:
    """
    Service for parsing PDF, DOCX, and DOC files.
    """

    def parse_pdf(
        self,
        file_path: str
    ) -> List[Dict]:
        document = fitz.open(file_path)
        pages = []

        try:
            for page_number, page in enumerate(
                document,
                start=1
            ):
                text = page.get_text().strip()
                pages.append({
                    "page": page_number,
                    "text": text
                })
        finally:
            document.close()

        return pages

    def parse_docx(
        self,
        file_path: str
    ) -> str:
        document = Document(
            file_path
        )
        return "\n".join(
            paragraph.text
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        )

    def parse_file(
        self,
        file_path: str
    ) -> Union[List[Dict], str]:
        extension = Path(
            file_path
        ).suffix.lower()

        if extension == ".pdf":
            return self.parse_pdf(
                file_path
            )

        if extension in [
            ".doc",
            ".docx"
        ]:
            return self.parse_docx(
                file_path
            )

        raise ValueError(
            f"Unsupported file format: {extension}"
        )


parser_service = ParserService()