// types/clothing.ts
export interface ClothingItem {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  brand?: string;
  size: string;
  color: string;
  imageUri: string;
  originalImageUri?: string; // Before background removal
  inLaundry: boolean;
  notes: string;
  dateAdded: string;
  lastWorn?: string;
  timesWorn: number;
  tags: string[];
  embedding?: number[]; // For AI similarity matching
  seasonality: Season[];
  formality: FormalityLevel;
  material?: string;
  price?: number;
  purchaseDate?: string;
  isFavorite: boolean;
}

export type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'all-season';

export type FormalityLevel = 'casual' | 'business-casual' | 'formal' | 'athletic';

export interface OutfitRecommendation {
  id: string;
  items: ClothingItem[];
  occasion: string;
  weather: WeatherCondition;
  confidence: number; // 0-100 confidence score
  reasoning: string; // AI explanation for the recommendation
  scheduledDate?: string; // For calendar planning
  isScheduled: boolean;
  createdAt: string;
}

export interface WeatherCondition {
  temperature: number; // in Celsius
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
  humidity: number; // percentage
  windSpeed: number; // km/h
  description?: string; // "Partly cloudy", "Light rain", etc.
  location?: string; // City name
}

export interface UserPreferences {
  favoriteColors: string[];
  preferredBrands: string[];
  avoidedMaterials: string[];
  stylePreference: 'minimalist' | 'trendy' | 'classic' | 'eclectic' | 'bohemian' | 'sporty';
  formalityPreference: FormalityLevel[];
  seasonalPreferences: Record<Season, string[]>; // Preferred categories per season
  bodyType?: BodyType;
  skinTone?: SkinTone;
  preferredFit: 'tight' | 'fitted' | 'relaxed' | 'oversized';
}

// Additional types for enhanced features
export type BodyType = 'apple' | 'pear' | 'hourglass' | 'rectangle' | 'inverted-triangle';

export type SkinTone = 'cool' | 'warm' | 'neutral';

