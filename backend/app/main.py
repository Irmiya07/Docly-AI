from fastapi import FastAPI, UploadFile, File, HTTPException
import os

from app.services.chunker import chunk_service
from app.services.embeddings import embedding_service
from app.services.vector_store import vector_store
from app.services.retriever import retriever
from app.services.llm import llm_service
from app.services.report_generator import report_generator

app = FastAPI()


@app.post("/upload")
async def upload(files: list[UploadFile] = File(...)):

    os.makedirs("temp", exist_ok=True)

    uploaded_chunks = []

    for file in files:

        file_path = os.path.join(
            "temp",
            file.filename
        )

        with open(file_path, "wb") as f:
            f.write(await file.read())

        chunks = chunk_service.process_text(
            [file_path]
        )

        texts = [
            chunk["text"]
            for chunk in chunks
        ]

        embeddings = embedding_service.generate_embeddings(
            texts
        )

        for chunk, embedding in zip(
            chunks,
            embeddings
        ):
            chunk["embedding"] = embedding.tolist()

        vector_store.add_documents(chunks)

        uploaded_chunks.extend(chunks)

        os.remove(file_path)

    return {
        "message": "Upload successful",
        "chunks": len(uploaded_chunks)
    }


@app.post("/ask")
async def ask(question: str):

    retrieved_chunks = retriever.retrieve(question)

    answer = llm_service.generate_answer(
        question,
        retrieved_chunks
    )

    return {
        "question": question,
        "answer": answer,
        "sources": retrieved_chunks
    }


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...)
):

    os.makedirs("temp", exist_ok=True)

    file_path = os.path.join(
        "temp",
        file.filename
    )

    with open(file_path, "wb") as f:
        f.write(await file.read())

    chunks = chunk_service.process_text(
        [file_path]
    )

    os.remove(file_path)

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="No content extracted."
        )

    contract_text = "\n".join(
        chunk["text"]
        for chunk in chunks
    )

    report = report_generator.generate_report(
        contract_text
    )

    return report