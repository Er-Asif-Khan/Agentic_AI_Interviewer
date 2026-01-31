import json, wave
from vosk import Model, KaldiRecognizer

MODEL_PATH = "models/stt/vosk-model-en-us-0.22"
model = Model(MODEL_PATH)

def transcribe_audio(path: str) -> str:
    wf = wave.open(path, "rb")
    rec = KaldiRecognizer(model, wf.getframerate())
    transcript = ""

    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            result = rec.Result()
            transcript += json.loads(result).get("text", "")
    
    transcript += json.loads(rec.FinalResult()).get("text", "")
    return transcript.strip()