from fastapi import FastAPI

from app.api.upload import router as upload_router
from app.api.chat import router as chat_router
from app.api.search import router as search_router
from app.api.compare import router as compare_router
from app.api.report import router as report_router
from app.api.clause import router as clause_router
from app.api.risk import router as risk_router
from app.api.timeline import router as timeline_router

app = FastAPI(
    title="Docly API",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {"message": "Welcome to the Docly API!"}

app.include_router(upload_router)
app.include_router(chat_router)
app.include_router(search_router)
app.include_router(compare_router)
app.include_router(report_router)
app.include_router(clause_router)
app.include_router(risk_router)
app.include_router(timeline_router)