from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Session, create_engine, select, or_
from typing import Optional, List
import google.generativeai as genai
import json
import base64
from io import BytesIO
from PIL import Image
import os
from dotenv import load_dotenv
from pathlib import Path
from rembg import remove
from colorthief import ColorThief
from sklearn.cluster import KMeans
import numpy as np
from typing import List, Dict, Any
import uuid
from pathlib import Path
import tempfile

env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

DATABASE_URL = "sqlite:///./wardrobe.db"
engine = create_engine(DATABASE_URL, echo=False)

UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

class WardrobeItemBase(SQLModel):
    name: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    color: Optional[str] = None
    material: Optional[str] = None
    seasonality: Optional[str] = None
    formality: Optional[str] = None
    image_uri: Optional[str] = None
    in_laundry: bool = False

class WardrobeItem(WardrobeItemBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

class WardrobeItemCreate(WardrobeItemBase):
    pass

class WardrobeItemUpdate(SQLModel):
    name: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    color: Optional[str] = None
    material: Optional[str] = None
    seasonality: Optional[str] = None
    formality: Optional[str] = None
    image_uri: Optional[str] = None
    in_laundry: Optional[bool] = None

class ClothingAnalysisRequest(BaseModel):
    image: str  # base64 encoded image
    device_id: str

class OutfitRequest(BaseModel):
    wardrobe: list
    weather: dict
    occasion: str
    device_id: str

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

app = FastAPI(title="aLMARi Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/ping")
def ping():
    return {"status": "ok", "message": "aLMARi Backend is running"}

# ==================== WARDROBE CRUD ENDPOINTS ====================

@app.get("/wardrobe", response_model=List[WardrobeItem])
def list_wardrobe(
    search: Optional[str] = Query(None, description="Search by name, category, or color"),
    session: Session = Depends(get_session)
):
    """
    List all wardrobe items with optional search filtering
    Search works on: name, category, subcategory, color
    """
    statement = select(WardrobeItem)
    
    if search:
        search_term = f"%{search.lower()}%"
        statement = statement.where(
            or_(
                WardrobeItem.name.ilike(search_term),
                WardrobeItem.category.ilike(search_term),
                WardrobeItem.subcategory.ilike(search_term),
                WardrobeItem.color.ilike(search_term)
            )
        )
    
    items = session.exec(statement).all()
    return items

@app.post("/wardrobe", response_model=WardrobeItem, status_code=201)
def create_wardrobe_item(
    item: WardrobeItemCreate, 
    session: Session = Depends(get_session)
):
    """Create a new wardrobe item"""
    db_item = WardrobeItem.model_validate(item)
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item

@app.get("/wardrobe/{item_id}", response_model=WardrobeItem)
def get_wardrobe_item(
    item_id: int, 
    session: Session = Depends(get_session)
):
    """Get a single wardrobe item by ID"""
    item = session.get(WardrobeItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/wardrobe/{item_id}", response_model=WardrobeItem)
def update_wardrobe_item(
    item_id: int, 
    item_update: WardrobeItemUpdate, 
    session: Session = Depends(get_session)
):
    """Update a wardrobe item"""
    db_item = session.get(WardrobeItem, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item_data = item_update.model_dump(exclude_unset=True)
    for key, value in item_data.items():
        setattr(db_item, key, value)
    
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item

@app.delete("/wardrobe/{item_id}", status_code=204)
def delete_wardrobe_item(
    item_id: int, 
    session: Session = Depends(get_session)
):
    """Delete a wardrobe item"""
    item = session.get(WardrobeItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    session.delete(item)
    session.commit()
    return None

# ==================== IMAGE PROCESSING ENDPOINTS ====================

def rgb_to_hex(rgb):
    """Convert RGB tuple to hex color string"""
    return '#{:02x}{:02x}{:02x}'.format(rgb[0], rgb[1], rgb[2])
def detect_colors_kmeans(image_data: bytes, num_colors: int = 5) -> List[Dict[str, Any]]:
    """
    Extract dominant colors using k-means clustering (more accurate than ColorThief)
    
    Args:
        image_data: Raw image bytes
        num_colors: Number of dominant colors to extract
        
    Returns:
        list of color dictionaries with rgb, hex, frequency, and name
    """
    try:
        # Open and resize image for faster processing
        image = Image.open(BytesIO(image_data)).convert('RGB')
        image = image.resize((150, 150))
        
        # Convert to numpy array
        pixels = np.array(image).reshape(-1, 3)
        
        # Remove pure white and pure black (often background)
        pixels = pixels[~np.all(pixels == [255, 255, 255], axis=1)]
        pixels = pixels[~np.all(pixels == [0, 0, 0], axis=1)]
        
        if len(pixels) == 0:
            pixels = np.array(image).reshape(-1, 3)
        
        # Use k-means to find dominant colors
        kmeans = KMeans(n_clusters=min(num_colors, len(pixels)), random_state=42, n_init=10)
        kmeans.fit(pixels)
        
        # Get cluster centers (dominant colors)
        colors = kmeans.cluster_centers_.astype(int)
        
        # Count pixels in each cluster for frequency
        from collections import Counter
        labels = kmeans.labels_
        label_counts = Counter(labels)
        total_pixels = len(labels)
        
        # Build result
        result = []
        for i, color in enumerate(colors):
            frequency = label_counts[i] / total_pixels
            result.append({
                "rgb": color.tolist(),
                "hex": rgb_to_hex(tuple(color)),
                "frequency": round(frequency, 3)
            })
        
        # Sort by frequency
        result.sort(key=lambda x: x['frequency'], reverse=True)
        
        return result
        
    except Exception as e:
        print(f"❌ K-means color detection failed: {str(e)}")
        return [{
            "rgb": [255, 255, 255],
            "hex": "#FFFFFF",
            "frequency": 1.0
        }]


@app.post("/api/remove-background")
async def remove_background_api(file: UploadFile = File(...)):
    """Remove background from uploaded image using rembg + add white background"""
    try:
        content = await file.read()
        
        # Step 1: Remove background (returns RGBA with transparency)
        output = remove(content)
        
        # Step 2: Open the transparent image
        img_rgba = Image.open(BytesIO(output))
        
        # Step 3: Create white background and composite
        if img_rgba.mode == 'RGBA':
            # Create white RGB background same size as image
            white_bg = Image.new('RGB', img_rgba.size, (255, 255, 255))
            
            # Paste transparent image on white background using alpha as mask
            white_bg.paste(img_rgba, mask=img_rgba.split()[3])  # split()[3] = alpha channel
            
            final_image = white_bg
        else:
            # If no alpha channel, convert directly to RGB
            final_image = img_rgba.convert('RGB')
        
        # Step 4: Convert to bytes for base64 encoding
        output_buffer = BytesIO()
        final_image.save(output_buffer, format='JPEG', quality=95)  # JPEG with white bg
        output_buffer.seek(0)
        
        # Convert to base64 for React Native
        base64_image = base64.b64encode(output_buffer.read()).decode()
        
        return {
            "success": True,
            "data": {
                "processed_image": f"data:image/jpeg;base64,{base64_image}",  # Changed to JPEG
                "width": final_image.width,
                "height": final_image.height
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Background removal failed: {str(e)}"
        }



@app.post("/image/remove-bg")
async def remove_background(file: UploadFile = File(...)):
    """Remove background from uploaded image using rembg (ORIGINAL endpoint)"""
    try:
        content = await file.read()
        output = remove(content)
        return StreamingResponse(BytesIO(output), media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Background removal failed: {str(e)}")

@app.post("/api/detect-colors")
async def detect_colors_api(file: UploadFile = File(...)):
    """
    Detect dominant colors using k-means clustering (NEW endpoint for React Native)
    More accurate than ColorThief
    """
    try:
        content = await file.read()
        colors = detect_colors_kmeans(content, num_colors=5)
        
        return {
            "success": True,
            "data": {
                "dominant_colors": colors
            }
        }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"Color detection failed: {str(e)}"
        }

@app.post("/api/process-clothing")
async def process_clothing_complete(file: UploadFile = File(...)):
    """
    Complete processing pipeline for React Native:
    - Background removal with rembg + white background
    - Color detection with k-means
    Returns processed image + colors in React Native compatible format
    """
    try:
        content = await file.read()
        
        # Step 1: Remove background
        bg_removed = remove(content)
        
        # Step 2: Add white background
        img_rgba = Image.open(BytesIO(bg_removed))
        
        if img_rgba.mode == 'RGBA':
            white_bg = Image.new('RGB', img_rgba.size, (255, 255, 255))
            white_bg.paste(img_rgba, mask=img_rgba.split()[3])
            final_image = white_bg
        else:
            final_image = img_rgba.convert('RGB')
        
        # Step 3: Detect colors using k-means (from original image)
        colors = detect_colors_kmeans(content, num_colors=5)
        
        # Step 4: Convert to base64 for React Native
        output_buffer = BytesIO()
        final_image.save(output_buffer, format='JPEG', quality=95)
        output_buffer.seek(0)
        
        base64_image = base64.b64encode(output_buffer.read()).decode()
        
        return {
            "success": True,
            "data": {
                "processed_image": f"data:image/jpeg;base64,{base64_image}",
                "dominant_colors": colors,
                "width": final_image.width,
                "height": final_image.height
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Processing failed: {str(e)}"
        }



@app.post("/image/detect-color")
async def detect_color(file: UploadFile = File(...)):
    """Detect dominant color from clothing image using ColorThief"""
    try:
        content = await file.read()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            color_thief = ColorThief(tmp_path)
            dominant_color = color_thief.get_color(quality=1)
            palette = color_thief.get_palette(color_count=5, quality=1)
            
            return {
                "dominant_color": rgb_to_hex(dominant_color),
                "dominant_color_rgb": dominant_color,
                "palette": [rgb_to_hex(c) for c in palette],
                "palette_rgb": palette
            }
        finally:
            os.unlink(tmp_path)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Color detection failed: {str(e)}")

@app.post("/image/process-and-add")
async def process_and_add_item(
    file: UploadFile = File(...),
    name: str = Query(..., description="Item name"),
    session: Session = Depends(get_session)
):
    """
    Complete pipeline: Upload image → Remove background + white bg → Detect color → Analyze with AI → Save to wardrobe
    FIXED: Saves image as FILE instead of base64 to avoid SQLite row size limit
    """
    try:
        content = await file.read()
        
        # Step 1: Remove background + add white background
        bg_removed = remove(content)
        img_rgba = Image.open(BytesIO(bg_removed))
        
        if img_rgba.mode == 'RGBA':
            white_bg = Image.new('RGB', img_rgba.size, (255, 255, 255))
            white_bg.paste(img_rgba, mask=img_rgba.split()[3])
            final_image = white_bg
        else:
            final_image = img_rgba.convert('RGB')
        
        # Step 2: Save image as FILE (not base64)
        image_filename = f"{uuid.uuid4()}.jpg"
        image_path = UPLOAD_DIR / image_filename
        final_image.save(image_path, format='JPEG', quality=95)
        
        # Store relative path for database
        image_uri = f"uploads/{image_filename}"
        
        # Step 3: Detect dominant color
        final_buffer = BytesIO()
        final_image.save(final_buffer, format='JPEG', quality=95)
        final_buffer.seek(0)
        colors = detect_colors_kmeans(final_buffer.read(), num_colors=5)
        dominant_color_hex = colors[0]['hex'] if colors else "#FFFFFF"
        
        # Step 4: AI Analysis with Gemini
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = """Analyze this clothing item and return ONLY valid JSON:
        {
          "category": "specific category (e.g., Tops, Bottoms, Dresses, Outerwear)",
          "subcategory": "specific subcategory (e.g., T-Shirt, Jeans, Blazer)", 
          "material": "fabric type",
          "seasonality": "Spring,Summer,Fall,Winter (comma-separated applicable seasons)",
          "formality": "casual or smart-casual or semi-formal or formal"
        }"""
        
        response = model.generate_content([prompt, final_image])
        
        # Parse AI response
        try:
            ai_analysis = json.loads(response.text.strip().replace('``````', ''))
        except:
            ai_analysis = {}
        
        # Step 5: Create wardrobe item with FILE PATH (not base64)
        new_item = WardrobeItem(
            name=name,
            category=ai_analysis.get("category"),
            subcategory=ai_analysis.get("subcategory"),
            color=dominant_color_hex,
            material=ai_analysis.get("material"),
            seasonality=ai_analysis.get("seasonality"),
            formality=ai_analysis.get("formality"),
            image_uri=image_uri,  # ✅ Just the file path, not base64
            in_laundry=False
        )
        
        session.add(new_item)
        session.commit()
        session.refresh(new_item)
        
        return {
            "item": new_item,
            "analysis": ai_analysis,
            "detected_color": dominant_color_hex,
            "image_url": f"/uploads/{image_filename}"  # Return URL to access image
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

# ==================== AI ENDPOINTS ====================

@app.post("/analyze-clothing")
async def analyze_clothing(request: ClothingAnalysisRequest):
    """Original Gemini analysis endpoint (kept for compatibility)"""
    try:
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
        result = json.loads(response.text.strip().replace('``````', ''))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-outfit")
async def generate_outfit(request: OutfitRequest):
    """Generate outfit recommendations using AI"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""Create outfit recommendations for {request.occasion} occasion.
        Weather: {request.weather}
        Wardrobe: {json.dumps(request.wardrobe)}
        
        Return JSON array of outfit suggestions."""
        
        response = model.generate_content(prompt)
        suggestions = json.loads(response.text.strip().replace('``````', ''))
        
        return suggestions
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== UTILITY ENDPOINTS ====================

@app.get("/wardrobe/stats")
def get_wardrobe_stats(session: Session = Depends(get_session)):
    """Get wardrobe statistics"""
    total = len(session.exec(select(WardrobeItem)).all())
    in_laundry = len(session.exec(select(WardrobeItem).where(WardrobeItem.in_laundry == True)).all())
    
    categories = {}
    items = session.exec(select(WardrobeItem)).all()
    for item in items:
        cat = item.category or "Uncategorized"
        categories[cat] = categories.get(cat, 0) + 1
    
    return {
        "total_items": total,
        "in_laundry": in_laundry,
        "categories": categories
    }
