// services/CalendarService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OutfitRecommendation, OutfitCalendarEntry, WeatherCondition } from '../types/clothing';
import { WeatherService } from './WeatherServices';

const CALENDAR_STORAGE_KEY = '@almari_calendar_v1';
const SCHEDULED_OUTFITS_KEY = '@almari_scheduled_outfits_v1';
const WEATHER_CACHE_KEY = '@almari_weather_cache_v1';

export interface ScheduledOutfit {
  id: string;
  date: string; // YYYY-MM-DD format
  outfitRecommendation: OutfitRecommendation;
  occasion: string;
  notes?: string;
  reminder?: boolean;
  weatherAtSchedule?: WeatherCondition; // Store weather when outfit was generated
  createdAt: string;
  updatedAt: string;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  hasOutfit: boolean;
  outfit?: ScheduledOutfit;
  weather?: WeatherCondition; // Weather forecast for this day
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

interface WeatherCacheEntry {
  weather: WeatherCondition;
  timestamp: number;
}

class CalendarService {
  private weatherCache: Map<string, WeatherCacheEntry> = new Map();
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  constructor() {
    this.loadWeatherCache();
  }

  // ============ EXISTING OUTFIT METHODS ============
  
  /**
   * Get all scheduled outfits
   */
  async getScheduledOutfits(): Promise<ScheduledOutfit[]> {
    try {
      const stored = await AsyncStorage.getItem(SCHEDULED_OUTFITS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load scheduled outfits:', error);
      return [];
    }
  }

  /**
   * Get scheduled outfit for a specific date
   */
  async getOutfitForDate(date: string): Promise<ScheduledOutfit | null> {
    try {
      const outfits = await this.getScheduledOutfits();
      return outfits.find(outfit => outfit.date === date) || null;
    } catch (error) {
      console.error('Failed to get outfit for date:', error);
      return null;
    }
  }

  /**
   * Schedule an outfit for a specific date (with weather)
   */
  async scheduleOutfit(
    date: string,
    outfitRecommendation: OutfitRecommendation,
    occasion: string,
    notes?: string,
    weatherAtSchedule?: WeatherCondition
  ): Promise<ScheduledOutfit> {
    try {
      const outfits = await this.getScheduledOutfits();
      
      // Remove existing outfit for this date if any
      const filteredOutfits = outfits.filter(o => o.date !== date);
      
      const newScheduledOutfit: ScheduledOutfit = {
        id: `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date,
        outfitRecommendation,
        occasion,
        notes,
        reminder: false,
        weatherAtSchedule, // Store the weather forecast
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      filteredOutfits.push(newScheduledOutfit);
      await AsyncStorage.setItem(SCHEDULED_OUTFITS_KEY, JSON.stringify(filteredOutfits));
      
      console.log('✅ Outfit scheduled for:', date, 'with weather:', weatherAtSchedule?.temperature);
      return newScheduledOutfit;
    } catch (error) {
      console.error('Failed to schedule outfit:', error);
      throw error;
    }
  }

  /**
   * Update a scheduled outfit
   */
  async updateScheduledOutfit(
    id: string,
    updates: Partial<Omit<ScheduledOutfit, 'id' | 'createdAt'>>
  ): Promise<void> {
    try {
      const outfits = await this.getScheduledOutfits();
      const index = outfits.findIndex(o => o.id === id);
      
      if (index !== -1) {
        outfits[index] = {
          ...outfits[index],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(SCHEDULED_OUTFITS_KEY, JSON.stringify(outfits));
        console.log('✅ Scheduled outfit updated:', id);
      }
    } catch (error) {
      console.error('Failed to update scheduled outfit:', error);
      throw error;
    }
  }

  /**
   * Delete a scheduled outfit
   */
  async deleteScheduledOutfit(id: string): Promise<void> {
    try {
      const outfits = await this.getScheduledOutfits();
      const filtered = outfits.filter(o => o.id !== id);
      await AsyncStorage.setItem(SCHEDULED_OUTFITS_KEY, JSON.stringify(filtered));
      console.log('✅ Scheduled outfit deleted:', id);
    } catch (error) {
      console.error('Failed to delete scheduled outfit:', error);
      throw error;
    }
  }

  /**
   * Delete scheduled outfit by date
   */
  async deleteScheduledOutfitByDate(date: string): Promise<void> {
    try {
      const outfits = await this.getScheduledOutfits();
      const filtered = outfits.filter(o => o.date !== date);
      await AsyncStorage.setItem(SCHEDULED_OUTFITS_KEY, JSON.stringify(filtered));
      console.log('✅ Scheduled outfit deleted for date:', date);
    } catch (error) {
      console.error('Failed to delete scheduled outfit by date:', error);
      throw error;
    }
  }

  /**
   * Get calendar days for a specific month (WITH WEATHER)
   */
  async getCalendarMonth(year: number, month: number): Promise<CalendarDay[]> {
    try {
      const outfits = await this.getScheduledOutfits();
      const days: CalendarDay[] = [];
      
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Prefetch weather for the month (single API call)
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      await this.prefetchWeatherForRange(startDate, endDate);
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateString = this.formatDate(date);
        const outfit = outfits.find(o => o.date === dateString);
        
        // Get cached weather for this date
        const weather = this.weatherCache.get(dateString)?.weather;
        
        days.push({
          date: dateString,
          hasOutfit: !!outfit,
          outfit: outfit,
          weather: weather, // Include weather forecast
          isToday: date.getTime() === today.getTime(),
          isPast: date < today,
          isFuture: date > today,
        });
      }
      
      return days;
    } catch (error) {
      console.error('Failed to get calendar month:', error);
      return [];
    }
  }

  /**
   * Get upcoming scheduled outfits (next 7 days)
   */
  async getUpcomingOutfits(): Promise<ScheduledOutfit[]> {
    try {
      const outfits = await this.getScheduledOutfits();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      
      return outfits
        .filter(outfit => {
          const outfitDate = new Date(outfit.date);
          return outfitDate >= today && outfitDate <= sevenDaysLater;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Failed to get upcoming outfits:', error);
      return [];
    }
  }

  // ============ NEW WEATHER METHODS ============

  /**
   * Get weather forecast for a specific calendar date
   */
  async getWeatherForDate(date: Date | string): Promise<WeatherCondition> {
    try {
      const dateString = typeof date === 'string' ? date : this.formatDate(date);
      
      // Check cache first
      const cached = this.weatherCache.get(dateString);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log(`📦 Using cached weather for ${dateString}`);
        return cached.weather;
      }

      // Fetch fresh weather
      console.log(`🌤️ Fetching weather for ${dateString}`);
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const weather = await WeatherService.getWeatherForDate(dateObj);
      
      // Cache it
      this.weatherCache.set(dateString, { weather, timestamp: Date.now() });
      await this.saveWeatherCache();
      
      return weather;
    } catch (error) {
      console.error('Failed to get weather for date:', error);
      throw error;
    }
  }

  /**
   * Prefetch weather for a date range (optimized single API call)
   */
  async prefetchWeatherForRange(startDate: Date, endDate: Date): Promise<void> {
    try {
      const daysToFetch = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      if (daysToFetch > 16) {
        console.warn('Date range exceeds 16-day forecast limit, fetching first 16 days');
      }

      // Fetch multi-day forecast (single API call)
      const forecasts = await WeatherService.getMultiDayForecast(Math.min(daysToFetch, 16));
      
      // Cache all forecasts
      const timestamp = Date.now();
      forecasts.forEach(({ date, weather }) => {
        this.weatherCache.set(date, { weather, timestamp });
      });

      await this.saveWeatherCache();
      console.log(`✅ Prefetched weather for ${forecasts.length} days`);
    } catch (error) {
      console.error('Failed to prefetch weather:', error);
    }
  }

  /**
   * Clear weather cache (for testing or manual refresh)
   */
  async clearWeatherCache(): Promise<void> {
    this.weatherCache.clear();
    await AsyncStorage.removeItem(WEATHER_CACHE_KEY);
    console.log('✅ Weather cache cleared');
  }

  /**
   * Load weather cache from storage
   */
  private async loadWeatherCache(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
      if (stored) {
        const entries: Array<[string, WeatherCacheEntry]> = JSON.parse(stored);
        this.weatherCache = new Map(entries);
        console.log(`📦 Loaded ${this.weatherCache.size} weather cache entries`);
      }
    } catch (error) {
      console.error('Failed to load weather cache:', error);
    }
  }

  /**
   * Save weather cache to storage
   */
  private async saveWeatherCache(): Promise<void> {
    try {
      const entries = Array.from(this.weatherCache.entries());
      await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save weather cache:', error);
    }
  }

  // ============ UTILITY METHODS ============

  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Clear all scheduled outfits (for testing)
   */
  async clearAllScheduledOutfits(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SCHEDULED_OUTFITS_KEY);
      console.log('✅ All scheduled outfits cleared');
    } catch (error) {
      console.error('Failed to clear scheduled outfits:', error);
      throw error;
    }
  }
}

// Export singleton instance
const calendarService = new CalendarService();
export default calendarService;
