import os, requests
from dotenv import load_dotenv

load_dotenv()

STT_URL = os.getenv("STT_URL")
STT_KEY = os.getenv("STT_KEY")

def transcribe_audio(audio_data: bytes) -> str:
    """
    Transcribe audio using Azure Speech-to-Text API
    
    Args:
        audio_data: Audio file bytes (WAV format)
    
    Returns:
        Transcribed text
    """
    if not STT_URL or not STT_KEY:
        raise RuntimeError("Azure STT credentials not configured (STT_URL, STT_KEY)")
    
    headers = {
        "Ocp-Apim-Subscription-Key": STT_KEY,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Accept": "application/json",
    }
    
    try:
        response = requests.post(
            STT_URL,
            headers=headers,
            data=audio_data,
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        
        # Azure STT response format
        if result.get("RecognitionStatus") == "Success":
            return result.get("DisplayText", "").strip()
        else:
            return ""
            
    except requests.RequestException as e:
        raise RuntimeError(f"Azure STT API error: {str(e)}")
