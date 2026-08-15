import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY_1 = os.getenv("GEMINI_API_KEY_1") or os.getenv("GEMINI_API_KEY1") or os.getenv("GEMINI_API_KEY")
GEMINI_API_KEY_2 = os.getenv("GEMINI_API_KEY_2") or os.getenv("GEMINI_API_KEY2")
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-3.7-flash")
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
MONGODB_URL = os.getenv("MONGODB_URL")
JWT_SECRET = os.getenv("JWT_SECRET")

# Configurable limits for report generation pipeline
CLAUSE_TOP_K = int(os.getenv("CLAUSE_TOP_K", "6"))
RISK_TOP_K = int(os.getenv("RISK_TOP_K", "6"))
TIMELINE_TOP_K = int(os.getenv("TIMELINE_TOP_K", "6"))
MAX_REPORT_CHUNKS = int(os.getenv("MAX_REPORT_CHUNKS", "10"))
MAX_CONTEXT_CHARS = int(os.getenv("MAX_CONTEXT_CHARS", "25000"))

if not GEMINI_API_KEY_1 and not GEMINI_API_KEY_2:
    raise ValueError("At least one Gemini API key (GEMINI_API_KEY_1 or GEMINI_API_KEY_2) must be set.")
if not MONGODB_URL:
    raise ValueError("MONGODB_URL is not set.")
if not JWT_SECRET:
    raise ValueError("JWT_SECRET is not set.")