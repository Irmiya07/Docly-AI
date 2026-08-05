import os

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.chunker import chunk_service
from app.services.vector_store import vector_store
from app.services.embeddings import embedding_service

router = APIRouter(
  prefix="/upload",
  tags=["upload"],
)

@router.post("/")
async def upload_router(
  files: list[UploadFile] = File(...),
):
  """
    Upload one or more documents,
    generate embeddings,
    and store them in ChromaDB.
    """

  os.makedirs("temp",exist_ok=True)

  total_chunks = 0

  uploaded_files= []

  try:
    for file in files:
      file_path=os.path.join("temp", file.filename)

      with open(file_path, "wb") as f:
        f.write(await file.read())

      chunks=chunk_service.process_text([file_path])

      text=[chunk["text"] for chunk in chunks]

      embeddings=embedding_service.generate_embeddings(text)

      for chunk, embedding in zip(chunks, embeddings):

        chunk["embedding"]=embedding.tolist()

      vector_store.add_documents(chunks)
      uploaded_files.append(file.filename)
      total_chunks += len(chunks)
      os.remove(file_path)

    return {
        "message":"upload successful",
        "uploaded_files": uploaded_files,
        "total_chunks": total_chunks
      }
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))


  