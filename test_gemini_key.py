import os
from google import genai
from backend.config import GEMINI_API_KEY

key = os.getenv("GEMINI_API_KEY", "") or GEMINI_API_KEY
if not key:
    print("Error: GEMINI_API_KEY not configured in environment or .env")
    exit(1)

print(f"Testing API key (length: {len(key)}, prefix: {key[:6]}...)")

try:
    client = genai.Client(api_key=key)
    print("Listing available models for this key:")
    models = list(client.models.list(config={"page_size": 10}))
    for m in models:
        print(" - Model:", getattr(m, 'name', str(m)))
except Exception as e:
    print("Error listing models:", type(e), e)

# Test generateContent with candidate models
candidate_models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.8-flash"]
for model_name in candidate_models:
    print(f"\nTesting generateContent with model '{model_name}'...")
    try:
        response = client.models.generate_content(
            model=model_name,
            contents="Hello! Confirm system status in 5 words."
        )
        print("Response received:")
        print(response.text)
        break
    except Exception as e:
        print(f"Error testing model {model_name}:", type(e), e)
