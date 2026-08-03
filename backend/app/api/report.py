import os 

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.chunker import chunk_service
from app.services.report_generator import report_generator

router = APIRouter(
  prefix="/report",
  tags=["report"]
)

@router.post("/")
async def report_router(
  file: UploadFile = File(...)
):
  """
    Upload a legal document,
    analyze it,
    and generate a report.
    """

  os.makedirs("temp", exist_ok=True)

  try:
    file_path = os.path.join("temp", file.filename)

    with open(file_path, "wb") as f:
      f.write(await file.read())

    chunks = chunk_service.process_text([file_path])
    if not chunks:
        raise HTTPException(status_code=400, detail="No text chunks found in the document.")

    contract_text = "\n".join([chunk["text"] for chunk in chunks])

    report = report_generator.generate_report(contract_text)

    os.remove(file_path)

    return report
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
  finally:
    if os.path.exists(file_path):
        os.remove(file_path)
  