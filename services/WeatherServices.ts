// services/WeatherService.ts
import * as Location from 'expo-location';
import { WeatherCondition } from '../types/clothing';

export class WeatherService {
  // Open-Meteo requires NO API key
  private static FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
  private static GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  
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
  
  // Add to services/WeatherService.ts

/**
 * Get weather forecast for a specific future date (up to 16 days)
 */
static async getWeatherForDate(
  date: Date,
  lat?: number,
  lon?: number
): Promise<WeatherCondition> {
  try {
    // Get coordinates (use provided or get current location)
    let latitude = lat;
    let longitude = lon;
    
    if (!latitude || !longitude) {
      const location = await this.getUserLocation();
      if (!location) {
        // Fallback to Mumbai if location unavailable
        latitude = 19.0760;
        longitude = 72.8777;
      } else {
        latitude = location.latitude;
        longitude = location.longitude;
      }
    }

    // Calculate days from now
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const daysFromNow = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Open-Meteo supports up to 16 days in the future
    if (daysFromNow > 16) {
      console.warn('Date too far in future, using 16-day forecast');
    }

    // If date is in the past or today, use current weather
    if (daysFromNow <= 0) {
      return await this.getWeatherByCoordinates(latitude, longitude);
    }

    // Build forecast URL with daily parameters
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'windspeed_10m_max',
        'relative_humidity_2m_mean'
      ].join(','),
      timezone: 'auto',
      forecast_days: String(Math.min(daysFromNow + 1, 16)), // Get up to target date
    });

    const response = await fetch(`${this.FORECAST_URL}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Open-Meteo API failed: ${response.status}`);
    }

    const data = await response.json();

    // Find the matching date in the daily forecast
    const dateString = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const dateIndex = data.daily.time.indexOf(dateString);

    if (dateIndex === -1) {
      throw new Error('Date not found in forecast');
    }

    // Extract weather for the specific date
    const daily = data.daily;
    const avgTemp = Math.round((daily.temperature_2m_max[dateIndex] + daily.temperature_2m_min[dateIndex]) / 2);
    
    return {
      temperature: avgTemp,
      condition: this.mapWeatherCode(daily.weather_code[dateIndex]),
      humidity: Math.round(daily.relative_humidity_2m_mean[dateIndex]),
      windSpeed: Math.round(daily.windspeed_10m_max[dateIndex] * 3.6), // m/s to km/h
      description: this.getWeatherDescription(daily.weather_code[dateIndex]),
      location: 'Current Location', // Could enhance with reverse geocoding
    };

  } catch (error) {
    console.error('Failed to get weather for date:', error);
    return this.getDefaultWeather();
  }
}

/**
 * Get multi-day forecast (up to 16 days)
 */
static async getMultiDayForecast(
  days: number = 7,
  lat?: number,
  lon?: number
): Promise<Array<{ date: string; weather: WeatherCondition }>> {
  try {
    // Get coordinates
    let latitude = lat;
    let longitude = lon;
    
    if (!latitude || !longitude) {
      const location = await this.getUserLocation();
      if (!location) {
        latitude = 19.0760; // Mumbai fallback
        longitude = 72.8777;
      } else {
        latitude = location.latitude;
        longitude = location.longitude;
      }
    }

    // Limit to 16 days (Open-Meteo free tier max)
    const forecastDays = Math.min(days, 16);

    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'windspeed_10m_max',
        'relative_humidity_2m_mean'
      ].join(','),
      timezone: 'auto',
      forecast_days: String(forecastDays),
    });

    const response = await fetch(`${this.FORECAST_URL}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Open-Meteo API failed: ${response.status}`);
    }

    const data = await response.json();
    const daily = data.daily;

    // Convert to array of date + weather objects
    return daily.time.map((dateString: string, index: number) => {
      const avgTemp = Math.round((daily.temperature_2m_max[index] + daily.temperature_2m_min[index]) / 2);
      
      return {
        date: dateString, // YYYY-MM-DD format
        weather: {
          temperature: avgTemp,
          condition: this.mapWeatherCode(daily.weather_code[index]),
          humidity: Math.round(daily.relative_humidity_2m_mean[index]),
          windSpeed: Math.round(daily.windspeed_10m_max[index] * 3.6),
          description: this.getWeatherDescription(daily.weather_code[index]),
          location: 'Current Location',
        } as WeatherCondition
      };
    });

  } catch (error) {
    console.error('Failed to get multi-day forecast:', error);
    return [];
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
    // Build Open-Meteo forecast URL
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: ['temperature_2m', 'relative_humidity_2m', 'weather_code', 'wind_speed_10m'].join(','),
      timezone: 'auto', // auto-detects timezone for the coordinates
    });
    
    const response = await fetch(`${this.FORECAST_URL}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Open-Meteo API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Open-Meteo returns current weather in a "current" object
    const current = data.current;
    const locationName = await this.reverseGeocode(lat, lon);
    
    return {
      temperature: Math.round(current.temperature_2m),
      condition: this.mapWeatherCode(current.weather_code),
      humidity: Math.round(current.relative_humidity_2m),
      windSpeed: Math.round(current.wind_speed_10m * 3.6), // Convert m/s to km/h
      description: this.getWeatherDescription(current.weather_code),
      location: locationName,
    };
  }
  
  static async getWeatherByCity(city: string): Promise<WeatherCondition> {
    try {
      // Use Open-Meteo Geocoding to get coordinates
      const params = new URLSearchParams({
        name: city,
        count: '1',
        language: 'en',
        format: 'json',
      });
      
      const response = await fetch(`${this.GEOCODE_URL}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Geocoding API failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error(`City "${city}" not found`);
      }
      
      const location = data.results[0];
      const weather = await this.getWeatherByCoordinates(location.latitude, location.longitude);
      
      // Use the geocoded city name for accurate display
      weather.location = location.name;
      
      return weather;
      
    } catch (error) {
      console.error('Weather fetch failed:', error);
      throw error;
    }
  }
  
  private static async reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
      // Get location name from coordinates using Open-Meteo geocoding
      // Note: Open-Meteo geocoding is for search, not reverse. Use a simple fallback or store locally.
      // For now, return generic name; you can enhance with a reverse geocoding service if needed.
      return 'Current Location';
    } catch {
      return 'Current Location';
    }
  }
  
  /**
   * Maps WMO weather codes to your app's condition types
   * Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
   */
  private static mapWeatherCode(code: number): WeatherCondition['condition'] {
    // WMO codes 0-3: clear/partly cloudy
    if (code === 0 || code === 1) return 'sunny';
    if (code === 2 || code === 3) return 'cloudy';
    
    // 45-48: fog
    if (code >= 45 && code <= 48) return 'cloudy';
    
    // 51-67: drizzle and rain
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
    
    // 71-77, 85-86: snow
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snowy';
    
    // 95-99: thunderstorm
    if (code >= 95 && code <= 99) return 'rainy'; // treat as rainy for outfit purposes
    
    // Default
    return 'cloudy';
  }
  
  /**
   * Get human-readable description from WMO code
   */
  private static getWeatherDescription(code: number): string {
    const descriptions: { [key: number]: string } = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail',
    };
    
    return descriptions[code] || 'Unknown';
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
