import pymupdf
from docx import Document
from PIL import Image
import easyocr
import cv2
import numpy as np
from pathlib import Path

reader = easyocr.Reader(['en'])

def parse_pdf(file_path):
    try:
        doc = pymupdf.open(file_path)
        text = ""

        for page in doc:
            page_text = page.get_text()

            if page_text.strip():
                text += page_text + "\n"
            else:
                pix = page.get_pixmap(dpi=300)

                image = Image.frombytes(
                    "RGB",
                    [pix.width, pix.height],
                    pix.samples
                )

                gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)

                _, thresh = cv2.threshold(
                    gray,
                    0,
                    255,
                    cv2.THRESH_BINARY + cv2.THRESH_OTSU
                )

                result = reader.readtext(thresh, detail=0)

                text += "\n".join(result) + "\n"

        doc.close()

        return text.strip()

    except Exception as e:
        print(f"Error occurred while parsing PDF: {e}")
        return None

def parse_doc(file_path):
    try:
        doc = Document(file_path)

        text = ""

        for para in doc.paragraphs:
            text += para.text + "\n"

        return text.strip()

    except Exception as e:
        print(f"Error occurred while parsing DOCX: {e}")
        return None

def parse_image(file_path):
    try:
        image = Image.open(file_path)

        gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)

        _, thresh = cv2.threshold(
            gray,
            0,
            255,
            cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )

        result = reader.readtext(thresh, detail=0)

        return "\n".join(result)

    except Exception as e:
        print(f"Error occurred while parsing image: {e}")
        return None

def parse_file(file_path):
    extension = Path(file_path).suffix.lower()

    if extension == ".pdf":
        return parse_pdf(file_path)

    elif extension in [".doc", ".docx"]:
        return parse_doc(file_path)

    elif extension in [".jpg", ".jpeg", ".png", ".bmp", ".tiff"]:
        return parse_image(file_path)

    else:
        print(f"Unsupported file format: {extension}")
        return None
