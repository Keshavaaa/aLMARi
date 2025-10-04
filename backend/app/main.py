# backend/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import json
import base64
from io import BytesIO
from PIL import Image
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from root folder (go up one level from backend)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

app = FastAPI()

# Configure Gemini API
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))


class ClothingAnalysisRequest(BaseModel):
    image: str  # base64 encoded image
    device_id: str

class OutfitRequest(BaseModel):
    wardrobe: list
    weather: dict
    occasion: str
    device_id: str

@app.post("/analyze-clothing")
async def analyze_clothing(request: ClothingAnalysisRequest):
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(request.image)
        image = Image.open(BytesIO(image_bytes))
        
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = """Analyze this clothing item and return ONLY valid JSON:
        {
          "category": "specific category",
          "subcategory": "specific subcategory", 
          "color": "primary color",
          "material": "fabric type",
          "seasonality": ["Spring", "Summer", "Fall", "Winter"],
          "formality": "casual/smart-casual/semi-formal/formal"
        }"""
        
        response = model.generate_content([prompt, image])
        result = json.loads(response.text)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-outfit")
async def generate_outfit(request: OutfitRequest):
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""Create outfit recommendations for {request.occasion} occasion.
        Weather: {request.weather}
        Wardrobe: {json.dumps(request.wardrobe)}
        
        Return JSON array of outfit suggestions."""
        
        response = model.generate_content(prompt)
        suggestions = json.loads(response.text)
        
        return suggestions
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
