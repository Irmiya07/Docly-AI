import asyncio
import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.upload import router as upload_router
from app.api.chat import router as chat_router
from app.api.search import router as search_router
from app.api.compare import router as compare_router
from app.api.report import router as report_router
from app.api.clause import router as clause_router
from app.api.risk import router as risk_router
from app.api.timeline import router as timeline_router
from app.api.auth import router as auth_router
from app.services.vector_store import vector_store
from app.services.llm import GeminiQuotaExceededError


app = FastAPI(
    title="Docly API",
    version="1.0.0"
)

@app.exception_handler(GeminiQuotaExceededError)
async def gemini_quota_exceeded_handler(request: Request, exc: GeminiQuotaExceededError):
    return JSONResponse(
        status_code=429,
        content={"detail": "Gemini API quota has been reached. Please try again later."}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import logging

logger = logging.getLogger("docly.main")

async def clean_guest_sessions_periodically():
    while True:
        try:
            # Clean chunks older than 30 minutes
            threshold = time.time() - 1800
            deleted_count = vector_store.delete_expired_guests(threshold)
            if deleted_count > 0:
                logger.info(f"[Cleanup] Deleted {deleted_count} expired guest vectors.")
        except Exception as e:
            logger.error(f"[Cleanup] Error in guest session cleanup background task: {e}")
        await asyncio.sleep(600)  # Run every 10 minutes

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(clean_guest_sessions_periodically())

@app.get("/")
async def root():
    return {"message": "Welcome to the Docly API!"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": time.time()
    }

app.include_router(upload_router)
app.include_router(chat_router)
app.include_router(search_router)
app.include_router(compare_router)
app.include_router(report_router)
app.include_router(clause_router)
app.include_router(risk_router)
app.include_router(timeline_router)
app.include_router(auth_router)


