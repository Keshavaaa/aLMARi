import { ClothingItem, WeatherCondition, OutfitRecommendation } from '../types/clothing';
import Constants from 'expo-constants';

export class AIService {
  private static GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  private static GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

  private static getDeviceId(): string {
    return (Constants.installationId as string) || `device_${Math.random().toString(36).slice(2, 9)}`;
  }

  static async generateOutfitRecommendation(
    wardrobeItems: ClothingItem[],
    weather: WeatherCondition,
    occasion: string = 'casual day'
  ): Promise<OutfitRecommendation> {
    try {
      if (!this.GEMINI_API_KEY) {
        throw new Error('Gemini API key not found');
      }

      const prompt = this.buildOutfitPrompt(wardrobeItems, weather, occasion);
      
      const response = await fetch(`${this.GEMINI_URL}?key=${this.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates[0]?.content?.parts[0]?.text;

      if (!aiResponse) {
        throw new Error('No response from Gemini API');
      }

      return this.parseOutfitResponse(aiResponse, wardrobeItems, weather, occasion);

    } catch (error) {
      console.error('Outfit generation error:', error);
      // Return fallback recommendation
      return this.generateFallbackOutfit(wardrobeItems, weather, occasion);
    }
  }

  private static buildOutfitPrompt(
    items: ClothingItem[],
    weather: WeatherCondition,
    occasion: string
  ): string {
    const itemsList = items.map(item => 
      `- ${item.name} (${item.category}, ${item.color}, ${item.material || 'unknown material'})`
    ).join('\n');

    return `
You are a professional fashion stylist. Create an outfit recommendation based on:

WARDROBE ITEMS:
${itemsList}

WEATHER CONDITIONS:
- Temperature: ${weather.temperature}°C
- Condition: ${weather.condition}
- Humidity: ${weather.humidity}%
- Description: ${weather.description}

OCCASION: ${occasion}

Please respond with a JSON object in this exact format:
{
  "selectedItems": ["item_name_1", "item_name_2", "item_name_3"],
  "confidence": 85,
  "reasoning": "Brief explanation of why this outfit works for the weather and occasion"
}

Select 3-5 items that work well together for the weather and occasion. Only use item names that exist in the wardrobe list above.
`;
  }

  private static parseOutfitResponse(
    aiResponse: string,
    wardrobeItems: ClothingItem[],
    weather: WeatherCondition,
    occasion: string
  ): OutfitRecommendation {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Find matching items from wardrobe
      const selectedItems = parsed.selectedItems
        .map((itemName: string) => 
          wardrobeItems.find(item => 
            item.name.toLowerCase().includes(itemName.toLowerCase()) ||
            itemName.toLowerCase().includes(item.name.toLowerCase())
          )
        )
        .filter(Boolean) as ClothingItem[];

      return {
        id: `outfit_${Date.now()}`,
        items: selectedItems,
        occasion,
        weather,
        confidence: parsed.confidence || 75,
        reasoning: parsed.reasoning || 'AI-generated outfit recommendation',
        isScheduled: false,
        createdAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.generateFallbackOutfit(wardrobeItems, weather, occasion);
    }
  }

  private static generateFallbackOutfit(
    wardrobeItems: ClothingItem[],
    weather: WeatherCondition,
    occasion: string
  ): OutfitRecommendation {
    // Simple fallback logic
    const availableItems = wardrobeItems.filter(item => !item.inLaundry);
    const selectedItems = availableItems.slice(0, Math.min(3, availableItems.length));

    return {
      id: `outfit_${Date.now()}`,
      items: selectedItems,
      occasion,
      weather,
      confidence: 60,
      reasoning: 'Fallback recommendation based on available items',
      isScheduled: false,
      createdAt: new Date().toISOString(),
    };
  }

}
