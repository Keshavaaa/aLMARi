// services/WardrobeService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import DatabaseService from './DatabaseService';
import { processClothingImageWithAI, AIAnalysisResult } from './ImageProcessingService';

// Import our comprehensive types
import {
  ClothingItem,
  ProcessedClothingItem,
  UploadedImage,
  WardrobeStats,
  UserPreferences,
  Season,
  FormalityLevel,
  CLOTHING_CATEGORIES,
  ApiResponse,
  AppError,
} from '../types/clothing';

// Legacy interface for backward compatibility
export interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  colors: string[];
  image: string;
  description: string;
  brand?: string;
  size?: string;
  inLaundry?: boolean;
  notes?: string;
  dateAdded: string;
}

// Enhanced interface for new SQLite items
export interface EnhancedWardrobeItem extends WardrobeItem {
  userId?: number;
  clothingType?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fabricType?: string;
  styleCategory?: string;
  seasonSuitability?: string;
  aiAnalysis?: string;
  localImagePath?: string;
}

// Storage and configuration constants
const WARDROBE_STORAGE_KEY = 'wardrobe_items_v2';
const PREFERENCES_STORAGE_KEY = 'user_preferences_v1';
const IMAGES_DIRECTORY = 'almari_images/';
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const IMAGE_QUALITY = 0.8;
/**
 * Comprehensive Wardrobe Service
 * Handles all wardrobe management functionality with proper error handling
 * and integration with both local storage and backend services
 */
class WardrobeService {
  private imageDirectory: string;

  constructor() {
    this.imageDirectory = FileSystem.documentDirectory + IMAGES_DIRECTORY;
    this.initializeImageDirectory();
  }

