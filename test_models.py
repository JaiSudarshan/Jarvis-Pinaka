import sys
import os
from google import genai
from google.genai import types
from backend.config import GEMINI_API_KEY

key = os.getenv("GEMINI_API_KEY", "") or GEMINI_API_KEY
if not key:
    print("Error: GEMINI_API_KEY not configured in environment or .env")
    sys.exit(1)

client = genai.Client(api_key=key, http_options={"timeout": 15000})

test_models = [
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3-flash-preview",
    "gemini-3.8-flash",
]

for m in test_models:
    print(f"Testing model: {m}...")
    try:
        response = client.models.generate_content(
            model=m,
            contents="Say 'ONLINE'"
        )
        print(f"--> SUCCESS with {m}: {response.text.strip()}")
        break
    except Exception as e:
        print(f"--> Error with {m}: {type(e).__name__} - {e}")
