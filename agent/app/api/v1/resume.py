from fastapi import APIRouter, UploadFile, File, HTTPException
from services.resume_extractor import extract_resume_text
import tempfile, os

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx"}

@router.post("/context")
async def extract_context(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Only PDF and DOCX supported")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        resume_text = extract_resume_text(tmp_path)
    finally:
        os.remove(tmp_path)

    if not resume_text.strip():
        raise HTTPException(400, "Failed to extract resume text")
    
    resume_text = " ".join(resume_text.split())
    
    return {
        "resume_context": resume_text[:6000],
        "length": len(resume_text)
    }