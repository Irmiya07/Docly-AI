import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-2.5-flash")
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set.")