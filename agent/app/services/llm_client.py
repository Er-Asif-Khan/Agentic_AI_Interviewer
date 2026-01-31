import os, json, time, requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

class LLMError(RuntimeError):
    pass

SYSTEM_PROMPT = (
    "You are a senior FAANG-level technical interviewer. "
    "You MUST follow instructions exactly. "
    "You MUST return ONLY valid JSON as requested. "
    "Do NOT add explanations, markdown, or extra text."
)

def _headers() -> Dict[str, str]:
    if not OPENROUTER_API_KEY:
        raise LLMError("LLM API key missing")
    return {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("SITE_URL", "http://localhost"),
        "X-Title": os.getenv("SITE_NAME", "AI Interview Orchestrator"),
    }

def _post(payload: Dict[str, Any]) -> Dict[str, Any]:
    response = requests.post(
        url=OPENROUTER_URL,
        headers=_headers(),
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()

def call_llm(user_prompt: str, max_retries: int = 2) -> Dict[str, Any]:
    if not OPENROUTER_MODEL:
        raise LLMError("LLM model not configured")
    
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,
    }

    start = time.time()
    last_error = None
    
    for attempt in range(max_retries + 1):
        try:
            raw = _post(payload)
            content = raw.get("choices", [{}])[0].get("message", {}).get("content")

            if not content:
                raise LLMError("Empty response from LLM")
            
            try:
                return json.loads(content)
            except json.JSONDecodeError as e:
                raise LLMError(f"Invalid JSON from LLM: {content}") from e
            
        except (requests.RequestException, LLMError) as e:
            last_error = e
            if attempt < max_retries:
                time.sleep(1.5 * (attempt + 1))
            else: 
                break

    duration = round(time.time() - start, 2)

    raise LLMError(
        f"LLM call failed after {duration}s: {last_error}"
    )