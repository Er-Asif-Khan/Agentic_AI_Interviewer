from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.concurrency import run_in_threadpool
import time
from app.services.stt_client import transcribe_audio

router = APIRouter()

@router.post("/")
async def speech_to_text(audio: UploadFile = File(...)):
    content = await audio.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(413, "Audio too large")
    
    try:
        start = time.time()
        # Pass audio bytes directly to Azure STT
        text = await run_in_threadpool(transcribe_audio, content)
        duration = time.time() - start
    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {str(e)}")

    words = text.split() if text else []
    confidence = min(0.95, 0.5 + len(words)/100) if words else 0.0

    return {
        "transcript": text,
        "confidence": round(confidence, 2),
        "response_time_sec": round(duration, 2),
        "action": "proceed" if len(words) >= 3 else "repeat"
    }
