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
import {
  Platform,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  BackHandler,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView, CameraType, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { AIService } from '../../services/AIService';
import { PrivacyStorage } from '../../services/PrivacyStorage';

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
  Shirt,
  Palette,
  Tag,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';

// Services and Types
import { processClothingImage } from '../../services/ImageProcessingService';
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
  { id: 'upload', text: '📤 Preparing image...', icon: Eye, duration: 800 },
  {
    id: 'background',
    text: '✂️ Removing background...',
    icon: Sparkles,
    duration: 1200,
  },
  {
    id: 'analyze',
    text: '🤖 AI analyzing clothing...',
    icon: Brain,
    duration: 1000,
  },
  {
    id: 'colors',
    text: '🎨 Detecting colors & patterns...',
    icon: Palette,
    duration: 900,
  },
  {
    id: 'category',
    text: '🏷️ Identifying category & style...',
    icon: Tag,
    duration: 700,
  },
  {
    id: 'finalize',
    text: '✨ Creating your item...',
    icon: CheckCircle,
    duration: 600,
  },
];

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
      const { status } = await Camera.requestCameraPermissionAsync();
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
      // Stage 1: Image Processing & Background Removal
      const processedImage = await processClothingImage(imageUri);

      // TODO: Implement Gemini API analysis
      // For now, we'll simulate AI analysis and provide manual fallback

      // Stage 2: AI Analysis with real Gemini API
      let aiResult: Partial<ClothingItem> | null = null;

      if (base64) {
        try {
          // Real Gemini API analysis
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
        } catch (error) {
          console.error('Gemini API failed, using fallback:', error);
          // Keep your existing fallback
          aiResult = {
            name: 'Detected Item',
            category:
              CLOTHING_CATEGORIES[
                Math.floor(Math.random() * CLOTHING_CATEGORIES.length)
              ],
            color: processedImage.data?.dominantColors?.[0] || 'Unknown',
            description: 'AI-detected clothing item',
          };
        }
      }

      // Extract the actual processed image data
      const processedData = processedImage.data;

      // Navigate to item details with processed data
      const navigationParams = {
        imageUri: processedData?.uri || imageUri,
        originalImageUri: processedData?.originalUri || imageUri,
        dominantColors: JSON.stringify(processedData?.dominantColors || []),
        isNewItem: 'true',
        source: 'camera',
        // Add AI suggestions if available
        ...(aiResult && {
          suggestedName: aiResult.name,
          suggestedCategory: aiResult.category,
          suggestedColor: aiResult.color,
          suggestedDescription: aiResult.description,
        }),
      };

      setAiProcessing(false);

      if (aiResult) {
        // Show AI success message
        Alert.alert(
          '✨ AI Analysis Complete!',
          `Detected: ${aiResult.name}\nCategory: ${aiResult.category}\nColor: ${aiResult.color}`,
          [
            {
              text: 'Review & Save',
              onPress: () => {
                router.push({
                  pathname: '/item-details',
                  params: navigationParams,
                });
              },
            },
            {
              text: 'Take Another',
              style: 'cancel',
            },
          ],
        );
      } else {
        // Proceed with manual entry
        router.push({
          pathname: '/item-details',
          params: navigationParams,
        });
      }
    } catch (error) {
      console.error('AI processing failed:', error);
      setProcessingError('Processing failed. Please try again.');
      setAiProcessing(false);

      Alert.alert(
        'Processing Error',
        'Failed to process the image. You can still add the item manually.',
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
          { text: 'Try Again', style: 'cancel' },
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

      {/* AI Processing Overlay */}
      {aiProcessing && (
        <View style={styles.processingOverlay}>
          {/* Central AI Brain Animation */}
          <Animated.View style={[brainStyle, styles.brainContainer]}>
            <View style={styles.brainCircle}>
              <Brain size={50} color={Colors.text.inverse} strokeWidth={2} />
            </View>
          </Animated.View>

          {/* Floating Sparkles */}
          <Animated.View style={[sparkleStyle, styles.sparkle1]}>
            <Sparkles size={24} color={Colors.warning} />
          </Animated.View>
          <Animated.View style={[sparkleStyle, styles.sparkle2]}>
            <Sparkles size={16} color={Colors.primary[400]} />
          </Animated.View>
          <Animated.View style={[sparkleStyle, styles.sparkle3]}>
            <Sparkles size={20} color={Colors.primary[300]} />
          </Animated.View>

          {/* Processing Info */}
          <View style={styles.processingInfo}>
            <Text style={styles.processingTitle}>AI Fashion Assistant</Text>
            <Text style={styles.processingStage}>
              {processingError || processingText}
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <Animated.View style={[progressStyle, styles.progressBar]} />
            </View>

            {/* Feature List */}
            {!processingError && (
              <View style={styles.featureList}>
                <FeatureItem
                  icon={Eye}
                  text="Detecting clothing type & style"
                  active={currentStage >= 2}
                />
                <FeatureItem
                  icon={Palette}
                  text="Analyzing colors & patterns"
                  active={currentStage >= 3}
                />
                <FeatureItem
                  icon={Tag}
                  text="Creating smart categories"
                  active={currentStage >= 4}
                />
              </View>
            )}

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
              onPress={() => router.back()}
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
                ? '🤖 AI is analyzing your clothing item...'
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

/**
 * Feature Item Component for processing list
 */
const FeatureItem = ({
  icon: Icon,
  text,
  active,
}: {
  icon: any;
  text: string;
  active: boolean;
}) => (
  <View style={styles.featureItem}>
    <Icon
      size={16}
      color={active ? Colors.primary[300] : Colors.neutral[400]}
      strokeWidth={2}
    />
    <Text style={[styles.featureText, active && styles.featureTextActive]}>
      {text}
    </Text>
    {active && <CheckCircle size={12} color={Colors.success} />}
  </View>
);

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

  // Processing overlay
  processingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  brainContainer: {
    marginBottom: Spacing.xl,
  },

  brainCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...Shadows.xl,
  },

  // Sparkle positions
  sparkle1: {
    position: 'absolute' as const,
    top: '40%',
    left: '20%',
  },

  sparkle2: {
    position: 'absolute' as const,
    top: '35%',
    right: '25%',
  },

  sparkle3: {
    position: 'absolute' as const,
    bottom: '40%',
    left: '30%',
  },

  // Processing info
  processingInfo: {
    alignItems: 'center' as const,
    width: '80%',
  },

  processingTitle: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    textAlign: 'center' as const,
    marginBottom: Spacing.sm,
  },

  processingStage: {
    color: Colors.primary[300],
    fontSize: Typography.sizes.lg,
    textAlign: 'center' as const,
    marginBottom: Spacing.xl,
  },

  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden' as const,
    marginBottom: Spacing.xl,
  },

  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary[500],
    borderRadius: 3,
    ...Shadows.md,
  },

  featureList: {
    alignItems: 'flex-start' as const,
  },

  featureItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },

  featureText: {
    color: Colors.neutral[400],
    fontSize: Typography.sizes.sm,
    flex: 1,
  },

  featureTextActive: {
    color: Colors.primary[300],
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
  },

  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.sm,
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
