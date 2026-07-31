from pathlib import Path
from typing import List, Dict, Union

import fitz  # PyMuPDF
import cv2
import easyocr
import numpy as np
from docx import Document
from PIL import Image


class ParserService:
    """
    Service for parsing PDF, DOCX and image files.
    """

    def __init__(self):
        self.reader = easyocr.Reader(["en"])

    def _ocr_image(self, image: Image.Image) -> str:
        """
        Extract text from an image using OCR.
        """

        gray = cv2.cvtColor(
            np.array(image),
            cv2.COLOR_RGB2GRAY
        )

        _, thresh = cv2.threshold(
            gray,
            0,
            255,
            cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )

        result = self.reader.readtext(
            thresh,
            detail=0
        )

        return "\n".join(result)

    def parse_pdf(
        self,
        file_path: str
    ) -> List[Dict]:

        document = fitz.open(file_path)

        pages = []

        for page_number, page in enumerate(
            document,
            start=1
        ):

            text = page.get_text().strip()

            if not text:

                pix = page.get_pixmap(dpi=300)

                image = Image.frombytes(
                    "RGB",
                    (pix.width, pix.height),
                    pix.samples
                )

                text = self._ocr_image(image)

            pages.append({
                "page": page_number,
                "text": text
            })

        document.close()

        return pages

    def parse_docx(
        self,
        file_path: str
    ) -> str:

        document = Document(file_path)

        return "\n".join(
            paragraph.text
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        )

    def parse_image(
        self,
        file_path: str
    ) -> str:

        image = Image.open(file_path)

        return self._ocr_image(image)

    def parse_file(
        self,
        file_path: str
    ) -> Union[List[Dict], str]:

        extension = Path(file_path).suffix.lower()

        if extension == ".pdf":
            return self.parse_pdf(file_path)

        if extension in [".doc", ".docx"]:
            return self.parse_docx(file_path)

        if extension in [
            ".jpg",
            ".jpeg",
            ".png",
            ".bmp",
            ".tiff"
        ]:
            return self.parse_image(file_path)

        raise ValueError(
            f"Unsupported file format: {extension}"
        )


parser_service = ParserService()