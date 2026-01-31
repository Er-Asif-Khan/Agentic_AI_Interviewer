from gtts import gTTS
import base64, tempfile, os

def synthesize_speech(text: str) -> str:
    if not text or len(text.strip()) < 5:
        raise ValueError("Text too short for TTS")
    
    tts = gTTS(text = text, lang="en")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
        path = tmp.name
        tts.save(path)

    with open(path, "rb") as f:
        data = f.read()

    os.remove(path)

    return base64.b64encode(data).decode("utf-8")