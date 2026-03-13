from pydantic import BaseModel, Field
from typing import List, Optional

class QGenResponse(BaseModel):
    questions: List[str]

class QGenRequest(BaseModel):
    resume_context: str
    role: str
    difficulty_level: int = Field(default=2, ge=1, le=5, description="Bloom's taxonomy difficulty level (1-5)")
    topic: Optional[str] = Field(default=None, description="Specific topic to focus the question on")