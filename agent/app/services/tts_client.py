import os, requests, base64
from dotenv import load_dotenv

load_dotenv()

TTS_URL = os.getenv("TTS_URL")
TTS_KEY = os.getenv("TTS_KEY")

def synthesize_speech(text: str) -> str:
    """
    Convert text to speech using Azure Text-to-Speech API
    
    Args:
        text: Text to convert to speech
    
    Returns:
        Base64 encoded audio (MP3 format)
    """
    if not text or len(text.strip()) < 5:
        raise ValueError("Text too short for TTS")
    
    if not TTS_URL or not TTS_KEY:
        raise RuntimeError("Azure TTS credentials not configured (TTS_URL, TTS_KEY)")
    
    headers = {
        "Ocp-Apim-Subscription-Key": TTS_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
    }
    
    # SSML format for Azure TTS
    ssml = f"""<speak version='1.0' xml:lang='en-US'>
        <voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural'>
            {text}
        </voice>
    </speak>"""
    
    try:
        response = requests.post(
            TTS_URL,
            headers=headers,
            data=ssml.encode('utf-8'),
            timeout=30
        )
        response.raise_for_status()
        
        # Return base64 encoded audio
        audio_data = response.content
        return base64.b64encode(audio_data).decode("utf-8")
        
    except requests.RequestException as e:
        raise RuntimeError(f"Azure TTS API error: {str(e)}")
