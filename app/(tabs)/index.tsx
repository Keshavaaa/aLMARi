// app/(tabs)/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import {
  Search,
  Bell,
  Heart,
  Plus,
  Sparkles,
  TrendingUp,
  Shirt,
  Zap,
  Calendar,
  Sun,
  Cloud,
  Droplets,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Shadows,
  IconSizes,
} from '../../constants/Design';
import TestGeminiAPI from '../../components/TestGeminiAPI';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIService } from '../../services/AIService';
import wardrobeService from '../../services/WardrobeService';
import { WeatherService } from '../../services/WeatherServices';
// Get device width for responsive layouts
const { width } = Dimensions.get('window');

export default function Home() {
  // State for today's outfit recommendation
  const [todaysOutfit, setTodaysOutfit] = useState(null);
  const [weatherData, setWeatherData] = useState({
    temp: 24,
    condition: 'sunny',
    description: 'Sunny',
  });

  /**
   * Handle bulk image upload for adding multiple clothing items
   */
  const handleBulkUpload = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow gallery access to upload your clothing photos.',
          [{ text: 'OK' }],
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets) {
        Alert.alert(
          'Upload Successful! 📸',
          `Selected ${result.assets.length} item${result.assets.length > 1 ? 's' : ''}. Processing and adding to your wardrobe...`,
          [
            {
              text: 'View Wardrobe',
              onPress: () => router.push('/(tabs)/wardrobe'),
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert('Upload Failed', 'Something went wrong. Please try again.');
    }
  };

  /**
   * Generate today's outfit recommendation using AI
   */
  const generateTodaysOutfit = async () => {
    try {
      // Show loading alert
      Alert.alert(
        'Generating Outfit... ✨',
        'AI is analyzing your wardrobe, weather, and style preferences...',
        [],
        { cancelable: false },
      );

      // Get current weather
      const weather = await WeatherService.getCurrentWeather();

      // Get wardrobe items
      const wardrobeItems = await wardrobeService.getWardrobeItems();

      if (wardrobeItems.length === 0) {
        Alert.alert(
          'Empty Wardrobe',
          'Add some clothing items to your wardrobe first!',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Add Items', onPress: () => router.push('/(tabs)/camera') },
          ],
        );
        return;
      }

      // Generate outfit with AI
      const outfitRecommendation = await AIService.generateOutfitRecommendation(
        wardrobeItems,
        weather,
        'casual day',
      );

      // Store the recommendation for the outfit screen
      await AsyncStorage.setItem(
        'todaysOutfit',
        JSON.stringify(outfitRecommendation),
      );

      // Show success and navigate
      Alert.alert(
        'Outfit Ready! ✨',
        `Perfect outfit for ${weather.temperature}°C ${weather.condition} weather!\n\n${outfitRecommendation.reasoning}`,
        [
          { text: 'Stay Here', style: 'cancel' },
          {
            text: 'View Outfit',
            onPress: () => router.push('/(tabs)/outfit'),
          },
        ],
      );
    } catch (error) {
      console.error('Outfit generation failed:', error);
      Alert.alert(
        'Error',
        'Failed to generate outfit. Please check your internet connection and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: generateTodaysOutfit },
        ],
      );
    }
  };


  /**
   * Handle laundry view navigation
   */
  const viewLaundryItems = () => {
    // TODO: Navigate to filtered wardrobe view showing only laundry items
    router.push('/(tabs)/wardrobe'); // Will add filter parameter later
  };

  // Show mobile-only message for web users
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.webContainer}>
        <Text style={styles.webMessage}>
          📱 aLMARi works best on mobile devices
        </Text>
        <Text style={styles.webSubtext}>
          Download the app or open this link on your phone for the full wardrobe
          experience
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.brandText}>aLMARi</Text>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() =>
                Alert.alert(
                  'Coming Soon',
                  'Notifications feature will be available soon!',
                )
              }
            >
              <Bell
                size={IconSizes.md}
                color={Colors.neutral[600]}
                strokeWidth={2}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={() =>
                Alert.alert(
                  'Coming Soon',
                  'Favorites feature will be available soon!',
                )
              }
            >
              <Heart
                size={IconSizes.md}
                color={Colors.neutral[600]}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={IconSizes.md} color={Colors.neutral[400]} />
          <TextInput
            placeholder="Search your wardrobe..."
            placeholderTextColor={Colors.neutral[400]}
            style={styles.searchInput}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Today's Outfit Recommendation Card */}
        <TodaysOutfitCard
          weatherData={weatherData}
          onGenerateOutfit={generateTodaysOutfit}
          outfit={todaysOutfit}
        />

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsContainer}
          >
            <QuickActionCard
              icon={Plus}
              title="Add Item"
              href="/(tabs)/camera"
              color={Colors.primary[500]}
            />
            <QuickActionCard
              icon={Sparkles}
              title="Get Outfit"
              href="/(tabs)/outfit"
              color={Colors.success}
            />
            <QuickActionCard
              icon={Zap}
              title="Bulk Upload"
              color={Colors.warning}
              onPress={handleBulkUpload}
            />
            <QuickActionCard
              icon={Calendar}
              title="Schedule"
              href="/(tabs)/outfit" // Will add calendar view later
              color={Colors.info}
            />
          </ScrollView>
        </View>

        {/* Outfit Planning & Laundry Row */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outfit Planning</Text>
          <View style={styles.planningRow}>
            {/* Outfit Calendar Card */}
            <OutfitCalendarCard />

            {/* Laundry Status Card */}
            <LaundryStatusCard onPress={viewLaundryItems} />
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore Your Wardrobe</Text>
          <View style={styles.categoriesGrid}>
            <View style={styles.categoryRow}>
              <CategoryCard
                title="My Closet"
                subtitle="Browse all items"
                backgroundColor={Colors.neutral[100]}
                href="/(tabs)/wardrobe"
                emoji="👔"
              />
              <CategoryCard
                title="Outfits"
                subtitle="Saved looks"
                backgroundColor={Colors.primary[50]}
                href="/(tabs)/outfit"
                emoji="✨"
              />
            </View>
            <View style={styles.categoryRow}>
              <CategoryCard
                title="Add Items"
                subtitle="Take photos"
                backgroundColor={Colors.success + '15'}
                href="/(tabs)/camera"
                emoji="📷"
              />
              <CategoryCard
                title="Profile"
                subtitle="Your style"
                backgroundColor={Colors.warning + '15'}
                href="/(tabs)/profile"
                emoji="👤"
              />
            </View>
          </View>
        </View>

        {/* Recently Added Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recently Added</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/wardrobe')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentItemsContainer}
          >
            {['Shirt', 'Jeans', 'Dress', 'Jacket'].map((item, index) => (
              <RecentItemCard key={index} itemName={item} />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Today's Outfit Recommendation Card
 * Shows weather-based AI outfit suggestion
 */
const TodaysOutfitCard = ({
  weatherData,
  onGenerateOutfit,
  outfit,
}: {
  weatherData: any;
  onGenerateOutfit: () => void;
  outfit: any;
}) => {
  const WeatherIcon =
    weatherData.condition === 'sunny'
      ? Sun
      : weatherData.condition === 'cloudy'
        ? Cloud
        : Droplets;
<TestGeminiAPI />;
  return (
    <View style={styles.todaysOutfitCard}>
      <View style={styles.outfitHeader}>
        <View>
          <Text style={styles.outfitTitle}>Today's Outfit</Text>
          <View style={styles.weatherInfo}>
            <WeatherIcon size={16} color={Colors.primary[500]} />
            <Text style={styles.weatherText}>
              {weatherData.temp}°C • {weatherData.description}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={onGenerateOutfit}
        >
          <Sparkles size={16} color={Colors.background.primary} />
          <Text style={styles.generateButtonText}>Generate</Text>
        </TouchableOpacity>
      </View>

      {outfit ? (
        <View style={styles.webContainer}>
          {/* TODO: Show actual outfit recommendation */}
          <Text style={styles.webMessage}>Perfect for today's weather!</Text>
        </View>
      ) : (
        <View style={styles.webContainer}>
          <Text style={styles.webMessage}>
            Get AI-powered outfit recommendations based on weather, occasion,
            and your style
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * Outfit Calendar Card
 * Shows upcoming scheduled outfits
 */
const OutfitCalendarCard = () => (
  <TouchableOpacity
    style={styles.planningCard}
    onPress={() => {
      // TODO: Navigate to calendar view
      Alert.alert(
        'Coming Soon',
        'Outfit calendar feature will be available soon!',
      );
    }}
  >
    <View style={styles.planningCardHeader}>
      <Calendar size={IconSizes.md} color={Colors.primary[500]} />
      <Text style={styles.planningCardTitle}>Outfit Calendar</Text>
    </View>
    <Text style={styles.planningCardSubtitle}>
      Schedule outfits for upcoming events
    </Text>
    <View style={styles.planningCardFooter}>
      <Text style={styles.planningCardCount}>3 scheduled</Text>
      <ChevronRight size={16} color={Colors.neutral[400]} />
    </View>
  </TouchableOpacity>
);

/**
 * Laundry Status Card
 * Shows items currently in laundry
 */
const LaundryStatusCard = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.planningCard} onPress={onPress}>
    <View style={styles.planningCardHeader}>
      <Droplets size={IconSizes.md} color={Colors.info} />
      <Text style={styles.planningCardTitle}>Laundry</Text>
    </View>
    <Text style={styles.planningCardSubtitle}>Items being washed</Text>
    <View style={styles.planningCardFooter}>
      <Text style={styles.planningCardCount}>5 items</Text>
      <ChevronRight size={16} color={Colors.neutral[400]} />
    </View>
  </TouchableOpacity>
);

/**
 * Quick Action Card Component
 */
const QuickActionCard = ({
  icon: Icon,
  title,
  href,
  color,
  onPress,
}: {
  icon: any;
  title: string;
  href?: string;
  color: string;
  onPress?: () => void;
}) => {
  const content = (
    <TouchableOpacity
      style={styles.quickActionCard}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
        <Icon size={IconSizes.lg} color={color} strokeWidth={2} />
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
    </TouchableOpacity>
  );

  if (href) {
    return (
      <Link href={href as any} asChild>
        {content}
      </Link>
    );
  }

  return content;
};

/**
 * Category Card Component
 */
const CategoryCard = ({
  title,
  subtitle,
  backgroundColor,
  href,
  emoji,
}: {
  title: string;
  subtitle: string;
  backgroundColor: string;
  href: string;
  emoji: string;
}) => (
  <Link href={href as any} asChild>
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor }]}
      activeOpacity={0.8}
    >
      <View style={styles.categoryContent}>
        <Text style={styles.categoryTitle}>{title}</Text>
        <Text style={styles.categorySubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.categoryEmoji}>{emoji}</Text>
    </TouchableOpacity>
  </Link>
);

/**
 * Recent Item Card Component
 */
const RecentItemCard = ({ itemName }: { itemName: string }) => (
  <TouchableOpacity style={styles.recentItemCard} activeOpacity={0.7}>
    <View style={styles.recentItemPlaceholder}>
      <Shirt
        size={IconSizes.xl}
        color={Colors.neutral[400]}
        strokeWidth={1.5}
      />
    </View>
    <Text style={styles.recentItemName}>{itemName}</Text>
  </TouchableOpacity>
);

const styles = {
  // Main Container
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },

  // Web-specific styles
  webContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: Spacing.xxl,
    backgroundColor: Colors.background.primary,
  },

  webMessage: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    textAlign: 'center' as const,
    marginBottom: Spacing.sm,
  },

  webSubtext: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },

  // Header
  header: {
    backgroundColor: Colors.background.primary,
    paddingBottom: Spacing.md,
    ...Shadows.sm,
  },

  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },

  brandText: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.light,
    color: Colors.primary[500],
    fontFamily: 'serif',
    letterSpacing: 1.2,
  },

  headerActions: {
    flexDirection: 'row' as const,
    gap: Spacing.sm,
  },

  headerButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },

  // Search
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
  },

  // Scroll Content
  scrollContent: {
    paddingBottom: 100,
  },

  // Today's Outfit Card
  todaysOutfitCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  outfitHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: Spacing.md,
  },

  outfitTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: 4,
  },

  weatherInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },

  weatherText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  generateButton: {
    backgroundColor: Colors.primary[500],
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 4,
  },

  generateButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.background.primary,
  },

  noOutfitState: {
    alignItems: 'center' as const,
    paddingVertical: Spacing.lg,
  },

  noOutfitText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.sm,
  },

  // Planning Row
  planningRow: {
    flexDirection: 'row' as const,
    gap: Spacing.md,
  },

  planningCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  planningCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },

  planningCardTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  planningCardSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },

  planningCardFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  planningCardCount: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: Colors.primary[500],
  },

  // Sections
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xl,
  },

  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.md,
  },

  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  seeAllText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.primary[500],
  },

  // Quick Actions
  quickActionsContainer: {
    gap: Spacing.md,
    paddingRight: Spacing.md,
  },

  quickActionCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center' as const,
    minWidth: 85,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: Spacing.xs,
  },

  quickActionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },

  // Categories
  categoriesGrid: {
    gap: Spacing.md,
  },

  categoryRow: {
    flexDirection: 'row' as const,
    gap: Spacing.md,
  },

  categoryCard: {
    width: (width - 48) / 2,
    height: 140,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    justifyContent: 'space-between' as const,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  categoryContent: {
    flex: 1,
  },

  categoryTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: 4,
  },

  categorySubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  categoryEmoji: {
    fontSize: 28,
    alignSelf: 'flex-end' as const,
  },

  // Recent Items
  recentItemsContainer: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },

  recentItemCard: {
    alignItems: 'center' as const,
  },

  recentItemPlaceholder: {
    width: 80,
    height: 100,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: Spacing.xs,
  },

  recentItemName: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
  },
};
