// app/(tabs)/camera.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import 'react-native-get-random-values';
import DatabaseService from '@/services/DatabaseService';
import {
  Platform,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  BackHandler,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView, CameraType, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { AIService } from '../../services/AIService';
import { compressImage } from '@/services/WardrobeStorage';

// Icons
import {
  X,
  Zap,
  ZapOff,
  RotateCcw,
  Image as ImageIcon,
  Sparkles,
  Brain,
  Eye,
  Palette,
  Tag,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';

// Services and Types
import {
  ProcessedClothingItem,
  UploadedImage,
  ClothingItem,
  CLOTHING_CATEGORIES,
} from '../../types/clothing';

// Design System
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Shadows,
  IconSizes,
} from '../../constants/Design';

const { width, height } = Dimensions.get('window');

// Processing stages for better UX
const PROCESSING_STAGES = [
  { id: 'upload', text: 'Preparing image...', icon: Eye, duration: 800 },
  {
    id: 'background',
    text: 'Removing background...',
    icon: Sparkles,
    duration: 1200,
  },
  { id: 'analyze', text: 'Analyzing clothing...', icon: Brain, duration: 1000 },
  {
    id: 'colors',
    text: 'Detecting colors & patterns...',
    icon: Palette,
    duration: 900,
  },
  { id: 'category', text: 'Identifying category...', icon: Tag, duration: 700 },
  {
    id: 'finalize',
    text: 'Creating your item...',
    icon: CheckCircle,
    duration: 600,
  },
];
/**
 * Minimal status item component
 */
const StatusItem = ({ text, active }: { text: string; active: boolean }) => (
  <View style={styles.statusItem}>
    <View style={[styles.statusDot, active && styles.statusDotActive]} />
    <Text style={[styles.statusText, active && styles.statusTextActive]}>
      {text}
    </Text>
  </View>
);

export default function CameraScreen() {
  // Camera permissions and settings
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCapturing, setIsCapturing] = useState(false);

  // AI Processing states
  const [aiProcessing, setAiProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [processingText, setProcessingText] = useState('');
  const [processingError, setProcessingError] = useState<string | null>(null);

  const cameraRef = useRef<CameraView>(null);

  // Reanimated shared values
  const pulseScale = useSharedValue(1);
  const sparkleRotation = useSharedValue(0);
  const brainScale = useSharedValue(0.8);
  const progressWidth = useSharedValue(0);
  const captureButtonScale = useSharedValue(1);
  const lastSavedImageUri = useRef<string | null>(null);
  const isSavingToDatabase = useRef(false);

  // Handle Android back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (aiProcessing) {
          // Show confirmation before canceling AI processing
          Alert.alert(
            'Cancel AI Processing?',
            'Your item is being analyzed. Are you sure you want to cancel?',
            [
              { text: 'Continue Processing', style: 'cancel' },
              {
                text: 'Cancel',
                style: 'destructive',
                onPress: () => {
                  setAiProcessing(false);
                  router.back();
                },
              },
            ],
          );
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription.remove();
    }, [aiProcessing]),
  );

  useEffect(() => {
    getCameraPermission();
    // Set status bar style for camera
    StatusBar.setBarStyle('light-content');
    return () => StatusBar.setBarStyle('default');
  }, []);

  useEffect(() => {
    if (aiProcessing) {
      startAIAnimations();
      runProcessingStages();
    } else {
      stopAIAnimations();
      setCurrentStage(0);
      setProcessingError(null);
    }
  }, [aiProcessing]);

  /**
   * Start smooth animations during AI processing
   */
  const startAIAnimations = () => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, {
          duration: 1000,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        }),
        withTiming(1, {
          duration: 1000,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        }),
      ),
      -1,
      false,
    );

    sparkleRotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false,
    );

    brainScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1500, easing: Easing.out(Easing.cubic) }),
        withTiming(0.9, { duration: 1500, easing: Easing.out(Easing.cubic) }),
      ),
      -1,
      false,
    );

    progressWidth.value = withTiming(100, {
      duration: PROCESSING_STAGES.reduce(
        (sum, stage) => sum + stage.duration,
        0,
      ),
      easing: Easing.out(Easing.cubic),
    });
  };

  /**
   * Stop all animations and reset values
   */
  const stopAIAnimations = () => {
    cancelAnimation(pulseScale);
    cancelAnimation(sparkleRotation);
    cancelAnimation(brainScale);
    cancelAnimation(progressWidth);
    cancelAnimation(captureButtonScale);

    pulseScale.value = withTiming(1, { duration: 300 });
    sparkleRotation.value = withTiming(0, { duration: 300 });
    brainScale.value = withTiming(0.8, { duration: 300 });
    progressWidth.value = withTiming(0, { duration: 300 });
    captureButtonScale.value = withTiming(1, { duration: 300 });
  };

  /**
   * Run through processing stages with realistic timing
   */
  const runProcessingStages = async () => {
    for (let i = 0; i < PROCESSING_STAGES.length; i++) {
      const stage = PROCESSING_STAGES[i];
      setCurrentStage(i);
      setProcessingText(stage.text);

      await new Promise((resolve) => setTimeout(resolve, stage.duration));
    }
  };

  // Animated styles
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotation.value}deg` }],
  }));

  const brainStyle = useAnimatedStyle(() => ({
    transform: [{ scale: brainScale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const captureButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureButtonScale.value }],
  }));

  /**
   * Request camera permissions
   */
  const getCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      setHasPermission(false);
    }
  };

  /**
   * Process image with AI analysis and background removal
   */
  const processWithAI = async (
    imageUri: string,
    base64?: string,
  ): Promise<void> => {
    setAiProcessing(true);
    setProcessingError(null);

    try {
      // Stage 1: Send to backend for processing (bg removal + color detection)
      console.log(
        '🚀 Sending to backend:',
        process.env.EXPO_PUBLIC_BACKEND_URL,
      );

      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

      if (!backendUrl) {
        console.error('❌ EXPO_PUBLIC_BACKEND_URL not set in .env');
        throw new Error('Backend URL not configured');
      }

      // Create FormData for backend
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'clothing.jpg',
      } as any);

      // Call backend /api/process-clothing endpoint
      const backendResponse = await fetch(
        `${backendUrl}/api/process-clothing`,
        {
          method: 'POST',
          body: formData,
          headers: {
            Accept: 'application/json',
          },
        },
      );

      const backendResult = await backendResponse.json();

      if (!backendResult.success) {
        console.error('❌ Backend processing failed:', backendResult.error);
        throw new Error(backendResult.error || 'Backend processing failed');
      }

      console.log('✅ Backend processing complete:', backendResult.data);

      const { processed_image, dominant_colors } = backendResult.data;

      // Stage 2: AI Analysis with Gemini
      let aiResult: Partial<ClothingItem> | null = null;

      try {
        console.log('🤖 Running Gemini AI analysis...');
        const analysis = await AIService.analyzeClothing(imageUri);

        aiResult = {
          name: `${analysis.color} ${analysis.category}`,
          category: analysis.category,
          subcategory: analysis.subcategory,
          color: analysis.color,
          material: analysis.material,
          description: `${analysis.color} ${analysis.material} ${analysis.category}`,
          seasonality: analysis.seasonality,
          formality: analysis.formality,
        };

        console.log('✅ Gemini analysis complete:', aiResult);
      } catch (error) {
        console.error('⚠️ Gemini API failed, using backend colors:', error);

        // Fallback using backend color detection
        const colorName = dominant_colors[0]?.name || 'Unknown';

        aiResult = {
          name: `${colorName} Item`,
          category:
            CLOTHING_CATEGORIES[
              Math.floor(Math.random() * CLOTHING_CATEGORIES.length)
            ],
          color: colorName,
          description: `${colorName} clothing item`,
        };
      }

      //  Stage 3: Save processed image to filesystem BEFORE navigation
      console.log('💾 Saving processed image to filesystem...');

      let finalImageUri = imageUri; // Fallback to original

      try {
        if (processed_image) {
          const { localUri } = await compressImage(processed_image, {
            saveLocally: true,
            maxWidth: 800,
            quality: 0.8,
            format: 'jpeg',
          });

          if (localUri) {
            finalImageUri = localUri;
            console.log('✅ Background-removed image saved to:', finalImageUri);
          } else {
            console.warn(
              '⚠️ compressImage returned no localUri, using original',
            );
          }
        }
      } catch (saveError) {
        console.error('⚠️ Failed to save processed image:', saveError);
        finalImageUri = imageUri; // Fallback to original
      }

      // Stage 4 - Save to SQLite database (direct method)
      console.log('💾 Saving item to local SQLite database...');

      try {
        const SQLite = require('expo-sqlite');
        const db = await DatabaseService.getDatabase();

        // Get or create user
        const deviceId = globalThis.deviceId || `android_${Date.now()}_temp`;

        let user = (await db.getFirstAsync(
          'SELECT * FROM users WHERE device_id = ?',
          [deviceId],
        )) as any;

        if (!user) {
          console.log('🆕 Creating new user for device:', deviceId);
          const result = await db.runAsync(
            'INSERT INTO users (username, device_id) VALUES (?, ?)',
            [`User_${Date.now()}`, deviceId],
          );
          user = { id: result.lastInsertRowId };
          console.log('✅ Created user with ID:', user.id);
        }

        // Prepare AI analysis data
        const aiAnalysisData = {
          description: aiResult?.description || 'Clothing item',
          formality: aiResult?.formality || 'casual',
          notes: '',
        };

        // Insert clothing item
        const itemResult = await db.runAsync(
          `
    INSERT INTO clothing_items (
      user_id, name, image_uri, clothing_type, primary_color,
      season_suitability, ai_analysis
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
          [
            user.id,
            aiResult?.name || 'New Item',
            finalImageUri,
            aiResult?.category || 'Other',
            aiResult?.color || 'Unknown',
            aiResult?.seasonality?.[0] || 'summer',
            JSON.stringify(aiAnalysisData),
          ],
        );

        console.log(
          '✅ Item saved to SQLite with ID:',
          itemResult.lastInsertRowId,
        );
      } catch (dbError) {
        console.error('❌ Database save error:', dbError);
        
      }

      const navigationParams = {
        imageUri: finalImageUri,
        originalImageUri: imageUri,
        dominantColors: dominant_colors.map((c: any) => c.hex).join(','),
        isNewItem: 'true',
        source: 'camera',
        ...(aiResult && {
          suggestedName: aiResult.name,
          suggestedCategory: aiResult.category,
          suggestedColor: aiResult.color,
          suggestedDescription: aiResult.description,
        }),
      };

      // Reset states
      setAiProcessing(false);
      setIsCapturing(false);
      setProcessingError(null);

      // Navigate immediately
      console.log('✅ AI Processing complete, navigating to item-details');
      if (aiResult) {
        console.log(
          '🚀 Detected:',
          aiResult.name,
          '|',
          aiResult.category,
          '|',
          aiResult.color,
        );
      }

      router.push({
        pathname: '/item-details',
        params: navigationParams,
      });
    } catch (error) {
      console.error('❌ Processing failed:', error);

      // Reset states on error
      setAiProcessing(false);
      setIsCapturing(false);
      setProcessingError('Processing failed. Please try again.');

      Alert.alert(
        'Processing Error',
        `Failed to process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [
          {
            text: 'Add Manually',
            onPress: () => {
              router.push({
                pathname: '/item-details',
                params: {
                  imageUri,
                  isNewItem: 'true',
                  source: 'camera',
                },
              });
            },
          },
          {
            text: 'Try Again',
            style: 'cancel',
          },
        ],
      );
    }
  };

  /**
   * Capture photo with camera
   */
  const takePicture = async () => {
    if (isCapturing || !cameraRef.current || aiProcessing) return;

    // Animate capture button
    captureButtonScale.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withTiming(1, { duration: 100 }),
    );

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: false,
      });

      if (photo.uri) {
        await processWithAI(photo.uri, photo.base64);
      } else {
        throw new Error('Failed to capture photo');
      }
    } catch (error) {
      console.error('Photo capture failed:', error);
      Alert.alert(
        'Capture Failed',
        'Failed to capture photo. Please check your camera permissions and try again.',
      );
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * Open gallery for image selection
   */
  const openGallery = async () => {
    if (aiProcessing) return;

    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow gallery access to upload photos of your clothing items.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: undefined,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setIsCapturing(true);

        // Convert null to undefined
        const base64Data = asset.base64 ?? undefined;
        await processWithAI(asset.uri, base64Data);
        setIsCapturing(false);
      }
    } catch (error) {
      console.error('Gallery selection failed:', error);
      Alert.alert(
        'Error',
        'Failed to select image from gallery. Please try again.',
      );
      setIsCapturing(false);
    }
  };

  /**
   * Toggle camera flash
   */
  const toggleFlash = () => {
    setFlashMode((current) => (current === 'off' ? 'on' : 'off'));
  };

  /**
   * Flip camera between front and back
   */
  const flipCamera = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  // Web platform message
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.webContainer}>
        <View style={styles.webContent}>
          <Text style={styles.webIcon}>📷</Text>
          <Text style={styles.webTitle}>Camera Not Available</Text>
          <Text style={styles.webSubtitle}>
            Open aLMARi on your mobile device to capture and add clothing items
            to your wardrobe
          </Text>
          <TouchableOpacity
            style={styles.webButton}
            onPress={() => router.back()}
          >
            <Text style={styles.webButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Permission loading state
  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.permissionText}>
          Requesting camera permission...
        </Text>
      </SafeAreaView>
    );
  }

  // Permission denied state
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.permissionContent}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionSubtitle}>
            aLMARi needs camera access to capture photos of your clothing items
            and build your digital wardrobe.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={getCameraPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView
        style={styles.camera}
        flash={flashMode}
        facing={facing}
        ref={cameraRef}
      />

      {/* AI Processing Overlay - PROFESSIONAL VERSION */}
      {aiProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            {/* Minimal animated spinner */}
            <Animated.View style={[pulseStyle, styles.spinnerContainer]}>
              <View style={styles.spinner}>
                <Animated.View style={[sparkleStyle, styles.spinnerRing]} />
              </View>
            </Animated.View>

            {/* Clean typography */}
            <Text style={styles.processingTitle}>Processing Image</Text>
            <Text style={styles.processingSubtitle}>
              {processingError ||
                processingText.replace(/📤|✂️|🤖|🎨|🏷️|✨/g, '').trim()}
            </Text>

            {/* Minimal progress bar */}
            <View style={styles.progressContainer}>
              <Animated.View style={[progressStyle, styles.progressBar]} />
            </View>

            {/* Simple status list */}
            {!processingError && (
              <View style={styles.statusList}>
                <StatusItem
                  text="Analyzing composition"
                  active={currentStage >= 1}
                />
                <StatusItem
                  text="Detecting colors & patterns"
                  active={currentStage >= 3}
                />
                <StatusItem
                  text="Categorizing item"
                  active={currentStage >= 4}
                />
              </View>
            )}

            {/* Error state */}
            {processingError && (
              <View style={styles.errorContainer}>
                <AlertCircle size={20} color={Colors.error} />
                <Text style={styles.errorText}>{processingError}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* UI Overlay */}
      <View style={styles.uiOverlay}>
        {/* Top Bar */}
        <SafeAreaView>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)')}
              style={styles.topButton}
            >
              <X
                size={IconSizes.lg}
                color={Colors.text.inverse}
                strokeWidth={2}
              />
            </TouchableOpacity>

            {/* AI Badge */}
            <Animated.View style={[pulseStyle, styles.aiBadge]}>
              <Animated.View style={sparkleStyle}>
                <Sparkles
                  size={16}
                  color={
                    aiProcessing ? Colors.primary[400] : Colors.primary[500]
                  }
                />
              </Animated.View>
              <Text style={styles.aiBadgeText}>
                {aiProcessing ? 'AI Processing...' : 'AI-Powered Detection'}
              </Text>
            </Animated.View>

            <TouchableOpacity
              onPress={toggleFlash}
              disabled={aiProcessing}
              style={[
                styles.topButton,
                {
                  backgroundColor:
                    flashMode === 'on'
                      ? Colors.warning
                      : 'rgba(255, 255, 255, 0.2)',
                },
                aiProcessing && styles.disabledButton,
              ]}
            >
              {flashMode === 'off' ? (
                <ZapOff
                  size={IconSizes.lg}
                  color={Colors.text.inverse}
                  strokeWidth={2}
                />
              ) : (
                <Zap
                  size={IconSizes.lg}
                  color={Colors.neutral[900]}
                  strokeWidth={2}
                />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Center Area */}
        <View style={styles.centerArea} />

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <View style={styles.controlsContainer}>
            {/* Gallery Button */}
            <TouchableOpacity
              onPress={openGallery}
              disabled={isCapturing || aiProcessing}
              style={[
                styles.sideButton,
                (isCapturing || aiProcessing) && styles.disabledButton,
              ]}
            >
              <ImageIcon
                size={IconSizes.lg}
                color={Colors.text.inverse}
                strokeWidth={2}
              />
            </TouchableOpacity>

            {/* Capture Button */}
            <Animated.View style={captureButtonStyle}>
              <TouchableOpacity
                onPress={takePicture}
                disabled={isCapturing || aiProcessing}
                style={styles.captureButton}
              >
                {isCapturing || aiProcessing ? (
                  <Brain
                    size={30}
                    color={Colors.text.inverse}
                    strokeWidth={2}
                  />
                ) : (
                  <View style={styles.captureInner} />
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Flip Camera Button */}
            <TouchableOpacity
              onPress={flipCamera}
              disabled={isCapturing || aiProcessing}
              style={[
                styles.sideButton,
                (isCapturing || aiProcessing) && styles.disabledButton,
              ]}
            >
              <RotateCcw
                size={IconSizes.lg}
                color={Colors.text.inverse}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              {aiProcessing
                ? 'AI is analyzing your clothing item...'
                : 'Tap to capture with AI • Gallery for existing photos'}
            </Text>
            {!aiProcessing && (
              <Text style={styles.instructionSubtext}>
                AI automatically detects type, colors, and creates categories
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  camera: {
    flex: 1,
  },

  // Web styles
  webContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  webContent: {
    alignItems: 'center' as const,
    padding: Spacing.xxl,
  },

  webIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },

  webTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center' as const,
  },

  webSubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: Spacing.xl,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.md,
  },

  webButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },

  webButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },

  // Permission styles
  centerContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background.primary,
  },

  permissionContent: {
    alignItems: 'center' as const,
    padding: Spacing.xxl,
  },

  permissionIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },

  permissionTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.error,
    textAlign: 'center' as const,
    marginBottom: Spacing.md,
  },

  permissionSubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: Spacing.xl,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.md,
  },

  permissionButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },

  permissionButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },

  permissionText: {
    fontSize: Typography.sizes.lg,
    color: Colors.text.secondary,
  },

  // Processing overlay - PROFESSIONAL DESIGN
  processingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.xl,
  },

  processingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  spinnerContainer: {
    marginBottom: Spacing.lg,
  },

  spinner: {
    width: 60,
    height: 60,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  spinnerRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderTopColor: Colors.primary[500],
    borderRightColor: Colors.primary[400],
  },

  processingTitle: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },

  processingSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: Typography.sizes.sm,
    textAlign: 'center' as const,
    marginBottom: Spacing.lg,
    fontWeight: Typography.weights.normal,
  },

  progressContainer: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1,
    overflow: 'hidden' as const,
    marginBottom: Spacing.lg,
  },

  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary[500],
  },

  statusList: {
    width: '100%',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },

  statusItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  statusDotActive: {
    backgroundColor: Colors.primary[500],
  },

  statusText: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: Typography.weights.normal,
  },

  statusTextActive: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: Typography.weights.medium,
  },

  errorContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
    marginTop: Spacing.md,
  },

  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.sm,
    flex: 1,
  },

  // UI Overlay
  uiOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  topBar: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },

  topButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.full,
    padding: Spacing.sm,
  },

  aiBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.xs,
    borderWidth: 2,
    borderColor: Colors.primary[500],
  },

  aiBadgeText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  centerArea: {
    flex: 1,
  },

  bottomControls: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingBottom: 40,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },

  controlsContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  sideButton: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[500],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 4,
    borderColor: Colors.text.inverse,
    ...Shadows.lg,
  },

  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.text.inverse,
  },

  disabledButton: {
    opacity: 0.5,
  },

  instructions: {
    alignItems: 'center' as const,
    marginTop: Spacing.md,
  },

  instructionText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.sm,
    textAlign: 'center' as const,
    marginBottom: 4,
  },

  instructionSubtext: {
    color: Colors.primary[300],
    fontSize: Typography.sizes.xs,
    textAlign: 'center' as const,
  },
});
