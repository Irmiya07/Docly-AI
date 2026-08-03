import os

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.chunker import chunk_service
from app.services.contract_analyzer import contract_analyzer


router = APIRouter(
  prefix="/risk",
  tags=["risk"]
)

@router.post("/")
async def risk_router(
    file: UploadFile = File(...),
):
    os.makedirs("temp", exist_ok=True)

    try:
        file_path = os.path.join("temp", file.filename)

        with open(file_path, "wb") as f:
            f.write(await file.read())

        chunks = chunk_service.process_text([file_path])

        print("Number of chunks:", len(chunks))

        if not chunks:
            raise HTTPException(
                status_code=400,
                detail="No text chunks found in the document."
            )

        contract_text = "\n".join(chunk["text"] for chunk in chunks)

        risk_analysis_results = contract_analyzer.analyze(contract_text)

        risks = risk_analysis_results.get("risks", [])

        return {
            "document": file.filename,
            "total_risk": len(risks),
            "risks": risks
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)