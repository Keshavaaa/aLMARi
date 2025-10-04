// services/ImageProcessingService.ts
import * as ImageManipulator from 'expo-image-manipulator';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as FileSystem from 'expo-file-system';

// Import our comprehensive types
import {
  ProcessedClothingItem,
  UploadedImage,
  ApiResponse,
  AppError,
  ClothingItem,
  CLOTHING_CATEGORIES,
  COMMON_COLORS,
  Season,
  FormalityLevel,
} from '../types/clothing';

// Configuration constants
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const PROCESSING_QUALITY = 0.8;
const MAX_DIMENSION = 1024;
const GEMINI_MODEL = 'gemini-1.5-flash';
const AI_TIMEOUT = 30000; // 30 seconds

// Enhanced interfaces
export interface ProcessedImage {
  uri: string;
  originalUri: string;
  width: number;
  height: number;
  dominantColors: string[];
  processedAt: string;
  fileSize?: number;
  format: 'JPEG' | 'PNG';
}

export interface AIAnalysisResult {
  clothing_type: string;
  primary_color: string;
  secondary_color?: string;
  fabric_type?: string;
  style_category: string;
  season_suitability: string;
  description: string;
  confidence?: number; // 0-100 confidence score
  formality?: FormalityLevel;
}

export interface ProcessedImageWithAI extends ProcessedImage {
  aiAnalysis?: AIAnalysisResult;
  backgroundRemoved?: boolean;
  processingTime?: number;
}

// Color detection utilities
const DOMINANT_COLORS_MAP: Record<string, string[]> = {
  'red': ['#FF0000', '#DC143C', '#B22222'],
  'blue': ['#0000FF', '#4169E1', '#1E90FF'],
  'green': ['#008000', '#32CD32', '#90EE90'],
  'yellow': ['#FFFF00', '#FFD700', '#FFFFE0'],
  'black': ['#000000', '#2F2F2F', '#505050'],
  'white': ['#FFFFFF', '#F8F8FF', '#F5F5F5'],
  'gray': ['#808080', '#A9A9A9', '#D3D3D3'],
  'brown': ['#A52A2A', '#8B4513', '#CD853F'],
  'pink': ['#FFC0CB', '#FF69B4', '#FF1493'],
  'purple': ['#800080', '#9370DB', '#DA70D6'],
  'orange': ['#FFA500', '#FF8C00', '#FFB347'],
};

/**
 * Image Processing Service
 * Handles image processing, AI analysis, and background removal
 */
