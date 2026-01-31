from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.v1 import router as api_router
import platform

app = FastAPI(
    title="AI Interview Orchestration Service",
    description="Stateless AI backend for resume-based voice interviews",
    version="1.0.0"
)

app.include_router(api_router, prefix="/api/v1")

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["http://localhost:3000", "http://localhost:5000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"], 
    allow_credentials=True,
)

@app.get("/health")
def get_health():
    return {"status": "ok"}

@app.get("/version")
def version():
    return {
        "app": "resume-ai-backend",
        "version": "1.0.0",
        "python": platform.python_version()
    }