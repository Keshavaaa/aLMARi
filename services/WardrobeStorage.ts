import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy'; 
import DatabaseService from './DatabaseService';

// ✅ FIX: Define ClothingItemData interface locally or import it
interface ClothingItemData {
  user_id: number;
  name: string;
  image_uri: string;
  clothing_type?: string;
  primary_color?: string;
  secondary_color?: string;
  fabric_type?: string;
  style_category?: string;
  season_suitability?: string;
  brand?: string;
  size?: string;
  price?: number;
  ai_analysis?: string;
}

// ✅ Keep your existing interfaces
export interface StoredWardrobeItem {
  id: string;
  name: string;
  category: string;
  colors: string[];
  description: string;
  notes: string;
  brand?: string;
  size?: string;
  image: string;
  inLaundry: boolean;
  dateAdded: string;
}

export interface EnhancedStoredItem extends StoredWardrobeItem {
  userId?: number;
  clothingType?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fabricType?: string;
  styleCategory?: string;
  seasonSuitability?: string;
  aiAnalysis?: string;
  localImagePath?: string;
  wearCount?: number;
  laundryStatus?: string;
}

const WARDROBE_STORAGE_KEY = 'wardrobe_items';

// ✅ Enhanced image compression (same as before)
export const compressImage = async (
  uri: string, 
  options: {
    saveLocally?: boolean;
    maxWidth?: number;
    quality?: number;
    format?: 'jpeg' | 'png';
  } = {}
): Promise<{ base64?: string; localUri?: string; compressed: string }> => {
  try {
    const {
      saveLocally = false,
      maxWidth = 800,
      quality = 0.7,
      format = 'jpeg'
    } = options;

    console.log('🗜️ Compressing image...', { saveLocally, maxWidth, quality });

    // ✅ Handle base64 data URLs from backend
    let imageUri = uri;
    if (uri.startsWith('data:image')) {
      // Save base64 to temp file first
      const base64Data = uri.split(',')[1];
      const tempUri = `${FileSystem.cacheDirectory}temp_${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(tempUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      imageUri = tempUri;
      console.log('✅ Converted base64 to temp file:', tempUri);
    }

    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: maxWidth } }],
      {
        compress: quality,
        format: format === 'jpeg' ? ImageManipulator.SaveFormat.JPEG : ImageManipulator.SaveFormat.PNG,
        base64: !saveLocally,
      }
    );

    if (saveLocally) {
      const documentsDir = FileSystem.documentDirectory;

      
      if (!documentsDir) {
        throw new Error('Document directory not available');
      }

      const filename = `compressed_${Date.now()}.${format}`;
      const imageDir = `${documentsDir}/almari_images/`;
      
      try {
        await FileSystem.makeDirectoryAsync(imageDir, { intermediates: true });
      } catch (error) {
        console.log('Directory already exists or created');
      }

      const localUri = imageDir + filename;
      
      await FileSystem.copyAsync({
        from: manipulatedImage.uri,
        to: localUri,
      });

      console.log('✅ Image compressed and saved locally:', localUri);
      return { localUri, compressed: localUri };
    } else {
      const base64 = manipulatedImage.base64 || '';
      const dataUri = `data:image/${format};base64,${base64}`;
      console.log('✅ Image compressed to base64');
      return { base64, compressed: dataUri };
    }

  } catch (error) {
    console.error('❌ Image compression failed:', error);
    return { compressed: uri };
  }
};

// ✅ Get current user helper
// ✅ Updated getCurrentUser with debug logs
const getCurrentUser = async (): Promise<{ id: number }> => {
  const deviceId = globalThis.deviceId;
  
  console.log('🔍 getCurrentUser - deviceId:', deviceId);
  
  if (!deviceId) {
    console.error('❌ deviceId is not set!');
    throw new Error('Device ID not initialized');
  }
  
  let user = await DatabaseService.getUserByDeviceId(deviceId);
  console.log('🔍 getCurrentUser - found user:', user);
  
  if (!user) {
    console.log('🆕 Creating new user for deviceId:', deviceId);
    const userId = await DatabaseService.createUser({
      username: `User_${deviceId.split('_')[1] || Date.now()}`,
      device_id: deviceId,
    });
    user = { id: userId };
    console.log('✅ Created new user with ID:', userId);
  }
  
  return user;
};


// ✅ FIX: Updated saveWardrobeItem with proper types
export const saveWardrobeItem = async (
  item: StoredWardrobeItem,
  options: {
    useLocalStorage?: boolean;
    compressImage?: boolean;
    maxImageWidth?: number;
  } = {}
): Promise<boolean> => {
  try {
    const { useLocalStorage = true, compressImage: shouldCompress = true, maxImageWidth = 800 } = options;

    let processedItem = { ...item };

    // Handle image compression
    if (processedItem.image && shouldCompress) {
      if (useLocalStorage) {
        if (processedItem.image.startsWith('file://') || processedItem.image.startsWith('content://')) {
          const { localUri } = await compressImage(processedItem.image, {
            saveLocally: true,
            maxWidth: maxImageWidth,
            quality: 0.8,
            format: 'jpeg'
          });
          processedItem.image = localUri || processedItem.image;
        }
      } else {
        if (processedItem.image.length > 500000 || !processedItem.image.startsWith('data:image')) {
          console.log('🗜️ Compressing large image for AsyncStorage...');
          const { compressed } = await compressImage(processedItem.image, {
            saveLocally: false,
            maxWidth: maxImageWidth,
            quality: 0.7
          });
          processedItem.image = compressed;
        }
      }
    }

    if (useLocalStorage) {
      const user = await getCurrentUser();
      
      // ✅ FIX: Proper ClothingItemData with correct types
      const clothingData: ClothingItemData = {
        user_id: user.id,
        name: processedItem.name,
        image_uri: processedItem.image,
        clothing_type: processedItem.category,
        primary_color: processedItem.colors[0] || 'unknown',
        secondary_color: processedItem.colors[1] || undefined,  // ✅ Use undefined consistently
        brand: processedItem.brand,
        size: processedItem.size,
        ai_analysis: JSON.stringify({
          description: processedItem.description,
          notes: processedItem.notes
        })
      };

      const clothingId = await DatabaseService.addClothingItem(clothingData);
      console.log('✅ Item saved to SQLite with ID:', clothingId);
      return true;

    } else {
      const existingItems = await AsyncStorage.getItem(WARDROBE_STORAGE_KEY);
      const items = existingItems ? JSON.parse(existingItems) : [];
      const updatedItems = [...items, processedItem];
      
      await AsyncStorage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(updatedItems));
      console.log('✅ Item saved to AsyncStorage:', processedItem.name);
      return true;
    }

  } catch (error) {
    console.error('❌ Failed to save wardrobe item:', error);
    return false;
  }
};

// ✅ Enhanced get function (same as before)
export const getStoredWardrobeItems = async (
  options: {
    includeSQLite?: boolean;
    includeAsyncStorage?: boolean;
  } = {}
): Promise<StoredWardrobeItem[]> => {
  try {
    const { includeSQLite = true, includeAsyncStorage = false } = options;
    let allItems: StoredWardrobeItem[] = [];

    if (includeSQLite) {
      try {
        const user = await getCurrentUser();
        console.log('🔍 Current user for loading:', user);  // ✅ ADD THIS
        
        const sqliteItems = await DatabaseService.getUserClothing(user.id);
        console.log('🔍 Raw SQLite items:', sqliteItems);  // ✅ ADD THIS
        
        const convertedItems: StoredWardrobeItem[] = sqliteItems.map(item => ({
          id: item.id.toString(),
          name: item.name,
          category: item.clothing_type || 'Other',
          colors: [item.primary_color, item.secondary_color].filter(Boolean),
          image: item.image_uri,
          description: item.ai_analysis ? 
            JSON.parse(item.ai_analysis).description || 'No description' : 
            'No description',
          notes: item.ai_analysis ? 
            JSON.parse(item.ai_analysis).notes || '' : 
            '',
          brand: item.brand || '',
          size: item.size || '',
          inLaundry: item.laundry_status !== 'clean',
          dateAdded: item.created_at,
        }));

        allItems = [...allItems, ...convertedItems];
        console.log(`✅ Loaded ${convertedItems.length} items from SQLite`);
      } catch (error) {
        console.error('❌ Error loading from SQLite:', error);
      }
    }

    if (includeAsyncStorage) {
      const stored = await AsyncStorage.getItem(WARDROBE_STORAGE_KEY);
      if (stored) {
        const asyncItems = JSON.parse(stored);
        allItems = [...allItems, ...asyncItems];
        console.log(`✅ Loaded ${asyncItems.length} items from AsyncStorage`);
      }
    }

    return allItems;
  } catch (error) {
    console.error('❌ Failed to get wardrobe items:', error);
    return [];
  }
};

// ✅ FIX: Updated updateWardrobeItem with proper types
export const updateWardrobeItem = async (
  updatedItem: StoredWardrobeItem,
  options: { updateInSQLite?: boolean } = {}
): Promise<boolean> => {
  try {
    const { updateInSQLite = true } = options;

    // Update in AsyncStorage
    const existingItems = await AsyncStorage.getItem(WARDROBE_STORAGE_KEY);
    const items = existingItems ? JSON.parse(existingItems) : [];
    
    const itemIndex = items.findIndex((item: StoredWardrobeItem) => item.id === updatedItem.id);
    if (itemIndex !== -1) {
      items[itemIndex] = updatedItem;
      await AsyncStorage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(items));
    }

    // Also update in SQLite if it's a numeric ID
    if (updateInSQLite && !isNaN(Number(updatedItem.id))) {
      // ✅ FIX: Use Partial<ClothingItemData> with proper types
      const sqliteUpdates: Partial<ClothingItemData> = {
        name: updatedItem.name,
        clothing_type: updatedItem.category,
        primary_color: updatedItem.colors[0],
        secondary_color: updatedItem.colors[1], // ✅ This will be undefined if not present
        brand: updatedItem.brand,
        size: updatedItem.size,
        ai_analysis: JSON.stringify({
          description: updatedItem.description,
          notes: updatedItem.notes
        })
      };
      
      await DatabaseService.updateClothingItem(Number(updatedItem.id), sqliteUpdates);
    }

    console.log('✅ Item updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to update wardrobe item:', error);
    return false;
  }
};

// ✅ Enhanced delete function (same as before)
export const deleteWardrobeItem = async (
  itemId: string,
  options: { deleteFromSQLite?: boolean } = {}
): Promise<boolean> => {
  try {
    const { deleteFromSQLite = true } = options;

    const existingItems = await AsyncStorage.getItem(WARDROBE_STORAGE_KEY);
    const items = existingItems ? JSON.parse(existingItems) : [];
    const filteredItems = items.filter((item: StoredWardrobeItem) => item.id !== itemId);
    await AsyncStorage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(filteredItems));

    if (deleteFromSQLite && !isNaN(Number(itemId))) {
      // ✅ FIX: Use Partial<ClothingItemData> for updates
      const deleteUpdate: Partial<ClothingItemData> = { 
        name: `DELETED_${Date.now()}` 
      };
      await DatabaseService.updateClothingItem(Number(itemId), deleteUpdate);
    }

    console.log('✅ Item deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to delete wardrobe item:', error);
    return false;
  }
};

// ✅ Migration function (same as before)
export const migrateToSQLite = async (): Promise<{ success: boolean; migrated: number }> => {
  try {
    console.log('🔄 Starting migration from AsyncStorage to SQLite...');
    
    const asyncStorageItems = await getStoredWardrobeItems({ 
      includeSQLite: false, 
      includeAsyncStorage: true 
    });
    
    if (asyncStorageItems.length === 0) {
      console.log('ℹ️ No items to migrate');
      return { success: true, migrated: 0 };
    }

    let migratedCount = 0;
    for (const item of asyncStorageItems) {
      const success = await saveWardrobeItem(item, { 
        useLocalStorage: true, 
        compressImage: false
      });
      if (success) migratedCount++;
    }

    console.log(`✅ Migration complete: ${migratedCount}/${asyncStorageItems.length} items migrated`);
    return { success: true, migrated: migratedCount };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, migrated: 0 };
  }
};

// ✅ Storage stats function (same as before)
export const getStorageStats = async (): Promise<{
  asyncStorageCount: number;
  sqliteCount: number;
  totalSize: string;
}> => {
  try {
    const asyncItems = await getStoredWardrobeItems({ 
      includeSQLite: false, 
      includeAsyncStorage: true 
    });
    
    const sqliteItems = await getStoredWardrobeItems({ 
      includeSQLite: true, 
      includeAsyncStorage: false 
    });

    const asyncStorageSize = JSON.stringify(asyncItems).length;
    const sqliteSize = sqliteItems.length * 1000;
    
    const totalSizeKB = Math.round((asyncStorageSize + sqliteSize) / 1024);
    const totalSize = totalSizeKB > 1024 ? 
      `${Math.round(totalSizeKB / 1024 * 100) / 100} MB` : 
      `${totalSizeKB} KB`;

    return {
      asyncStorageCount: asyncItems.length,
      sqliteCount: sqliteItems.length,
      totalSize
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return { asyncStorageCount: 0, sqliteCount: 0, totalSize: '0 KB' };
  }
};
