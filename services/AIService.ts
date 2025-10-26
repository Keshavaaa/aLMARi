import { ClothingItem, WeatherCondition, OutfitRecommendation, Season, FormalityLevel } from '../types/clothing';
import Constants from 'expo-constants';

export class AIService {
  private static GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  private static GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  private static getDeviceId(): string {
    return (Constants.installationId as string) || `device_${Math.random().toString(36).slice(2, 9)}`;
  }

  // ============ CLOTHING ANALYSIS (unchanged) ============
  static async analyzeClothing(imageUri: string): Promise<{
    name: string;
    category: string;
    subcategory: string;
    color: string;
    material: string;
    description: string;
    seasonality: Season[];
    formality: FormalityLevel
  }> {
    try {
      if (!this.GEMINI_API_KEY) {
        throw new Error('Gemini API key not found');
      }

      console.log('🤖 Starting Gemini vision analysis...');

      const base64Image = await this.convertImageToBase64(imageUri);
      const prompt = this.buildClothingAnalysisPrompt();
      
      let lastError: Error | null = null;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📤 Attempt ${attempt}/${maxRetries} - Sending to Gemini...`);
          
          const response = await fetch(`${this.GEMINI_URL}?key=${this.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: base64Image
                    }
                  }
                ]
              }]
            }),
          });

          const responseText = await response.text();

          if (!response.ok) {
            if (response.status === 503 && attempt < maxRetries) {
              const delay = attempt * 2000;
              console.log(`⏳ Model overloaded, retrying in ${delay/1000}s...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            
            console.error('❌ Gemini API error response:', responseText);
            throw new Error(`Gemini API error: ${response.status} - ${responseText}`);
          }

          const data = JSON.parse(responseText);
          const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!aiResponse) {
            throw new Error('No response from Gemini API');
          }

          console.log('✅ Gemini raw response:', aiResponse);
          return this.parseClothingAnalysis(aiResponse);
          
        } catch (err) {
          const error = err as Error;
          lastError = error;
          
          if (!error.message?.includes('503')) {
            throw error;
          }
        }
      }
      
      throw lastError || new Error('All retry attempts failed');

    } catch (err) {
      console.error('❌ Clothing analysis error:', err);
      return this.generateFallbackAnalysis();
    }
  }

  private static async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  }

  private static buildClothingAnalysisPrompt(): string {
    return `
Analyze this clothing item and categorize it accurately. 

RECOGNIZE BOTH WESTERN AND INDIAN/ETHNIC CLOTHING:

Western Categories: Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories, Activewear, Formal, Sleepwear

Indian/Ethnic Categories: Ethnic Wear, Traditional, Indo-Western

Common Indian Items:
- Kurta, Kurta Pajama, Sherwani, Dhoti (men's ethnic)
- Salwar Kameez, Salwar Suit, Churidar, Anarkali (women's ethnic)
- Saree, Lehenga, Ghagra (women's traditional)
- Kurti, Palazzo, Dhoti Pants (indo-western)
- Dupatta (accessory)

Respond with JSON in this EXACT format:
{
  "category": "exact category from list above (e.g., Ethnic Wear, Traditional, Tops, etc.)",
  "subcategory": "specific type (e.g., Kurta, Salwar Kameez, T-Shirt, Jeans)",
  "color": "primary color",
  "material": "cotton/silk/polyester/khadi/denim/wool/etc",
  "seasonality": "summer/winter/monsoon/all-season",
  "formality": "casual/business-casual/formal"
}

IMPORTANT: 
- If you see kurta/salwar/saree → use Ethnic Wear or Traditional category
- If you see shirt/jeans/dress → use Western categories
- Choose the most specific subcategory
`;
  }

  private static normalizeCategory(aiCategory: string): {
    category: string;
    subcategory: string;
  } {
    const category = aiCategory.toLowerCase().trim();
    
    if (category.includes('kurta') || category.includes('sherwani') || 
        category.includes('salwar') || category.includes('churidar') ||
        category.includes('anarkali') || category.includes('dhoti')) {
      return {
        category: 'Ethnic Wear',
        subcategory: aiCategory,
      };
    }
    
    if (category.includes('saree') || category.includes('sari') || 
        category.includes('lehenga') || category.includes('ghagra')) {
      return {
        category: 'Traditional',
        subcategory: aiCategory,
      };
    }
    
    if (category.includes('kurti') || category.includes('palazzo') ||
        category.includes('dhoti pants')) {
      return {
        category: 'Indo-Western',
        subcategory: aiCategory,
      };
    }
    
    if (category.includes('shirt') || category.includes('top') || category.includes('blouse')) {
      return { category: 'Tops', subcategory: aiCategory };
    }
    
    if (category.includes('jeans') || category.includes('pants') || 
        category.includes('trouser') || category.includes('shorts')) {
      return { category: 'Bottoms', subcategory: aiCategory };
    }
    
    if (category.includes('dress')) {
      return { category: 'Dresses', subcategory: aiCategory };
    }
    
    if (category.includes('jacket') || category.includes('coat') || category.includes('blazer')) {
      return { category: 'Outerwear', subcategory: aiCategory };
    }
    
    if (category.includes('shoe') || category.includes('boot') || category.includes('sandal')) {
      return { category: 'Shoes', subcategory: aiCategory };
    }
    
    if (category.includes('dupatta') || category.includes('scarf') || 
        category.includes('belt') || category.includes('bag')) {
      return { category: 'Accessories', subcategory: aiCategory };
    }
    
    return {
      category: 'Other',
      subcategory: aiCategory || 'Item',
    };
  }

  private static parseClothingAnalysis(aiResponse: string): {
    name: string;
    category: string;
    subcategory: string;
    color: string;
    material: string;
    description: string;
    seasonality: Season[];
    formality: FormalityLevel;
  } {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]);
    
      const normalized = this.normalizeCategory(
        parsed.subcategory || parsed.category || 'Unknown'
      );

      const mapSeasonality = (season: string): Season[] => {
        const seasonMap: { [key: string]: Season } = {
          'spring': 'spring',
          'summer': 'summer', 
          'fall': 'fall',
          'winter': 'winter',
          'monsoon': 'summer',
          'all-season': 'all-season'
        };
        return [seasonMap[season.toLowerCase()] || 'all-season'];
      };

      const mapFormality = (formality: string): FormalityLevel => {
        const formalityMap: { [key: string]: FormalityLevel } = {
          'casual': 'casual',
          'business-casual': 'business-casual',
          'formal': 'formal',
          'athletic': 'athletic',
          'traditional': 'formal',
        };
        return formalityMap[formality.toLowerCase()] || 'casual';
      };
    
      return {
        name: `${parsed.color} ${normalized.subcategory}`,
        category: normalized.category,
        subcategory: normalized.subcategory,
        color: parsed.color || 'Unknown',
        material: parsed.material || 'Unknown',
        description: `${parsed.color} ${parsed.material} ${normalized.subcategory}`,
        seasonality: mapSeasonality(parsed.seasonality || 'all-season'),
        formality: mapFormality(parsed.formality || 'casual'),
      };

    } catch (error) {
      console.error('Failed to parse clothing analysis:', error);
      return this.generateFallbackAnalysis();
    }
  }

  private static generateFallbackAnalysis(): {
    name: string;
    category: string;
    subcategory: string;
    color: string;
    material: string;
    description: string;
    seasonality: Season[];
    formality: FormalityLevel;
  } {
    return {
      name: 'Detected Item',
      category: 'Clothing',
      subcategory: 'Item',
      color: 'Unknown',
      material: 'Unknown',
      description: 'AI-detected clothing item',
      seasonality: ['all-season'],
      formality: 'casual',
    };
  }

  // ============ OUTFIT RECOMMENDATIONS (UPDATED WITH WEATHER) ============
  
  static async generateOutfitRecommendation(
    wardrobeItems: ClothingItem[],
    weather: WeatherCondition,
    occasion: string = 'casual day'
  ): Promise<OutfitRecommendation> {
    try {
      if (!this.GEMINI_API_KEY) {
        throw new Error('Gemini API key not found');
      }

      console.log('🎨 Generating outfit with weather context...');
      console.log(`📍 Weather: ${weather.temperature}°C, ${weather.condition} in ${weather.location}`);

      const prompt = this.buildOutfitPrompt(wardrobeItems, weather, occasion);
      
      // Use JSON mode for structured output
      const response = await fetch(`${this.GEMINI_URL}?key=${this.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7, // Balance creativity with consistency
            responseMimeType: 'application/json', // Force JSON output
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates[0]?.content?.parts[0]?.text;

      if (!aiResponse) {
        throw new Error('No response from Gemini API');
      }

      console.log('✅ Gemini outfit response:', aiResponse);
      return this.parseOutfitResponse(aiResponse, wardrobeItems, weather, occasion);

    } catch (error) {
      console.error('❌ Outfit generation error:', error);
      return this.generateFallbackOutfit(wardrobeItems, weather, occasion);
    }
  }

  private static buildOutfitPrompt(
    items: ClothingItem[],
    weather: WeatherCondition,
    occasion: string
  ): string {
    // Format wardrobe items with all relevant details
    const itemsList = items
      .filter(item => !item.inLaundry) // Only available items
      .map((item, idx) => 
        `${idx + 1}. "${item.name}" - ${item.category}/${item.subcategory}, ${item.color}, ${item.material || 'unknown'}, ${item.formality || 'casual'}`
      ).join('\n');

    return `
You are an expert fashion stylist for aLMARi, a digital wardrobe app that helps users in India dress appropriately for weather and occasions.

CURRENT WEATHER in ${weather.location}:
- Temperature: ${weather.temperature}°C
- Condition: ${weather.condition}
- Humidity: ${weather.humidity}%
- Wind Speed: ${weather.windSpeed} km/h
- Description: ${weather.description}

OCCASION: ${occasion}

AVAILABLE WARDROBE ITEMS:
${itemsList}

TASK: Recommend ONE complete outfit (3-5 items) that is:
1. **Weather-appropriate**: 
   - For ${weather.temperature}°C ${weather.condition} weather
   - Consider layering for <20°C, breathable fabrics for >30°C
   - Rain protection if condition is rainy
   - Account for ${weather.humidity}% humidity
2. **Occasion-suitable**: Matches the formality of "${occasion}"
3. **Stylistically coherent**: Colors and styles work together
4. **Culturally aware**: Include Indian/Indo-Western options when available

Return ONLY valid JSON in this exact structure:
{
  "selectedItems": ["exact item name 1", "exact item name 2", "exact item name 3"],
  "confidence": 85,
  "reasoning": "Brief 1-2 sentence explanation focusing on weather suitability"
}

RULES:
- Use exact item names from the list above (copy-paste the quoted names)
- Select 3-5 items that create a complete outfit
- Only choose items marked as available (not in laundry)
- Confidence score: 70-100 based on how well items match weather and occasion
- Keep reasoning concise and focused on weather + occasion fit
`;
  }

  private static parseOutfitResponse(
    aiResponse: string,
    wardrobeItems: ClothingItem[],
    weather: WeatherCondition,
    occasion: string
  ): OutfitRecommendation {
    try {
      // Parse JSON response (already clean from JSON mode)
      let parsed;
      try {
        parsed = JSON.parse(aiResponse);
      } catch {
        // Fallback: extract JSON from text response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');
        parsed = JSON.parse(jsonMatch[0]);
      }
      
      console.log('📦 Parsed outfit:', parsed);

      // Find matching items from wardrobe (fuzzy matching)
      const selectedItems: ClothingItem[] = [];
      
      for (const itemName of parsed.selectedItems || []) {
        const found = wardrobeItems.find(item => 
          // Exact match
          item.name.toLowerCase() === itemName.toLowerCase() ||
          // Contains match
          item.name.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(item.name.toLowerCase()) ||
          // Subcategory match as fallback
          (item.subcategory?.toLowerCase() === itemName.toLowerCase())
       );
        
        if (found && !found.inLaundry) {
          selectedItems.push(found);
          console.log(`✓ Matched: "${itemName}" → ${found.name}`);
        } else {
          console.warn(`✗ Could not match: "${itemName}"`);
        }
      }

      // Ensure we have at least 2 items
      if (selectedItems.length < 2) {
        console.warn('⚠️ Too few items matched, using fallback');
        return this.generateFallbackOutfit(wardrobeItems, weather, occasion);
      }

      return {
        id: `outfit_${Date.now()}`,
        items: selectedItems,
        occasion,
        weather,
        confidence: Math.min(100, Math.max(60, parsed.confidence || 75)),
        reasoning: parsed.reasoning || `Weather-appropriate outfit for ${weather.temperature}°C ${weather.condition} conditions`,
        isScheduled: false,
        createdAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      return this.generateFallbackOutfit(wardrobeItems, weather, occasion);
    }
  }

  private static generateFallbackOutfit(
    wardrobeItems: ClothingItem[],
    weather: WeatherCondition,
    occasion: string
  ): OutfitRecommendation {
    console.log('🔄 Generating fallback outfit...');
    
    // Simple weather-based logic
    const availableItems = wardrobeItems.filter(item => !item.inLaundry);
    
    // Try to pick weather-appropriate items
    let selectedItems: ClothingItem[] = [];
    
    // Cold weather (<20°C): prioritize outerwear + long items
    if (weather.temperature < 20) {
      const outerwear = availableItems.find(i => i.category === 'Outerwear');
      const bottom = availableItems.find(i => i.category === 'Bottoms');
      const top = availableItems.find(i => i.category === 'Tops' || i.category === 'Ethnic Wear');
      selectedItems = [outerwear, top, bottom].filter(Boolean) as ClothingItem[];
    }
    // Hot weather (>30°C): breathable fabrics
    else if (weather.temperature > 30) {
      selectedItems = availableItems
        .filter(i => 
          i.material?.toLowerCase().includes('cotton') ||
          i.material?.toLowerCase().includes('linen') ||
          i.category === 'Ethnic Wear'
        )
        .slice(0, 3);
    }
    // Rainy: waterproof items
    else if (weather.condition === 'rainy') {
      const waterproof = availableItems.find(i => 
        i.category === 'Outerwear' || 
        i.name.toLowerCase().includes('jacket')
      );
      const other = availableItems.filter(i => i !== waterproof).slice(0, 2);
      selectedItems = [waterproof, ...other].filter(Boolean) as ClothingItem[];
    }
    // Default: first 3 items
    else {
      selectedItems = availableItems.slice(0, 3);
    }

    // Ensure at least 2 items
    if (selectedItems.length < 2) {
      selectedItems = availableItems.slice(0, Math.min(3, availableItems.length));
    }

    return {
      id: `outfit_${Date.now()}`,
      items: selectedItems,
      occasion,
      weather,
      confidence: 60,
      reasoning: `Basic weather-appropriate selection for ${weather.temperature}°C ${weather.condition} conditions`,
      isScheduled: false,
      createdAt: new Date().toISOString(),
    };
  }
}
