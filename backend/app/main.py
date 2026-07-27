from fastapi import FastAPI, UploadFile, File
from app.services.parser import parse_file
import os

app = FastAPI(title="Docly AI")

os.makedirs("temp", exist_ok=True)

@app.get("/")
def home():
    return {"message": "Welcome to Docly AI!"}

@app.post("/uploads")
async def upload(files: list[UploadFile] = File(...)):
    results = []
    for file in files:
        file_path = f"temp/{file.filename}"
        with open(file_path, "wb") as f:
            f.write(await file.read())
        text = parse_file(file_path)
        os.remove(file_path)  
        results.append({"filename": file.filename, "text": text})
    return {"results": results}