class ImageProcessingService {
  private genAI: GoogleGenerativeAI | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeAI();
  }

  /**
   * Initialize Gemini AI with proper error handling
   */
  private initializeAI(): void {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.warn('⚠️ Gemini API key not found. Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file');
        console.warn('⚠️ AI analysis will use fallback methods');
        this.genAI = null;
        return;
      }

      if (apiKey.length < 20) {
        console.warn('⚠️ Gemini API key appears to be invalid (too short)');
        this.genAI = null;
        return;
      }
      
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.isInitialized = true;
      console.log('🤖 ImageProcessingService initialized with Gemini AI');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error);
      this.genAI = null;
    }
  }

  /**
   * Check if AI services are available
   */
  isAIAvailable(): boolean {
    return this.genAI !== null && this.isInitialized;
  }

  /**
   * Test AI connection
   */
  async testAIConnection(): Promise<ApiResponse<string>> {
    if (!this.genAI) {
      return {
        success: false,
        error: {
          code: 'AI_NOT_AVAILABLE',
          message: 'Gemini AI is not initialized. Check your API key.',
          timestamp: new Date().toISOString(),
        }
      };
    }
  
    try {
      const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await Promise.race([
        model.generateContent("Respond with just 'OK' to test the connection"),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ]) as any;
      
      const response = result.response.text().trim();
      
      return {
        success: true,
        data: response,
        message: 'AI connection test successful'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AI_CONNECTION_FAILED',
          message: error instanceof Error ? error.message : 'AI connection test failed',
          timestamp: new Date().toISOString(),
          details: error,
        }
      };
    }
  }

  /**
   * Validate image before processing
   */
  private async validateImage(imageUri: string): Promise<ApiResponse<{ width: number; height: number; fileSize?: number }>> {
    try {
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Image file does not exist',
            timestamp: new Date().toISOString(),
          }
        };
      }

      // Check file size
      if (fileInfo.size && fileInfo.size > MAX_IMAGE_SIZE) {
        return {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `Image size (${(fileInfo.size / 1024 / 1024).toFixed(1)}MB) exceeds limit (${MAX_IMAGE_SIZE / 1024 / 1024}MB)`,
            timestamp: new Date().toISOString(),
          }
        };
      }

      // Get basic image info
      try {
        const imageInfo = await ImageManipulator.manipulateAsync(
          imageUri,
          [],
          { format: ImageManipulator.SaveFormat.JPEG }
        );

        return {
          success: true,
          data: {
            width: imageInfo.width,
            height: imageInfo.height,
            fileSize: fileInfo.size,
          }
        };
      } catch (manipulatorError) {
        return {
          success: false,
          error: {
            code: 'INVALID_IMAGE',
            message: 'Image file is corrupted or in an unsupported format',
            timestamp: new Date().toISOString(),
            details: manipulatorError,
          }
        };
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate image',
          timestamp: new Date().toISOString(),
          details: error,
        }
      };
    }
  }

  /**
   * Extract dominant colors from image (simplified implementation)
   * In production, you might want to use a more sophisticated color extraction library
   */
  private extractDominantColors(imageUri: string): string[] {
    // This is a simplified implementation
    // In a real app, you'd use image analysis to extract actual dominant colors
    // For now, return common clothing colors
    return ['Blue', 'White']; // Fallback colors
  }

  /**
   * Process clothing image with optimization and error handling
   */
  async processClothingImage(imageUri: string): Promise<ApiResponse<ProcessedImage>> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Processing image:', imageUri);
      
      // Validate image first
      const validation = await this.validateImage(imageUri);
      if (!validation.success) {
        return validation as ApiResponse<ProcessedImage>;
      }

      const { width: originalWidth, height: originalHeight, fileSize } = validation.data!;

      // Calculate optimal resize dimensions
      const shouldResize = originalWidth > MAX_DIMENSION || originalHeight > MAX_DIMENSION;
      const resizeOptions = shouldResize ? [{
        resize: {
          width: originalWidth > originalHeight ? MAX_DIMENSION : undefined,
          height: originalHeight > originalWidth ? MAX_DIMENSION : undefined,
        }
      }] : [];

      // Process image with optimization
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        resizeOptions,
        { 
          compress: PROCESSING_QUALITY, 
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true // Convert to Base64 for permanent storage
        }
      );
      
      if (!manipulatedImage.base64) {
        throw new Error('Failed to convert image to base64');
      }

      // Create permanent data URI
      const permanentUri = `data:image/jpeg;base64,${manipulatedImage.base64}`;
      
      // Extract dominant colors (simplified)
      const dominantColors = this.extractDominantColors(imageUri);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Image processed in ${processingTime}ms`);
      
      const result: ProcessedImage = {
        uri: permanentUri,
        originalUri: imageUri,
        width: manipulatedImage.width,
        height: manipulatedImage.height,
        dominantColors,
        processedAt: new Date().toISOString(),
        fileSize: fileSize,
        format: 'JPEG',
      };
      
      return { success: true, data: result };
      
    } catch (error) {
      console.error('❌ Image processing failed:', error);
      
      // Return fallback result to prevent complete failure
      const fallbackResult: ProcessedImage = {
        uri: imageUri,
        originalUri: imageUri,
        width: 512,
        height: 512,
        dominantColors: ['Unknown'],
        processedAt: new Date().toISOString(),
        format: 'JPEG',
      };

      return {
        success: false,
        data: fallbackResult, // Provide fallback data
        error: {
          code: 'PROCESSING_FAILED',
          message: error instanceof Error ? error.message : 'Image processing failed',
          timestamp: new Date().toISOString(),
          details: error,
        }
      };
    }
  }

  /**
   * Convert image to base64 with proper error handling
   */
  private async imageToBase64(imageUri: string): Promise<string> {
    try {
      // Handle different URI formats
      if (imageUri.startsWith('data:image/')) {
        // Already a data URI, extract base64 part
        return imageUri.split(',')[1];
      }

      if (imageUri.startsWith('file://') || imageUri.startsWith('/')) {
        // Local file - read directly
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
      }

      // HTTP/HTTPS URL - fetch and convert
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // Remove data:image/...;base64, prefix
        };
        reader.onerror = () => reject(new Error('Failed to read blob as base64'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw new Error(`Failed to convert image to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze clothing with AI using Gemini Vision
   */
  async analyzeClothingWithAI(imageUri: string): Promise<ApiResponse<AIAnalysisResult>> {
    if (!this.genAI) {
      const fallback = this.getDefaultAnalysis();
      return {
        success: false,
        data: fallback,
        error: {
          code: 'AI_NOT_AVAILABLE',
          message: 'AI analysis not available. Using fallback analysis.',
          timestamp: new Date().toISOString(),
        }
      };
    }

    try {
      console.log('🤖 Starting AI analysis of clothing image...');
      
      const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });
      
      // Enhanced prompt for better results
      const prompt = `
        Analyze this clothing item image and provide a JSON response with the following information:
        {
          "clothing_type": "specific type from: ${CLOTHING_CATEGORIES.join(', ')}",
          "primary_color": "main color from: ${COMMON_COLORS.join(', ')}",
          "secondary_color": "secondary color if visible, or null",
          "fabric_type": "fabric type if identifiable (cotton, denim, silk, wool, polyester, linen, etc.)",
          "style_category": "style category (formal, casual, sporty, elegant, business, etc.)",
          "season_suitability": "best season (Spring, Summer, Fall, Winter, or All-Season)",
          "description": "brief 10-15 word description of the item",
          "confidence": "confidence score from 0-100",
          "formality": "formality level: casual, smart-casual, semi-formal, or formal"
        }
        
        Rules:
        - Use exact color names from the provided list
        - Use exact clothing types from the provided categories
        - Be specific and accurate
        - Return ONLY valid JSON, no additional text
        - If unsure, lower the confidence score
      `;

      // Convert image to base64
      const base64Data = await this.imageToBase64(imageUri);
      
      // Make AI request with timeout
      const result = await Promise.race([
        model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg'
            }
          }
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI analysis timeout')), AI_TIMEOUT)
        )
      ]) as any;
      
      const responseText = result.response.text();
      console.log('🤖 AI Analysis raw response:', responseText);
      
      // Clean and parse JSON response
      const cleanedResponse = responseText
        .replace(/``````/g, '')
        .replace(/```/g, '')
        .trim();
      
      let analysis: any;
      try {
        analysis = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', cleanedResponse);
        throw new Error('Invalid JSON response from AI');
      }
      
      // Validate and sanitize AI response
      const validatedAnalysis: AIAnalysisResult = {
        clothing_type: this.validateClothingType(analysis.clothing_type),
        primary_color: this.validateColor(analysis.primary_color),
        secondary_color: analysis.secondary_color ? this.validateColor(analysis.secondary_color) : undefined,
        fabric_type: analysis.fabric_type || undefined,
        style_category: analysis.style_category || 'casual',
        season_suitability: this.validateSeason(analysis.season_suitability),
        description: analysis.description || 'Analyzed clothing item',
        confidence: Math.min(100, Math.max(0, parseInt(analysis.confidence) || 75)),
        formality: this.validateFormality(analysis.formality),
      };
      
      console.log('✅ AI Analysis completed:', validatedAnalysis);
      return { success: true, data: validatedAnalysis };
      
    } catch (error) {
      console.error('❌ AI Analysis failed:', error);
      const fallback = this.getDefaultAnalysis();
      
      return {
        success: false,
        data: fallback,
        error: {
          code: 'AI_ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : 'AI analysis failed',
          timestamp: new Date().toISOString(),
          details: error,
        }
      };
    }
  }

  /**
   * Validation helpers for AI responses
   */
  private validateClothingType(type: string): string {
    const validTypes = CLOTHING_CATEGORIES.map(cat => cat.toLowerCase());
    const lowerType = type?.toLowerCase() || 'other';
    return validTypes.includes(lowerType) ? type : 'Other';
  }

  private validateColor(color: string): string {
    const validColors = COMMON_COLORS.map(c => c.toLowerCase());
    const lowerColor = color?.toLowerCase() || 'unknown';
    return validColors.includes(lowerColor) ? color : 'Unknown';
  }

  private validateSeason(season: string): string {
    const validSeasons = ['Spring', 'Summer', 'Fall', 'Winter', 'All-Season'];
    return validSeasons.includes(season) ? season : 'All-Season';
  }

  private validateFormality(formality: string): FormalityLevel {
    const validFormalities: FormalityLevel[] = ['casual', 'smart-casual', 'semi-formal', 'formal'];
    const lower = formality?.toLowerCase() as FormalityLevel;
    return validFormalities.includes(lower) ? lower : 'casual';
  }

  /**
   * Get default analysis when AI fails
   */
  private getDefaultAnalysis(): AIAnalysisResult {
    return {
      clothing_type: 'Other',
      primary_color: 'Unknown',
      secondary_color: undefined,
      fabric_type: undefined,
      style_category: 'casual',
      season_suitability: 'All-Season',
      description: 'Please edit details manually - AI analysis unavailable',
      confidence: 0,
      formality: 'casual',
    };
  }

  /**
   * Combined processing with AI analysis and error handling
   */
  async processClothingImageWithAI(imageUri: string): Promise<ApiResponse<ProcessedImageWithAI>> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Processing image with AI analysis...');
      
      // Step 1: Process the image
      const imageResult = await this.processClothingImage(imageUri);
      if (!imageResult.success || !imageResult.data) {
        return imageResult as ApiResponse<ProcessedImageWithAI>;
      }

      const processedImage = imageResult.data;

      // Step 2: Run AI analysis
      const aiResult = await this.analyzeClothingWithAI(imageUri);
      const aiAnalysis = aiResult.data; // Use data even if AI failed (fallback)

      // Step 3: Update dominant colors from AI if available
      let dominantColors = processedImage.dominantColors;
      if (aiResult.success && aiAnalysis) {
        dominantColors = aiAnalysis.secondary_color 
          ? [aiAnalysis.primary_color, aiAnalysis.secondary_color]
          : [aiAnalysis.primary_color];
      }

      // Step 4: Combine results
      const processingTime = Date.now() - startTime;
      const result: ProcessedImageWithAI = {
        ...processedImage,
        dominantColors,
        aiAnalysis,
        backgroundRemoved: false, // TODO: Implement rembg integration
        processingTime,
      };
      
      console.log(`✅ Combined processing completed in ${processingTime}ms`);
      return { 
        success: true, 
        data: result,
        message: aiResult.success ? 'Processing with AI completed' : 'Processing completed with fallback AI'
      };
      
    } catch (error) {
      console.error('❌ Combined processing failed:', error);
      
      // Provide fallback processing
      const basicResult = await this.processClothingImage(imageUri);
      if (basicResult.success && basicResult.data) {
        const fallbackResult: ProcessedImageWithAI = {
          ...basicResult.data,
          aiAnalysis: this.getDefaultAnalysis(),
          backgroundRemoved: false,
          processingTime: Date.now() - startTime,
        };

        return {
          success: false,
          data: fallbackResult,
          error: {
            code: 'COMBINED_PROCESSING_FAILED',
            message: error instanceof Error ? error.message : 'Combined processing failed',
            timestamp: new Date().toISOString(),
            details: error,
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'COMPLETE_PROCESSING_FAILED',
          message: 'Both image processing and AI analysis failed',
          timestamp: new Date().toISOString(),
          details: error,
        }
      };
    }
  }

  /**
   * Placeholder for background removal integration
   * TODO: Integrate with rembg service
   */
  async removeBackground(imageUri: string): Promise<ApiResponse<string>> {
    // TODO: Implement rembg integration
    // For now, return the original image
    console.log('⚠️ Background removal not yet implemented');
    
    return {
      success: false,
      data: imageUri, // Return original for now
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Background removal feature coming soon',
        timestamp: new Date().toISOString(),
      }
    };
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    aiAvailable: boolean;
    backgroundRemovalAvailable: boolean;
    lastTestedAt?: string;
  } {
    return {
      aiAvailable: this.isAIAvailable(),
      backgroundRemovalAvailable: false, // TODO: Update when rembg is integrated
      lastTestedAt: new Date().toISOString(),
    };
  }
}

// Export singleton instance
const imageProcessingService = new ImageProcessingService();
export default imageProcessingService;

// Export functions for backward compatibility
export const processClothingImage = (imageUri: string) => 
  imageProcessingService.processClothingImage(imageUri);

export const analyzeClothingWithAI = (imageUri: string) => 
  imageProcessingService.analyzeClothingWithAI(imageUri);

export const processClothingImageWithAI = (imageUri: string) => 
  imageProcessingService.processClothingImageWithAI(imageUri);

export const isAIAvailable = () => 
  imageProcessingService.isAIAvailable();

export const testAIConnection = () => 
  imageProcessingService.testAIConnection();

// Export service class for direct use
export { ImageProcessingService };
