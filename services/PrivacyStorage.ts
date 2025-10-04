// services/PrivacyStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { ClothingItem, OutfitRecommendation, UserPreferences } from '../types/clothing';

export class PrivacyStorage {
  private static deviceId: string;

  static async initializeDevice(): Promise<string> {
    if (!this.deviceId) {
      this.deviceId = await DeviceInfo.getUniqueId();
    }
    return this.deviceId;
  }

  // Store wardrobe items locally
  static async storeWardrobeItem(item: ClothingItem): Promise<void> {
    const deviceId = await this.initializeDevice();
    const wardrobeKey = `wardrobe_${deviceId}`;
    const existingItems = await this.getWardrobeItems();
    existingItems.push(item);
    await AsyncStorage.setItem(wardrobeKey, JSON.stringify(existingItems));
  }

  // Get all wardrobe items
  static async getWardrobeItems(): Promise<ClothingItem[]> {
    const deviceId = await this.initializeDevice();
    const wardrobeKey = `wardrobe_${deviceId}`;
    const items = await AsyncStorage.getItem(wardrobeKey);
    return items ? JSON.parse(items) : [];
  }

  // Store user preferences locally
  static async storeUserPreferences(preferences: UserPreferences): Promise<void> {
    const deviceId = await this.initializeDevice();
    const prefsKey = `preferences_${deviceId}`;
    await AsyncStorage.setItem(prefsKey, JSON.stringify(preferences));
  }

  // Get user preferences
  static async getUserPreferences(): Promise<UserPreferences | null> {
    const deviceId = await this.initializeDevice();
    const prefsKey = `preferences_${deviceId}`;
    const prefs = await AsyncStorage.getItem(prefsKey);
    return prefs ? JSON.parse(prefs) : null;
  }

  // Get device ID for API calls (privacy purposes only)
  static async getDeviceId(): Promise<string> {
    return await this.initializeDevice();
  }
}
