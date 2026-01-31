from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from models.tts import TTSRequest, TTSResponse
from services.tts_client import synthesize_speech

router = APIRouter()

@router.post("/", response_model=TTSResponse)
async def text_to_speech(payload: TTSRequest):
    try:
        audio = await run_in_threadpool(synthesize_speech, payload.text)
        return TTSResponse(audio=audio)
    except ValueError as e:
        raise HTTPException(400, str(e))