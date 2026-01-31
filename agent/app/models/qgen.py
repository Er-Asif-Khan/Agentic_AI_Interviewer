from pydantic import BaseModel
from typing import List

class QGenResponse(BaseModel):
    questions: List[str]

class QGenRequest(BaseModel):
    resume_context: str
    role: str