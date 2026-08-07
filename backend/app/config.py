import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-2.5-flash")
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
MONGODB_URL = os.getenv("MONGODB_URL")
JWT_SECRET = os.getenv("JWT_SECRET")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set.")
if not MONGODB_URL:
    raise ValueError("MONGODB_URL is not set.")
if not JWT_SECRET:
    raise ValueError("JWT_SECRET is not set.")