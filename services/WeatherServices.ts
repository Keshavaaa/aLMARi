// services/WeatherService.ts
import * as Location from 'expo-location';
import { WeatherCondition } from '../types/clothing';

export class WeatherService {
  private static API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY; // Note: EXPO_PUBLIC_ prefix
  private static BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
  
  static async getCurrentWeather(): Promise<WeatherCondition> {
    try {
      // Try to get user's location first
      const location = await this.getUserLocation();
      
      if (location) {
        return await this.getWeatherByCoordinates(location.latitude, location.longitude);
      } else {
        // Fallback to default city (Mumbai for India)
        console.warn('Location not available, using default city');
        return await this.getWeatherByCity('Mumbai');
      }
      
    } catch (error) {
      console.warn('Weather fetch failed, using fallback:', error);
      return this.getDefaultWeather();
    }
  }
  
  private static async getUserLocation(): Promise<{latitude: number, longitude: number} | null> {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return null;
      }
      
      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000, // 10 seconds timeout
      });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
    } catch (error) {
      console.warn('Failed to get user location:', error);
      return null;
    }
  }
  
  private static async getWeatherByCoordinates(lat: number, lon: number): Promise<WeatherCondition> {
    if (!this.API_KEY) {
      throw new Error('OpenWeather API key not found');
    }
    
    const response = await fetch(
      `${this.BASE_URL}?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      throw new Error(`Weather API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      temperature: Math.round(data.main.temp),
      condition: this.mapWeatherCondition(data.weather[0].main),
      humidity: data.main.humidity,
      windSpeed: Math.round((data.wind?.speed || 0) * 3.6), // Convert m/s to km/h
      description: data.weather[0].description,
      location: data.name,
    };
  }
  
  static async getWeatherByCity(city: string): Promise<WeatherCondition> {
    try {
      if (!this.API_KEY) {
        throw new Error('OpenWeather API key not found');
      }
      
      const response = await fetch(
        `${this.BASE_URL}?q=${city}&appid=${this.API_KEY}&units=metric`
      );
      
      if (!response.ok) {
        throw new Error(`Weather API failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        temperature: Math.round(data.main.temp),
        condition: this.mapWeatherCondition(data.weather[0].main),
        humidity: data.main.humidity,
        windSpeed: Math.round((data.wind?.speed || 0) * 3.6), // Convert m/s to km/h
        description: data.weather[0].description,
        location: data.name,
      };
      
    } catch (error) {
      console.error('Weather fetch failed:', error);
      throw error;
    }
  }
  
  private static mapWeatherCondition(condition: string): WeatherCondition['condition'] {
    const lowerCondition = condition.toLowerCase();
    
    if (lowerCondition.includes('clear') || lowerCondition.includes('sun')) {
      return 'sunny';
    } else if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
      return 'rainy';
    } else if (lowerCondition.includes('snow')) {
      return 'snowy';
    } else if (lowerCondition.includes('wind')) {
      return 'windy';
    } else {
      return 'cloudy';
    }
  }
  
  private static getDefaultWeather(): WeatherCondition {
    return {
      temperature: 28, // Typical temperature for India
      condition: 'sunny',
      humidity: 65,
      windSpeed: 12,
      description: 'Pleasant weather',
      location: 'Current Location',
    };
  }
}
