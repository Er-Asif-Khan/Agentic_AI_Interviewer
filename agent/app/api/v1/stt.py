from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.concurrency import run_in_threadpool
import tempfile, os, time
from services.stt_client import transcribe_audio

router = APIRouter()

@router.post("/")
async def speech_to_text(audio: UploadFile = File(...)):
    content = await audio.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(413, "Audio too large")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(content)
        path = tmp.name

    try:
        start = time.time()
        text = await run_in_threadpool(transcribe_audio, path)
        duration = time.time() - start
    finally:
        os.remove(path)

    words = text.split()
    confidence = min(0.95, 0.5 + len(words)/100)

    return {
        "transcript": text,
        "confidence": round(confidence, 2),
        "response_time_sec": round(duration, 2),
        "action": "proceed" if len(words) >= 3 else "repeat"
    }