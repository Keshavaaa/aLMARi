// app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { OutfitRecommendation } from '../../types/clothing';
import { Image } from 'react-native';
import calendarService from '../../services/CalendarService';
import {
  Search,
  Bell,
  Heart,
  Plus,
  Sparkles,
  Shirt,
  Zap,
  Calendar,
  Sun,
  Cloud,
  Droplets,
  CloudRain,
  CloudSnow,
  Wind,
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
import wardrobeService from '../../services/WardrobeService';
import { WeatherService } from '../../services/WeatherServices';
import { WeatherCondition } from '../../types/clothing';

const { width } = Dimensions.get('window');

export default function Home() {
  // State for weather and wardrobe
  const [weather, setWeather] = useState<WeatherCondition | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wardrobeCount, setWardrobeCount] = useState(0);
  const [laundryCount, setLaundryCount] = useState(0);

  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [todaysOutfit, setTodaysOutfit] = useState<OutfitRecommendation | null>(
    null,
  );

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setWeatherLoading(true);

      // Load weather
      const currentWeather = await WeatherService.getCurrentWeather();
      setWeather(currentWeather);

      // Load wardrobe stats
      const items = await wardrobeService.getWardrobeItems();
      setWardrobeCount(items.length);
      setLaundryCount(items.filter((item) => item.inLaundry).length);

      try {
        const today = new Date().toISOString().split('T')[0];
        const scheduledOutfit = await calendarService.getOutfitForDate(today); 

        if (scheduledOutfit) {
          setTodaysOutfit(scheduledOutfit.outfitRecommendation);
        } else {
          setTodaysOutfit(null);
        }
      } catch (error) {
        console.error("Failed to load today's outfit:", error);
        setTodaysOutfit(null);
      }
    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      setWeatherLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const items = await wardrobeService.getWardrobeItems();
      const filtered = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase()) ||
          item.color.toLowerCase().includes(query.toLowerCase()),
      );
      setSearchResults(filtered as any);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const generateTodaysOutfit = () => {
    if (wardrobeCount === 0) {
      Alert.alert(
        'Empty Wardrobe',
        'Add some clothing items first to generate outfit recommendations!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Items', onPress: () => router.push('/(tabs)/camera') },
        ],
      );
      return;
    }

    // Navigate to outfit tab to generate recommendations
    router.push('/(tabs)/outfit');
  };

  const handleBulkUpload = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow gallery access to upload your clothing photos.',
        );
        return;
      }

      // Allow multiple selection
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10, // Limit to 10 images at once
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        Alert.alert(
          'Processing Images',
          `Processing ${result.assets.length} image${result.assets.length > 1 ? 's' : ''}. This may take a moment...`,
          [
            {
              text: 'OK',
              onPress: async () => {
                let successCount = 0;
                let failCount = 0;

                // Process each image
                for (const asset of result.assets) {
                  try {
                    // Use your existing wardrobe service
                    await wardrobeService.saveClothingWithImage(asset.uri);
                    successCount++;
                  } catch (error) {
                    console.error('Failed to process image:', error);
                    failCount++;
                  }
                }

                // Reload wardrobe count
                loadHomeData();

                // Show results
                Alert.alert(
                  'Upload Complete!',
                  `✅ ${successCount} items added successfully${failCount > 0 ? `\n❌ ${failCount} failed` : ''}`,
                );
              },
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert('Upload Failed', 'Something went wrong. Please try again.');
    }
  };

  const getWeatherIcon = () => {
    if (!weather) return Sun;

    switch (weather.condition) {
      case 'sunny':
        return Sun;
      case 'rainy':
        return CloudRain;
      case 'snowy':
        return CloudSnow;
      case 'windy':
        return Wind;
      case 'cloudy':
        return Cloud;
      default:
        return Sun;
    }
  };

  const WeatherIcon = getWeatherIcon();

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.webContainer}>
        <Text style={styles.webMessage}>
          📱 aLMARi works best on mobile devices
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.logo}>
            <Text style={styles.logoA}>a</Text>
            <Text style={styles.logoMain}>LMAR</Text>
            <Text style={styles.logoI}>i</Text>
          </Text>

          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={IconSizes.md} color={Colors.neutral[400]} />
          <TextInput
            placeholder="Search your wardrobe..."
            placeholderTextColor={Colors.neutral[400]}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {/* Search Results */}
        {searchQuery.length > 0 && (
          <View style={styles.searchResultsContainer}>
            {isSearching ? (
              <ActivityIndicator color={Colors.primary[500]} />
            ) : searchResults.length > 0 ? (
              searchResults.map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.searchResultItem}
                  onPress={() => {
                    setSearchQuery('');
                    router.push({
                      pathname: '/item-details',
                      params: { id: item.id },
                    });
                  }}
                >
                  <Text style={styles.searchResultName}>{item.name}</Text>
                  <Text style={styles.searchResultDetails}>
                    {item.category} • {item.color}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noResultsText}>No items found</Text>
            )}
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary[500]}
          />
        }
      >
        {/* Weather Card */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherHeader}>
            <View style={styles.weatherInfo}>
              <WeatherIcon
                size={40}
                color={Colors.primary[500]}
                strokeWidth={1.5}
              />
              <View style={styles.weatherDetails}>
                <Text style={styles.temperature}>
                  {weatherLoading ? '--' : weather?.temperature}°C
                </Text>
                <Text style={styles.weatherCondition}>
                  {weatherLoading ? 'Loading...' : weather?.description}
                </Text>
                <Text style={styles.weatherLocation}>
                  {weatherLoading ? '...' : weather?.location}
                </Text>
              </View>
            </View>

            {!weatherLoading && weather && (
              <View style={styles.weatherStats}>
                <View style={styles.weatherStat}>
                  <Text style={styles.weatherStatLabel}>Humidity</Text>
                  <Text style={styles.weatherStatValue}>
                    {weather.humidity}%
                  </Text>
                </View>
                <View style={styles.weatherStat}>
                  <Text style={styles.weatherStatLabel}>Wind</Text>
                  <Text style={styles.weatherStatValue}>
                    {weather.windSpeed} km/h
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Today's Outfit Card */}
        <View style={styles.todaysOutfitCard}>
          <View style={styles.outfitHeader}>
            <View>
              <Text style={styles.outfitTitle}>Today's Outfit</Text>
              <Text style={styles.outfitSubtitle}>
                AI-powered recommendations
              </Text>
            </View>

            {!todaysOutfit && (
              <TouchableOpacity
                style={styles.generateButton}
                onPress={generateTodaysOutfit}
              >
                <Sparkles size={16} color={Colors.text.inverse} />
                <Text style={styles.generateButtonText}>Generate</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.outfitContent}>
            {todaysOutfit ? (
             
              <View style={styles.todaysOutfitPreview}>
                <View style={styles.todaysOutfitItems}>
                  {todaysOutfit.items.slice(0, 2).map((item, index) => (
                    <View key={index} style={styles.todaysOutfitItemCard}>
                      <Image
                        source={{ uri: item.imageUri }}
                        style={styles.todaysOutfitImage}
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </View>
                <Text style={styles.todaysOutfitOccasion}>
                  {todaysOutfit.occasion}
                </Text>
                <Text style={styles.todaysOutfitReasoning} numberOfLines={2}>
                  {todaysOutfit.reasoning}
                </Text>
                <TouchableOpacity
                  style={styles.viewOutfitButton}
                  onPress={() => router.push('/(tabs)/outfit')}
                >
                  <Text style={styles.viewOutfitButtonText}>
                    View Full Outfit
                  </Text>
                  <ChevronRight size={16} color={Colors.primary[500]} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Shirt size={80} color={Colors.neutral[200]} strokeWidth={1} />
                <Text style={styles.outfitEmptyText}>
                  Get personalized outfit suggestions based on weather,
                  occasion, and your style
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatCard
            icon={Shirt}
            label="Items"
            value={wardrobeCount}
            color={Colors.primary[500]}
          />
          <StatCard
            icon={Droplets}
            label="Laundry"
            value={laundryCount}
            color={Colors.info}
          />
          <StatCard
            icon={Heart}
            label="Favorites"
            value={0}
            color={Colors.error}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              icon={Plus}
              title="Add Item"
              onPress={() => router.push('/(tabs)/camera')}
              color={Colors.primary[500]}
            />
            <QuickActionCard
              icon={Sparkles}
              title="Generate Outfit"
              onPress={generateTodaysOutfit}
              color={Colors.success}
            />
            <QuickActionCard
              icon={Zap}
              title="Bulk Upload"
              onPress={handleBulkUpload}
              color={Colors.warning}
            />
            <QuickActionCard
              icon={Calendar}
              title="Plan Outfits"
              onPress={() => router.push('/calendar-screen')}
              color={Colors.info}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <View style={styles.statCard}>
    <Icon size={24} color={color} strokeWidth={2} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const QuickActionCard = ({ icon: Icon, title, onPress, color }: any) => (
  <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
    <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
      <Icon size={IconSizes.lg} color={color} strokeWidth={2} />
    </View>
    <Text style={styles.quickActionTitle}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },

  scrollContent: {
    paddingBottom: 120,
  },

  header: {
    backgroundColor: Colors.background.primary,
    paddingBottom: Spacing.md,
    ...Shadows.sm,
  },

  headerContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    marginBottom: Spacing.md,
  },

  logo: {
    fontSize: 36,
    fontWeight: '400' as const,
    fontFamily: 'Centaur',
    marginBottom: Spacing.xs,
    letterSpacing: 1,
  },

  logoA: { color: Colors.primary[500] },
  logoMain: { color: Colors.text.primary },
  logoI: { color: Colors.primary[500] },

  dateText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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

  searchResultsContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    maxHeight: 300,
  },

  searchResultItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },

  searchResultName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  searchResultDetails: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  noResultsText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
  },

  weatherCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },

  weatherHeader: { gap: Spacing.md },

  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },

  weatherDetails: { flex: 1 },

  temperature: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },

  weatherCondition: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textTransform: 'capitalize',
  },

  weatherLocation: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.tertiary,
  },

  weatherStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },

  weatherStat: { flex: 1 },

  weatherStatLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
    marginBottom: 4,
  },

  weatherStatValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  todaysOutfitCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },

  outfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },

  outfitTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  outfitSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginTop: 4,
  },

  generateButton: {
    backgroundColor: Colors.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 4,
  },

  generateButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },

  outfitContent: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },

  outfitEmptyText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.sm,
  },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },

  statCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },

  statValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginTop: Spacing.xs,
  },

  statLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    marginTop: 4,
  },

  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xl,
  },

  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },

  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  quickActionCard: {
    width: (width - Spacing.md * 3) / 2,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },

  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },

  quickActionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    textAlign: 'center',
  },

  webContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },

  webMessage: {
    fontSize: Typography.sizes.xl,
    textAlign: 'center',
    color: Colors.text.primary,
  },
  todaysOutfitPreview: {
    width: '100%',
    alignItems: 'center' as const,
  },

  todaysOutfitItems: {
    flexDirection: 'row' as const,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    alignItems: 'center' as const,
  },

  todaysOutfitItemCard: {
    width: 80,
    height: 106,
    borderRadius: BorderRadius.md,
    overflow: 'hidden' as const,
    backgroundColor: Colors.neutral[100],
    ...Shadows.sm,
  },

  todaysOutfitImage: {
    flex: 1,
  },

  moreItemsBadge: {
    width: 80,
    height: 106,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  moreItemsText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold as '700',
    color: Colors.primary[600],
  },

  todaysOutfitOccasion: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold as '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },

  todaysOutfitReasoning: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.sm,
    marginBottom: Spacing.md,
  },

  viewOutfitButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  viewOutfitButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold as '600',
    color: Colors.primary[500],
  },
});
