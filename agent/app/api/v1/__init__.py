from fastapi import APIRouter
from . import resume, qgen, stt, tts, evaluate, interview, verdict

router = APIRouter()

router.include_router(resume.router, prefix="/resume", tags=["Resume"])
router.include_router(qgen.router, prefix="/qgen", tags=["Question Generation"])
router.include_router(stt.router, prefix="/stt", tags=["Speech to Text"])
router.include_router(tts.router, prefix="/tts", tags=["Text to Speech"])
router.include_router(evaluate.router, prefix="/evaluate", tags=["Evaluation"])
router.include_router(interview.router, prefix="/interview", tags=["Interview Orchestration"])
router.include_router(verdict.router, prefix="/verdict", tags=["Interview Verdict"])
