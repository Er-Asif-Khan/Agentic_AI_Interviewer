from pydantic import BaseModel, Field

class TTSRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=5,
        description="Text to convert into speech"
    )

class TTSResponse(BaseModel):
    audio: str = Field(
        ...,
        description="Base64-encoded MP3 audio"
    )