export interface OutfitCalendarEntry {
  id: string;
  date: string; // ISO date string
  outfitId: string;
  occasion: string;
  notes?: string;
  reminder?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WardrobeStats {
  totalItems: number;
  itemsByCategory: Record<string, number>;
  itemsInLaundry: number;
  favoriteItems: number;
  mostWornItems: ClothingItem[];
  leastWornItems: ClothingItem[];
  recentlyAdded: ClothingItem[];
  costPerWear: Record<string, number>; // item id -> cost per wear
}

export interface AIRecommendationRequest {
  occasion: string;
  weather: WeatherCondition;
  userPreferences: UserPreferences;
  availableItems: ClothingItem[]; // Items not in laundry
  excludeItems?: string[]; // Item IDs to exclude
  includeItems?: string[]; // Item IDs that must be included
}

export interface AIRecommendationResponse {
  recommendations: OutfitRecommendation[];
  alternativeItems?: ClothingItem[]; // Suggestions for missing items
  styleAdvice?: string[];
}

// For the home screen components
export interface TodayOutfitData {
  hasRecommendation: boolean;
  recommendation?: OutfitRecommendation;
  weather: WeatherCondition;
  lastGenerated?: string;
}

export interface QuickStats {
  totalItems: number;
  itemsInLaundry: number;
  scheduledOutfits: number;
  recentlyAdded: number;
}

// For camera/upload functionality
export interface UploadedImage {
  uri: string;
  width: number;
  height: number;
  type?: string;
  size?: number;
}

export interface ProcessedClothingItem {
  tempId: string; // Temporary ID during processing
  originalImage: UploadedImage;
  processedImage?: UploadedImage; // After background removal
  detectedCategory?: string;
  detectedColor?: string;
  detectedMaterial?: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
}

// For search and filtering
export interface WardrobeFilters {
  category?: string[];
  color?: string[];
  brand?: string[];
  season?: Season[];
  formality?: FormalityLevel[];
  inLaundry?: boolean;
  isFavorite?: boolean;
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface SearchOptions {
  query: string;
  filters: WardrobeFilters;
  sortBy: 'dateAdded' | 'lastWorn' | 'timesWorn' | 'name' | 'brand';
  sortOrder: 'asc' | 'desc';
}

// For error handling
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// For API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: AppError;
  message?: string;
}

// Constants for categories and other dropdowns
export const CLOTHING_CATEGORIES = [
  'Tops',
  'Bottoms', 
  'Dresses',
  'Outerwear',
  'Shoes',
  'Accessories',
  'Undergarments',
  'Activewear',
  'Formal',
  'Sleepwear',
  'Ethnic Wear',
  'Traditional',
  'Indo-Western',
] as const;

export const CLOTHING_SUBCATEGORIES: Record<string, string[]> = {
  Tops: ['T-Shirt', 'Shirt', 'Blouse', 'Tank Top', 'Sweater', 'Hoodie', 'Cardigan'],
  Bottoms: ['Jeans', 'Trousers', 'Shorts', 'Skirt', 'Leggings', 'Sweatpants'],
  Dresses: ['Casual Dress', 'Formal Dress', 'Maxi Dress', 'Mini Dress', 'Midi Dress'],
  Outerwear: ['Jacket', 'Coat', 'Blazer', 'Vest', 'Raincoat', 'Winter Coat'],
  Shoes: ['Sneakers', 'Boots', 'Sandals', 'Heels', 'Flats', 'Athletic Shoes'],
  Accessories: ['Belt', 'Scarf', 'Hat', 'Bag', 'Jewelry', 'Sunglasses', 'Watch'],
  Undergarments: ['Bra', 'Underwear', 'Shapewear', 'Socks', 'Tights'],
  Activewear: ['Workout Top', 'Yoga Pants', 'Sports Bra', 'Athletic Shorts', 'Tracksuit'],
  Formal: ['Suit', 'Tuxedo', 'Formal Shirt', 'Bow Tie', 'Cufflinks'],
  Sleepwear: ['Pajamas', 'Nightgown', 'Robe', 'Sleep Shirt'],
  'Ethnic-Wear': [ 'Kurta',  'Kurta Pajama',  'Sherwani',  'Dhoti', 'Salwar Kameez',
    'Salwar Suit', 'Churidar', 'Anarkali','Lehenga', 'Saree', 'Dupatta', 'Nehru Jacket', ],
  'Traditional': [ 'Saree', 'Lehenga Choli', 'Ghagra', 'Mundu', 'Lungi',],
  'Indo-Western': ['Kurti','Palazzo','Dhoti Pants','Shrug','Cape','Jumpsuit',],
};

export const COMMON_COLORS = [
  'Black', 'White', 'Gray', 'Navy', 'Brown', 'Beige', 'Red', 'Pink', 
  'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Maroon', 'Olive', 
  'Teal', 'Silver', 'Gold', 'Cream', 'Burgundy'
] as const;

export const COMMON_MATERIALS = [
  'Cotton', 'Polyester', 'Wool', 'Silk', 'Linen', 'Denim', 'Leather', 
  'Synthetic', 'Cashmere', 'Viscose', 'Spandex', 'Nylon', 'Bamboo'
] as const;

export const COMMON_BRANDS = [
  'Zara', 'H&M', 'Uniqlo', 'Nike', 'Adidas', 'Levi\'s', 'Gap', 
  'Forever 21', 'ASOS', 'Mango', 'Other'
] as const;

// Helper type for form inputs
export interface ClothingItemForm {
  name: string;
  category: string;
  subcategory: string;
  description: string;
  brand: string;
  size: string;
  color: string;
  material: string;
  price: string;
  tags: string;
  seasonality: Season[];
  formality: FormalityLevel;
}
// Add this interface to types/clothing.ts
export interface ProcessedImageWithAI {
  uri: string; // Processed image URI (with background removed)
  originalUri: string; // Original image URI
  width: number;
  height: number;
  processedAt: string;
  aiAnalysis?: {
    clothing_type: string;
    primary_color: string;
    secondary_color?: string;
    fabric_type?: string;
    style_category: string;
    season_suitability: string;
    description: string;
  };
}

// Type guards for runtime checking
export const isValidClothingItem = (item: any): item is ClothingItem => {
  return (
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.category === 'string' &&
    typeof item.color === 'string' &&
    typeof item.imageUri === 'string' &&
    typeof item.inLaundry === 'boolean'
  );
};

export const isValidOutfit = (outfit: any): outfit is OutfitRecommendation => {
  return (
    typeof outfit === 'object' &&
    typeof outfit.id === 'string' &&
    Array.isArray(outfit.items) &&
    typeof outfit.occasion === 'string' &&
    typeof outfit.confidence === 'number'
  );
};