  /**
   * Initialize image storage directory
   */
  private async initializeImageDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.imageDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.imageDirectory, { intermediates: true });
        console.log('📁 Created images directory:', this.imageDirectory);
      }
    } catch (error) {
      console.error('Failed to initialize image directory:', error);
    }
  }

  /**
   * Request gallery permissions and pick image
   */
  async pickImageFromGallery(): Promise<ApiResponse<UploadedImage>> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        return {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Gallery access permission is required to upload photos',
            timestamp: new Date().toISOString(),
          }
        };
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: IMAGE_QUALITY,
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return {
          success: false,
          error: {
            code: 'USER_CANCELLED',
            message: 'Image selection was cancelled',
            timestamp: new Date().toISOString(),
          }
        };
      }

      const asset = result.assets[0];
      
      // Check file size
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
        return {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `Image size (${(asset.fileSize / 1024 / 1024).toFixed(1)}MB) exceeds limit (2MB)`,
            timestamp: new Date().toISOString(),
          }
        };
      }

      const uploadedImage: UploadedImage = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: asset.type,
        size: asset.fileSize,
      };

      return { success: true, data: uploadedImage };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GALLERY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to pick image from gallery',
          timestamp: new Date().toISOString(),
          details: error,
        }
      };
    }
  }

  /**
   * Request camera permissions and take photo
   */
  async takePhotoWithCamera(): Promise<ApiResponse<UploadedImage>> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        return {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Camera access permission is required to take photos',
            timestamp: new Date().toISOString(),
          }
        };
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: IMAGE_QUALITY,
      });

      if (result.canceled || !result.assets?.[0]) {
        return {
          success: false,
          error: {
            code: 'USER_CANCELLED',
            message: 'Photo capture was cancelled',
            timestamp: new Date().toISOString(),
          }
        };
      }

      const asset = result.assets[0];
      const uploadedImage: UploadedImage = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: asset.type,
        size: asset.fileSize,
      };

      return { success: true, data: uploadedImage };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CAMERA_ERROR',
          message: error instanceof Error ? error.message : 'Failed to take photo',
          timestamp: new Date().toISOString(),
          details: error,
        }
      };
    }
  }

  /**
   * Save image locally with proper error handling
   */
  async saveImageLocally(imageUri: string): Promise<ApiResponse<string>> {
    try {
      const filename = `clothing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const localUri = this.imageDirectory + filename;
      
      await FileSystem.copyAsync({
        from: imageUri,
        to: localUri
      });

      // Verify the file was saved
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        throw new Error('File was not saved successfully');
      }

      console.log('💾 Image saved locally:', localUri);
      return { success: true, data: localUri };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILE_SAVE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to save image locally',
          timestamp: new Date().toISOString(),
          details: error,
        }
      };
    }
  }

  /**
   * Get or create current user
   */
  /**
 * Get or create current user
 */
async getCurrentUser(): Promise<ApiResponse<{ id: number }>> {
  try {
    // ✅ Use global device ID from app initialization
    const deviceId = globalThis.deviceId;
    
    if (!deviceId) {
      console.error('❌ No device ID found in global scope');
      throw new Error('Device ID not initialized');
    }

    console.log('🔍 Getting user for device:', deviceId);
    
    let user = await DatabaseService.getUserByDeviceId(deviceId);
    
    if (!user) {
      console.log('🆕 Creating new user for device:', deviceId);
      const userId = await DatabaseService.createUser({
        username: `User_${Date.now()}`,
        device_id: deviceId,
      });
      user = { id: userId };
      console.log('✅ Created user with ID:', userId);
    } else {
      console.log('✅ Found existing user with ID:', user.id);
    }
    
    return { success: true, data: user };

  } catch (error) {
    console.error('❌ getCurrentUser failed:', error);
    return {
      success: false,
      error: {
        code: 'USER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get current user',
        timestamp: new Date().toISOString(),
        details: error,
      }
    };
  }
}

  /**
   * Convert legacy WardrobeItem to ClothingItem
   */
  private convertToClothingItem(wardrobeItem: WardrobeItem): ClothingItem {
    return {
      id: wardrobeItem.id,
      name: wardrobeItem.name,
      category: wardrobeItem.category,
      subcategory: undefined,
      description: wardrobeItem.description,
      brand: wardrobeItem.brand,
      size: wardrobeItem.size || 'Unknown',
      color: wardrobeItem.colors[0] || 'Unknown',
      imageUri: wardrobeItem.image,
      inLaundry: wardrobeItem.inLaundry || false,
      notes: wardrobeItem.notes || '',
      dateAdded: wardrobeItem.dateAdded,
      timesWorn: 0,
      tags: [],
      seasonality: ['summer'] as Season[],
      formality: 'casual' as FormalityLevel,
      isFavorite: false,
    };
  }

  /**
   * Get all wardrobe items with proper error handling
   */
  async getWardrobeItems(): Promise<ClothingItem[]> {
    try {
      const items: ClothingItem[] = [];

      // 1. Get items from SQLite database
      try {
        const userResult = await this.getCurrentUser();
        if (userResult.success && userResult.data) {
          const sqliteItems = await DatabaseService.getUserClothing(userResult.data.id);
          
          // Convert SQLite items to ClothingItem format
          const convertedSQLiteItems: ClothingItem[] = sqliteItems.map(item => ({
            id: item.id.toString(),
            name: item.name,
            category: item.clothing_type || 'Other',
            subcategory: item.style_category,
            description: item.ai_analysis ? 
              (JSON.parse(item.ai_analysis).description || 'No description') : 
              'No description',
            brand: item.brand,
            size: item.size || 'Unknown',
            color: item.primary_color || 'Unknown',
            imageUri: item.image_uri,
            inLaundry: item.laundry_status !== 'clean',
            notes: '',
            dateAdded: item.created_at,
            timesWorn: 0, // TODO: Implement wear tracking
            tags: [],
            seasonality: item.season_suitability ? 
              [item.season_suitability as Season] : ['summer'],
            formality: (item.style_category?.toLowerCase() as FormalityLevel) || 'casual',
            material: item.fabric_type,
            isFavorite: false, // TODO: Implement favorites
          }));

          items.push(...convertedSQLiteItems);
        }
      } catch (sqliteError) {
        console.warn('Failed to load SQLite items:', sqliteError);
      }

      // 2. Get items from AsyncStorage (backward compatibility)
      try {
        const stored = await AsyncStorage.getItem(WARDROBE_STORAGE_KEY);
        if (stored) {
          const asyncStorageItems: WardrobeItem[] = JSON.parse(stored);
          const convertedItems = asyncStorageItems.map(this.convertToClothingItem);
          items.push(...convertedItems);
        }
      } catch (storageError) {
        console.warn('Failed to load AsyncStorage items:', storageError);
      }

      // 3. Add mock items for demo purposes
      const convertedMockItems = [].map(this.convertToClothingItem);
      items.push(...convertedMockItems);

      // 4. Remove duplicates based on ID
      const uniqueItems = items.reduce((acc, current) => {
        const existing = acc.find(item => item.id === current.id);
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, [] as ClothingItem[]);

      console.log(`📦 Loaded ${uniqueItems.length} wardrobe items`);
      return uniqueItems;

    } catch (error) {
      console.error('Failed to load wardrobe items:', error);
      // Return mock items as fallback
      return [].map(this.convertToClothingItem);
    }
  }

  /**
 * Save clothing item with comprehensive error handling
 */
async saveClothingItem(itemData: Omit<ClothingItem, 'id' | 'dateAdded'>): Promise<ApiResponse<ClothingItem>> {
  try {
    console.log('💾 Saving clothing item to database...');
    
    // ✅ Get current user
    const userResult = await this.getCurrentUser();
    if (!userResult.success || !userResult.data) {
      throw new Error('Failed to get current user');
    }

    const newItem: ClothingItem = {
      ...itemData,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dateAdded: new Date().toISOString(),
    };

    // ✅ Save to SQLite database (main storage)
    try {
      const clothingData = {
        user_id: userResult.data.id,
        name: newItem.name,
        image_uri: newItem.imageUri, // ✅ This should already be a file path from ImageProcessingService
        clothing_type: newItem.category,
        primary_color: newItem.color,
        secondary_color: undefined,
        fabric_type: newItem.material,
        style_category: newItem.subcategory,
        season_suitability: newItem.seasonality[0],
        brand: newItem.brand,
        size: newItem.size,
        ai_analysis: JSON.stringify({
          description: newItem.description,
          formality: newItem.formality,
        })
      };

      console.log('📤 Saving to database:', clothingData);
      
      const clothingId = await DatabaseService.addClothingItem(clothingData);
      if (clothingId) {
        newItem.id = clothingId.toString();
        console.log('✅ Saved to database with ID:', clothingId);
      }
    } catch (dbError) {
      console.error('❌ Database save failed:', dbError);
      throw dbError; // Re-throw to trigger the catch block
    }

    console.log('✅ Item saved successfully:', newItem.name);
    return { success: true, data: newItem };

  } catch (error) {
    console.error('❌ Save failed:', error);
    return {
      success: false,
      error: {
        code: 'SAVE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to save clothing item',
        timestamp: new Date().toISOString(),
        details: error,
      }
    };
  }
}


  /**
   * Save clothing with image processing and AI analysis
   */
  async saveClothingWithImage(
    imageUri: string,
    itemName?: string,
    manualData?: Partial<{
      clothing_type: string;
      primary_color: string;
      secondary_color: string;
      fabric_type: string;
      style_category: string;
      season_suitability: string;
      brand: string;
      size: string;
    }>
  ): Promise<ApiResponse<ClothingItem>> {
    try {
      console.log('📤 Starting clothing upload with AI analysis...');

      // 1. Get current user
      const userResult = await this.getCurrentUser();
      if (!userResult.success || !userResult.data) {
        throw new Error('Failed to get current user');
      }

      // 2. Process image with AI analysis
      console.log('🤖 Processing image with AI...');
      const processedResult = await processClothingImageWithAI(imageUri);

      if (!processedResult.success || !processedResult.data) {
      throw new Error('Failed to process image');
      }

      const processedData = processedResult.data;



      // 3. Determine analysis data (manual override or AI)
      let analysisData: AIAnalysisResult;
      
      if (manualData && Object.keys(manualData).length > 0) {
        console.log('👤 Using manual data provided by user');
        analysisData = {
          clothing_type: manualData.clothing_type || 'clothing',
          primary_color: manualData.primary_color || 'unknown',
          secondary_color: manualData.secondary_color,
          fabric_type: manualData.fabric_type,
          style_category: manualData.style_category || 'casual',
          season_suitability: manualData.season_suitability || 'all-season',
          description: `${manualData.clothing_type || 'clothing'} in ${manualData.primary_color || 'unknown'} color`
        };
      } else {
        console.log('Using AI analysis from Gemini');
        analysisData = processedData.aiAnalysis || {
          clothing_type: 'clothing',
          primary_color: 'unknown',
          style_category: 'casual',
          season_suitability: 'all-season',
          description: 'AI analysis unavailable'
        };
      }

      // 4. Create ClothingItem
      const newItem: ClothingItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: itemName || `${analysisData.clothing_type} - ${analysisData.primary_color}`,
        category: analysisData.clothing_type || 'Other',
        subcategory: analysisData.style_category,
        description: analysisData.description || 'No description available',
        brand: manualData?.brand,
        size: manualData?.size || 'Unknown',
        color: analysisData.primary_color || 'Unknown',
        imageUri: imageUri, // Use original image for now
        originalImageUri: imageUri,
        inLaundry: false,
        notes: '',
        dateAdded: new Date().toISOString(),
        timesWorn: 0,
        tags: [],
        seasonality: analysisData.season_suitability ? 
          [analysisData.season_suitability as Season] : ['summer'],
        formality: (analysisData.style_category?.toLowerCase() as FormalityLevel) || 'casual',
        material: analysisData.fabric_type,
        isFavorite: false,
      };

      // 5. Save to database
      if (DatabaseService) {
        try {
          const clothingData = {
            user_id: userResult.data.id,
            name: newItem.name,
            image_uri: imageUri, // Use original image for now
            clothing_type: analysisData.clothing_type,
            primary_color: analysisData.primary_color,
            secondary_color: analysisData.secondary_color,
            fabric_type: analysisData.fabric_type,
            style_category: analysisData.style_category,
            season_suitability: analysisData.season_suitability,
            brand: manualData?.brand,
            size: manualData?.size,
            ai_analysis: JSON.stringify({
              ...analysisData,
              processedAt: processedData.processedAt,
              imageWidth: processedData.width,
              imageHeight: processedData.height
            })
          };

          const clothingId = await DatabaseService.addClothingItem(clothingData);
          if (clothingId) {
            newItem.id = clothingId.toString();
          }
        } catch (dbError) {
          console.warn('Database save failed, continuing with AsyncStorage:', dbError);
        }
      }

      // 6. Save to AsyncStorage as backup
      const saveResult = await this.saveClothingItem(newItem);
      if (!saveResult.success) {
        throw new Error(saveResult.error?.message || 'Failed to save item');
      }

      console.log('✅ Clothing item saved successfully:', newItem.name);
      return { success: true, data: newItem };

    } catch (error) {
      console.error('❌ Save clothing with image failed:', error);
      return {
        success: false,
        error: {
          code: 'SAVE_WITH_IMAGE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to save clothing with image',
          timestamp: new Date().toISOString(),
          details: error,
        }
      };
    }
  }

  /**
   * Delete wardrobe item
   */
  async deleteWardrobeItem(itemId: string): Promise<ApiResponse<boolean>> {
    try {
      // Delete from AsyncStorage
      const existingItems = await AsyncStorage.getItem(WARDROBE_STORAGE_KEY);
      if (existingItems) {
        const items: WardrobeItem[] = JSON.parse(existingItems);
        const filteredItems = items.filter(item => item.id !== itemId);
        await AsyncStorage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(filteredItems));
      }

      // Skip database delete for now - only delete from AsyncStorage
      console.log('Item deleted from local storage');


      console.log('✅ Item deleted successfully:', itemId);
      return { success: true, data: true };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete item',
          timestamp: new Date().toISOString(),
          details: error,
        }
      };
    }
  }

  /**
   * Update wardrobe item
   */
  async updateWardrobeItem(itemId: string, updates: Partial<ClothingItem>): Promise<ApiResponse<ClothingItem>> {
    try {
      // Update in AsyncStorage
      const existingItems = await AsyncStorage.getItem(WARDROBE_STORAGE_KEY);
      let updatedItem: ClothingItem | null = null;

      if (existingItems) {
        const items: WardrobeItem[] = JSON.parse(existingItems);
        const index = items.findIndex(item => item.id === itemId);
        
        if (index !== -1) {
          const currentItem = items[index];
          const updatedWardrobeItem: WardrobeItem = {
            ...currentItem,
            name: updates.name || currentItem.name,
            category: updates.category || currentItem.category,
            colors: updates.color ? [updates.color] : currentItem.colors,
            description: updates.description || currentItem.description,
            brand: updates.brand !== undefined ? updates.brand : currentItem.brand,
            size: updates.size || currentItem.size,
            inLaundry: updates.inLaundry !== undefined ? updates.inLaundry : currentItem.inLaundry,
            notes: updates.notes !== undefined ? updates.notes : currentItem.notes,
          };

          items[index] = updatedWardrobeItem;
          await AsyncStorage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(items));
          updatedItem = this.convertToClothingItem(updatedWardrobeItem);
        }
      }

      // Update in SQLite if numeric ID
      if (!isNaN(Number(itemId)) && DatabaseService) {
        try {
          const sqliteUpdates = {
            name: updates.name,
            brand: updates.brand,
            size: updates.size,
            laundry_status: updates.inLaundry ? 'dirty' : 'clean'
          };
          await DatabaseService.updateClothingItem(Number(itemId), sqliteUpdates);
        } catch (dbError) {
          console.warn('Database update failed:', dbError);
        }
      }

      if (!updatedItem) {
        throw new Error('Item not found');
      }

      console.log('✅ Item updated successfully:', itemId);
      return { success: true, data: updatedItem };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update item',
          timestamp: new Date().toISOString(),
          details: error,
        }
      };
    }
  }

  /**
   * Get wardrobe statistics
   */
  async getWardrobeStats(): Promise<ApiResponse<WardrobeStats>> {
    try {
      const items = await this.getWardrobeItems();
      
      const stats: WardrobeStats = {
        totalItems: items.length,
        itemsByCategory: items.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        itemsInLaundry: items.filter(item => item.inLaundry).length,
        favoriteItems: items.filter(item => item.isFavorite).length,
        mostWornItems: [...items].sort((a, b) => b.timesWorn - a.timesWorn).slice(0, 5),
        leastWornItems: [...items].filter(item => item.timesWorn >= 0).sort((a, b) => a.timesWorn - b.timesWorn).slice(0, 5),
        recentlyAdded: items.filter(item => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return new Date(item.dateAdded) > thirtyDaysAgo;
        }),
        costPerWear: items.reduce((acc, item) => {
          if (item.price && item.timesWorn > 0) {
            acc[item.id] = item.price / item.timesWorn;
          }
          return acc;
        }, {} as Record<string, number>),
      };

      return { success: true, data: stats };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to calculate wardrobe stats',
          timestamp: new Date().toISOString(),
          details: error,
        }
      };
    }
  }

  /**
   * Clear all wardrobe data (for testing/reset purposes)
   */
  async clearWardrobe(): Promise<ApiResponse<boolean>> {
    try {
      await AsyncStorage.removeItem(WARDROBE_STORAGE_KEY);
      console.log('✅ Wardrobe cleared successfully');
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CLEAR_ERROR',
          message: error instanceof Error ? error.message : 'Failed to clear wardrobe',
          timestamp: new Date().toISOString(),
          details: error,
        }
      };
    }
  }
}

// Export singleton instance
const wardrobeService = new WardrobeService();
export default wardrobeService;

// Export functions for backward compatibility
export const getWardrobeItems = () => wardrobeService.getWardrobeItems();
export const saveToWardrobe = (item: Omit<WardrobeItem, 'id' | 'dateAdded'>) => {
  const clothingItem: Omit<ClothingItem, 'id' | 'dateAdded'> = {
    name: item.name,
    category: item.category,
    subcategory: undefined,
    description: item.description,
    brand: item.brand,
    size: item.size || 'Unknown',
    color: item.colors[0] || 'Unknown',
    imageUri: item.image,
    inLaundry: item.inLaundry || false,
    notes: item.notes || '',
    timesWorn: 0,
    tags: [],
    seasonality: ['summer'],
    formality: 'casual',
    isFavorite: false,
  };
  return wardrobeService.saveClothingItem(clothingItem);
};
export const deleteWardrobeItem = (itemId: string) => wardrobeService.deleteWardrobeItem(itemId);
export const updateWardrobeItem = (itemId: string, updates: Partial<WardrobeItem>) => {
  const clothingUpdates: Partial<ClothingItem> = {
    name: updates.name,
    category: updates.category,
    color: updates.colors?.[0],
    description: updates.description,
    brand: updates.brand,
    size: updates.size,
    inLaundry: updates.inLaundry,
    notes: updates.notes,
  };
  return wardrobeService.updateWardrobeItem(itemId, clothingUpdates);
};

// Export service class for direct use
export { WardrobeService };
