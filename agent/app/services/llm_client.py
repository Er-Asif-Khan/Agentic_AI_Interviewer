import os, json, time, requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

# Azure OpenAI Configuration
GPT_BASE_URL = os.getenv("GPT_BASE_URL")
GPT_KEY = os.getenv("GPT_KEY")

class LLMError(RuntimeError):
    pass

SYSTEM_PROMPT = (
    "You are a senior FAANG-level technical interviewer. "
    "You MUST follow instructions exactly. "
    "You MUST return ONLY valid JSON as requested. "
    "Do NOT add explanations, markdown, or extra text."
)

def _headers() -> Dict[str, str]:
    if not GPT_KEY:
        raise LLMError("GPT API key missing (GPT_KEY)")
    return {
        "api-key": GPT_KEY,
        "Content-Type": "application/json",
    }

def _post(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not GPT_BASE_URL:
        raise LLMError("GPT_BASE_URL not configured")
    
    response = requests.post(
        url=GPT_BASE_URL,
        headers=_headers(),
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()

def call_llm(user_prompt: str, max_retries: int = 2) -> Dict[str, Any]:
    # Azure OpenAI doesn't need model in payload (it's in the URL)
    payload = {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 2000,
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
