// app/(tabs)/outfit.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Modal from 'react-native-modal';

// Icons
import {
  Sparkles,
  Calendar,
  RefreshCw,
  Plus,
  Clock,
  MapPin,
  Thermometer,
  Heart,
  Share2,
  Settings,
  ChevronRight,
  CheckCircle,
  X,
} from 'lucide-react-native';

// Types and Services
import {
  OutfitRecommendation,
  ClothingItem,
  WeatherCondition,
  OutfitCalendarEntry,
  AIRecommendationRequest,
  UserPreferences,
  TodayOutfitData,
} from '../../types/clothing';

import { getWardrobeItems } from '../../services/WardrobeService';
import { WeatherService } from '../../services/WeatherServices';
// Design System
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Shadows,
  IconSizes,
} from '../../constants/Design';

const { width } = Dimensions.get('window');

// Tab types for outfit sections
type OutfitTab = 'today' | 'calendar' | 'saved';
// Add this helper function at the top of your outfit.tsx file
const getWeatherDescription = (weather: WeatherCondition): string => {
  return weather.description?.toLowerCase() || weather.condition.toLowerCase();
};

export default function OutfitScreen() {
  // State management
  const [activeTab, setActiveTab] = useState<OutfitTab>('today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Data state
  const [todayOutfit, setTodayOutfit] = useState<TodayOutfitData | null>(null);
  const [recommendations, setRecommendations] = useState<
    OutfitRecommendation[]
  >([]);
  const [wardrobeItems, setWardrobeItems] = useState<ClothingItem[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<OutfitRecommendation[]>([]);
  const [scheduledOutfits, setScheduledOutfits] = useState<
    OutfitCalendarEntry[]
  >([]);
  // Modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedOutfit, setSelectedOutfit] =
    useState<OutfitRecommendation | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [weather, setWeather] = useState<WeatherCondition>({
    temperature: 22,
    condition: 'sunny',
    humidity: 50,
    windSpeed: 5,
    description: 'Clear sky',
    location: 'Your Location',
  });


  useEffect(() => {
    loadInitialData();
  }, []);

  /**
   * Load all initial data for outfit recommendations
   */
  const loadInitialData = async () => {
    setLoading(true);

    try {
      // Load wardrobe items
      const items = await getWardrobeItems();
      const availableItems = items.filter((item) => !item.inLaundry);
      setWardrobeItems(availableItems);

     

      // Load today's outfit if exists
      await loadTodayOutfit();

      // Load saved and scheduled outfits
      await loadSavedOutfits();
      await loadScheduledOutfits();

      // Generate fresh recommendations if needed
      if (availableItems.length > 0) {
        await generateRecommendations(availableItems);
      }
    } catch (error) {
      console.error('Failed to load outfit data:', error);
      Alert.alert(
        'Loading Error',
        'Failed to load outfit data. Please check your connection and try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Load today's outfit recommendation
   */
  const loadTodayOutfit = async () => {
    // TODO: Load from local storage or API
    const today = new Date().toDateString();
    // For now, we'll set it as empty - will be populated when user generates
    setTodayOutfit({
      hasRecommendation: false,
      weather: weather,
    });
  };

  /**
   * Load saved outfit combinations
   */
  const loadSavedOutfits = async () => {
    // TODO: Load from local storage
    setSavedOutfits([]);
  };

  /**
   * Load scheduled outfits from calendar
   */
  const loadScheduledOutfits = async () => {
    // TODO: Load from local storage
    setScheduledOutfits([]);
  };

  /**
   * Generate AI-powered outfit recommendations
   */
  const generateRecommendations = async (items?: ClothingItem[]) => {
    setGenerating(true);

    try {
      const availableItems =
        items || wardrobeItems.filter((item) => !item.inLaundry);

      if (availableItems.length === 0) {
        setRecommendations([]);
        return;
      }

      // TODO: Implement actual Gemini API call
      // For now, generate smart combinations based on rules
      const newRecommendations = await generateSmartOutfitCombinations(
        availableItems,
        weather,
        {
          favoriteColors: [],
          preferredBrands: [],
          avoidedMaterials: [],
          stylePreference: 'classic',
          formalityPreference: ['casual'],
          seasonalPreferences: { Spring: [], Summer: [], Fall: [], Winter: [] },
          preferredFit: 'fitted',
        },
      );

      setRecommendations(newRecommendations);

      // Set today's outfit to the highest scoring recommendation
      if (newRecommendations.length > 0) {
        const bestOutfit = newRecommendations[0];
        setTodayOutfit({
          hasRecommendation: true,
          recommendation: bestOutfit,
          weather: weather,
          lastGenerated: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      Alert.alert(
        'Generation Failed',
        'Failed to generate outfit recommendations. Please try again.',
      );
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Generate smart outfit combinations based on rules and preferences
   */
  const generateSmartOutfitCombinations = async (
    items: ClothingItem[],
    weather: WeatherCondition,
    preferences: UserPreferences,
  ): Promise<OutfitRecommendation[]> => {
    const combinations: OutfitRecommendation[] = [];

    // Categorize items
    const tops = items.filter((item) =>
      ['Tops', 'Shirts', 'Blouses', 'Sweaters'].some(
        (cat) => item.category.includes(cat) || item.subcategory?.includes(cat),
      ),
    );

    const bottoms = items.filter((item) =>
      ['Bottoms', 'Pants', 'Jeans', 'Shorts', 'Skirts'].some(
        (cat) => item.category.includes(cat) || item.subcategory?.includes(cat),
      ),
    );

    const dresses = items.filter((item) => item.category.includes('Dresses'));
    const shoes = items.filter((item) => item.category.includes('Shoes'));
    const outerwear = items.filter((item) =>
      item.category.includes('Outerwear'),
    );

    // Generate top + bottom combinations
    tops.forEach((top, topIndex) => {
      bottoms.forEach((bottom, bottomIndex) => {
        if (combinations.length < 8) {
          // Limit combinations
          const outfitItems = [top, bottom];

          // Add shoes if available
          if (shoes.length > 0) {
            const matchingShoe = findMatchingShoe(top, bottom, shoes);
            if (matchingShoe) outfitItems.push(matchingShoe);
          }

          // Add outerwear based on weather
          if (weather.temperature < 20 && outerwear.length > 0) {
            outfitItems.push(outerwear[0]);
          }

          const score = calculateOutfitScore(outfitItems, weather, preferences);

          combinations.push({
            id: `combo-${Date.now()}-${topIndex}-${bottomIndex}`,
            items: outfitItems,
            occasion: getOccasionFromFormality(top.formality),
            weather: weather,
            confidence: Math.round(score * 100),
            reasoning: generateOutfitReasoning(
              outfitItems,
              weather,
              preferences,
            ),
            scheduledDate: undefined,
            isScheduled: false,
            createdAt: new Date().toISOString(),
          });
        }
      });
    });

    // Add dress combinations
    dresses.forEach((dress, index) => {
      if (combinations.length < 10) {
        const outfitItems = [dress];

        if (shoes.length > 0) {
          outfitItems.push(shoes[index % shoes.length]);
        }

        const score = calculateOutfitScore(outfitItems, weather, preferences);

        combinations.push({
          id: `dress-${Date.now()}-${index}`,
          items: outfitItems,
          occasion: getOccasionFromFormality(dress.formality),
          weather: weather,
          confidence: Math.round(score * 100),
          reasoning: `${dress.name} is perfect for ${getWeatherDescription(weather)} weather`,
          scheduledDate: undefined,
          isScheduled: false,
          createdAt: new Date().toISOString(),
        });
      }
    });

    // Sort by confidence score
    return combinations.sort((a, b) => b.confidence - a.confidence);
  };

  /**
   * Calculate outfit compatibility score
   */
  const calculateOutfitScore = (
    items: ClothingItem[],
    weather: WeatherCondition,
    preferences: UserPreferences,
  ): number => {
    let score = 0.5; // Base score

    // Color coordination bonus
    const colors = items.map((item) => item.color);
    const uniqueColors = new Set(colors);
    if (uniqueColors.size <= 3) score += 0.2; // Good color coordination

    // Weather appropriateness
    if (weather.temperature > 25) {
      // Hot weather
      const hasLightweight = items.some((item) =>
        ['cotton', 'linen', 'bamboo'].some((material) =>
          item.material?.toLowerCase().includes(material),
        ),
      );
      if (hasLightweight) score += 0.15;
    } else if (weather.temperature < 15) {
      // Cold weather
      const hasWarmth = items.some(
        (item) =>
          item.category.includes('Outerwear') ||
          item.material?.toLowerCase().includes('wool'),
      );
      if (hasWarmth) score += 0.15;
    }

    // User preferences
    const hasPreferredColor = items.some((item) =>
      preferences.favoriteColors.includes(item.color),
    );
    if (hasPreferredColor) score += 0.1;

    // Formality consistency
    const formalities = items.map((item) => item.formality);
    const uniqueFormalities = new Set(formalities);
    if (uniqueFormalities.size <= 2) score += 0.1;

    return Math.min(score, 1); // Cap at 1.0
  };

  /**
   * Helper functions
   */
  const findMatchingShoe = (
    top: ClothingItem,
    bottom: ClothingItem,
    shoes: ClothingItem[],
  ) => {
    // Simple matching logic - can be enhanced
    return shoes[0];
  };

  const getOccasionFromFormality = (formality: string) => {
    switch (formality) {
      case 'formal':
        return 'Business/Formal Event';
      case 'semi-formal':
        return 'Dinner/Social Event';
      case 'smart-casual':
        return 'Work/Meeting';
      default:
        return 'Daily/Casual';
    }
  };

  const generateOutfitReasoning = (
    items: ClothingItem[],
    weather: WeatherCondition,
    preferences: UserPreferences,
  ) => {
    const reasons = [];

    if (weather.temperature > 25) {
      reasons.push('perfect for warm weather');
    } else if (weather.temperature < 15) {
      reasons.push('keeps you warm in cool weather');
    }

    const colors = items.map((item) => item.color);
    if (new Set(colors).size <= 2) {
      reasons.push('great color coordination');
    }

    const hasPreferredColor = items.some((item) =>
      preferences.favoriteColors.includes(item.color),
    );
    if (hasPreferredColor) {
      reasons.push('matches your color preferences');
    }

    return reasons.length > 0
      ? `This outfit is ${reasons.join(' and ')}.`
      : 'A great combination for today!';
  };

  /**
   * Handle outfit scheduling
   */
  const handleScheduleOutfit = (outfit: OutfitRecommendation, date: string) => {
    // TODO: Save to local storage or API
    const newEntry: OutfitCalendarEntry = {
      id: `scheduled-${Date.now()}`,
      date,
      outfitId: outfit.id,
      occasion: outfit.occasion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setScheduledOutfits((prev) => [...prev, newEntry]);
    setShowScheduleModal(false);
    setSelectedOutfit(null);

    Alert.alert(
      'Outfit Scheduled! 📅',
      `Your outfit has been scheduled for ${new Date(date).toLocaleDateString()}`,
    );
  };

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = () => {
    setRefreshing(true);
    loadInitialData();
  };

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Outfit Assistant</Text>
        <WeatherCard weather={weather} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TabButton
          title="Today"
          isActive={activeTab === 'today'}
          onPress={() => setActiveTab('today')}
          icon={Sparkles}
        />
        <TabButton
          title="Calendar"
          isActive={activeTab === 'calendar'}
          onPress={() => setActiveTab('calendar')}
          icon={Calendar}
        />
        <TabButton
          title="Saved"
          isActive={activeTab === 'saved'}
          onPress={() => setActiveTab('saved')}
          icon={Heart}
        />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary[500]}
          />
        }
      >
        {activeTab === 'today' && (
          <TodayOutfitsTab
            todayOutfit={todayOutfit}
            recommendations={recommendations}
            generating={generating}
            onGenerateNew={() => generateRecommendations()}
            onScheduleOutfit={(outfit) => {
              setSelectedOutfit(outfit);
              setShowScheduleModal(true);
            }}
            onSaveOutfit={(outfit) => {
              setSavedOutfits((prev) => [
                ...prev,
                { ...outfit, id: `saved-${Date.now()}` },
              ]);
              Alert.alert('Outfit Saved! 💾', 'Added to your saved outfits');
            }}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarTab
            scheduledOutfits={scheduledOutfits}
            onRemoveScheduled={(entryId) => {
              setScheduledOutfits((prev) =>
                prev.filter((entry) => entry.id !== entryId),
              );
            }}
          />
        )}

        {activeTab === 'saved' && (
          <SavedOutfitsTab
            savedOutfits={savedOutfits}
            onRemoveSaved={(outfitId) => {
              setSavedOutfits((prev) =>
                prev.filter((outfit) => outfit.id !== outfitId),
              );
            }}
            onScheduleOutfit={(outfit) => {
              setSelectedOutfit(outfit);
              setShowScheduleModal(true);
            }}
          />
        )}

        {wardrobeItems.length === 0 && (
          <EmptyWardrobeState
            onAddClothes={() => router.push('/(tabs)/camera')}
          />
        )}
      </ScrollView>

      {/* Schedule Modal */}
      <ScheduleModal
        visible={showScheduleModal}
        outfit={selectedOutfit}
        onClose={() => {
          setShowScheduleModal(false);
          setSelectedOutfit(null);
        }}
        onSchedule={handleScheduleOutfit}
      />
    </SafeAreaView>
  );
}

/**
 * Component definitions for better organization
 */

const LoadingState = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={Colors.primary[500]} />
    <Text style={styles.loadingText}>Getting your perfect outfits...</Text>
  </View>
);

const WeatherCard = ({ weather }: { weather: WeatherCondition }) => (
  <View style={styles.weatherCard}>
    <View style={styles.weatherInfo}>
      <Thermometer size={16} color={Colors.primary[500]} />
      <Text style={styles.weatherText}>
        {weather.temperature}°C • {weather.description}
      </Text>
      {weather.location && (
        <>
          <MapPin size={14} color={Colors.neutral[400]} />
          <Text style={styles.locationText}>{weather.location}</Text>
        </>
      )}
    </View>
  </View>
);

const TabButton = ({
  title,
  isActive,
  onPress,
  icon: Icon,
}: {
  title: string;
  isActive: boolean;
  onPress: () => void;
  icon: any;
}) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.tabButtonActive]}
    onPress={onPress}
  >
    <Icon
      size={16}
      color={isActive ? Colors.primary[500] : Colors.neutral[500]}
    />
    <Text
      style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}
    >
      {title}
    </Text>
  </TouchableOpacity>
);

const TodayOutfitsTab = ({
  todayOutfit,
  recommendations,
  generating,
  onGenerateNew,
  onScheduleOutfit,
  onSaveOutfit,
}: {
  todayOutfit: TodayOutfitData | null;
  recommendations: OutfitRecommendation[];
  generating: boolean;
  onGenerateNew: () => void;
  onScheduleOutfit: (outfit: OutfitRecommendation) => void;
  onSaveOutfit: (outfit: OutfitRecommendation) => void;
}) => (
  <View style={styles.tabContent}>
    {/* Today's Featured Outfit */}
    {todayOutfit?.hasRecommendation && todayOutfit.recommendation && (
      <View style={styles.featuredOutfit}>
        <Text style={styles.sectionTitle}>Today's Perfect Outfit</Text>
        <OutfitCard
          outfit={todayOutfit.recommendation}
          featured={true}
          onSchedule={() => onScheduleOutfit(todayOutfit.recommendation!)}
          onSave={() => onSaveOutfit(todayOutfit.recommendation!)}
        />
      </View>
    )}

    {/* Generate Button */}
    <TouchableOpacity
      style={styles.generateButton}
      onPress={onGenerateNew}
      disabled={generating}
    >
      {generating ? (
        <ActivityIndicator size="small" color={Colors.text.inverse} />
      ) : (
        <Sparkles size={IconSizes.md} color={Colors.text.inverse} />
      )}
      <Text style={styles.generateButtonText}>
        {generating ? 'Generating...' : 'Generate New Outfits'}
      </Text>
    </TouchableOpacity>

    {/* All Recommendations */}
    <Text style={styles.sectionTitle}>More Recommendations</Text>
    {recommendations.map((outfit) => (
      <OutfitCard
        key={outfit.id}
        outfit={outfit}
        onSchedule={() => onScheduleOutfit(outfit)}
        onSave={() => onSaveOutfit(outfit)}
      />
    ))}
  </View>
);

const CalendarTab = ({
  scheduledOutfits,
  onRemoveScheduled,
}: {
  scheduledOutfits: OutfitCalendarEntry[];
  onRemoveScheduled: (entryId: string) => void;
}) => (
  <View style={styles.tabContent}>
    <Text style={styles.sectionTitle}>Scheduled Outfits</Text>
    {scheduledOutfits.length === 0 ? (
      <View style={styles.emptySchedule}>
        <Calendar size={48} color={Colors.neutral[300]} />
        <Text style={styles.emptyText}>No scheduled outfits</Text>
        <Text style={styles.emptySubtext}>
          Schedule outfits for upcoming events and occasions
        </Text>
      </View>
    ) : (
      scheduledOutfits.map((entry) => (
        <ScheduledOutfitCard
          key={entry.id}
          entry={entry}
          onRemove={() => onRemoveScheduled(entry.id)}
        />
      ))
    )}
  </View>
);

const SavedOutfitsTab = ({
  savedOutfits,
  onRemoveSaved,
  onScheduleOutfit,
}: {
  savedOutfits: OutfitRecommendation[];
  onRemoveSaved: (outfitId: string) => void;
  onScheduleOutfit: (outfit: OutfitRecommendation) => void;
}) => (
  <View style={styles.tabContent}>
    <Text style={styles.sectionTitle}>Saved Outfits</Text>
    {savedOutfits.length === 0 ? (
      <View style={styles.emptySaved}>
        <Heart size={48} color={Colors.neutral[300]} />
        <Text style={styles.emptyText}>No saved outfits</Text>
        <Text style={styles.emptySubtext}>
          Save your favorite outfit combinations here
        </Text>
      </View>
    ) : (
      savedOutfits.map((outfit) => (
        <OutfitCard
          key={outfit.id}
          outfit={outfit}
          saved={true}
          onSchedule={() => onScheduleOutfit(outfit)}
          onRemove={() => onRemoveSaved(outfit.id)}
        />
      ))
    )}
  </View>
);

const OutfitCard = ({
  outfit,
  featured = false,
  saved = false,
  onSchedule,
  onSave,
  onRemove,
}: {
  outfit: OutfitRecommendation;
  featured?: boolean;
  saved?: boolean;
  onSchedule: () => void;
  onSave?: () => void;
  onRemove?: () => void;
}) => (
  <View style={[styles.outfitCard, featured && styles.featuredCard]}>
    <View style={styles.outfitHeader}>
      <View>
        <Text style={[styles.outfitTitle, featured && styles.featuredTitle]}>
          {featured ? '✨ Perfect Match' : `${outfit.confidence}% Match`}
        </Text>
        <Text style={styles.occasionText}>{outfit.occasion}</Text>
      </View>
      <View style={styles.confidenceScore}>
        <Text style={styles.scoreText}>{outfit.confidence}%</Text>
      </View>
    </View>

    <Text style={styles.outfitReasoning}>{outfit.reasoning}</Text>

    <View style={styles.itemsList}>
      {outfit.items.map((item, index) => (
        <View key={`${outfit.id}-${index}`} style={styles.itemChip}>
          <Text style={styles.itemChipText}>{item.name}</Text>
        </View>
      ))}
    </View>

    <View style={styles.outfitActions}>
      <TouchableOpacity style={styles.actionButton} onPress={onSchedule}>
        <Calendar size={16} color={Colors.primary[500]} />
        <Text style={styles.actionButtonText}>Schedule</Text>
      </TouchableOpacity>

      {onSave && (
        <TouchableOpacity style={styles.actionButton} onPress={onSave}>
          <Heart size={16} color={Colors.success} />
          <Text style={styles.actionButtonText}>Save</Text>
        </TouchableOpacity>
      )}

      {onRemove && (
        <TouchableOpacity style={styles.actionButton} onPress={onRemove}>
          <X size={16} color={Colors.error} />
          <Text style={styles.actionButtonText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const ScheduledOutfitCard = ({
  entry,
  onRemove,
}: {
  entry: OutfitCalendarEntry;
  onRemove: () => void;
}) => (
  <View style={styles.scheduledCard}>
    <View style={styles.scheduledHeader}>
      <View>
        <Text style={styles.scheduledDate}>
          {new Date(entry.date).toLocaleDateString()}
        </Text>
        <Text style={styles.scheduledOccasion}>{entry.occasion}</Text>
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
        <X size={16} color={Colors.error} />
      </TouchableOpacity>
    </View>
  </View>
);

const EmptyWardrobeState = ({ onAddClothes }: { onAddClothes: () => void }) => (
  <View style={styles.emptyWardrobe}>
    <Text style={styles.emptyIcon}>👔</Text>
    <Text style={styles.emptyTitle}>Your wardrobe is empty</Text>
    <Text style={styles.emptySubtitle}>
      Add some clothes to get personalized AI outfit recommendations
    </Text>
    <TouchableOpacity style={styles.addButton} onPress={onAddClothes}>
      <Plus size={IconSizes.md} color={Colors.text.inverse} />
      <Text style={styles.addButtonText}>Add Your First Item</Text>
    </TouchableOpacity>
  </View>
);

const ScheduleModal = ({
  visible,
  outfit,
  onClose,
  onSchedule,
}: {
  visible: boolean;
  outfit: OutfitRecommendation | null;
  onClose: () => void;
  onSchedule: (outfit: OutfitRecommendation, date: string) => void;
}) => {
  const [selectedDate, setSelectedDate] = useState('');

  const handleSchedule = () => {
    if (outfit && selectedDate) {
      onSchedule(outfit, selectedDate);
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      style={styles.modal}
      swipeDirection="down"
      onSwipeComplete={onClose}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Schedule Outfit</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={IconSizes.lg} color={Colors.neutral[600]} />
          </TouchableOpacity>
        </View>

        {outfit && (
          <View style={styles.modalBody}>
            <Text style={styles.modalSubtitle}>
              Schedule this {outfit.confidence}% match outfit for a future date
            </Text>

            {/* Date selection - simplified for demo */}
            <View style={styles.dateSelection}>
              <Text style={styles.dateLabel}>Select Date:</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  // TODO: Implement proper date picker
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setSelectedDate(tomorrow.toISOString());
                }}
              >
                <Calendar size={16} color={Colors.primary[500]} />
                <Text style={styles.dateButtonText}>
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString()
                    : 'Choose Date'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.scheduleButton,
                !selectedDate && styles.scheduleButtonDisabled,
              ]}
              onPress={handleSchedule}
              disabled={!selectedDate}
            >
              <Text style={styles.scheduleButtonText}>Schedule Outfit</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },

  // Header
  header: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    ...Shadows.sm,
  },

  title: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },

  weatherCard: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary[100],
  },

  weatherInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.xs,
  },

  weatherText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary[700],
    fontWeight: Typography.weights.medium,
  },

  locationText: {
    fontSize: Typography.sizes.sm,
    color: Colors.neutral[500],
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },

  tabButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },

  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary[500],
  },

  tabButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.neutral[500],
    fontWeight: Typography.weights.medium,
  },

  tabButtonTextActive: {
    color: Colors.primary[500],
  },

  // Content
  content: {
    flex: 1,
  },

  tabContent: {
    padding: Spacing.md,
  },

  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },

  // Generate Button
  generateButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.primary[500],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },

  generateButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },

  // Outfit Cards
  outfitCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  featuredCard: {
    borderColor: Colors.primary[500],
    borderWidth: 2,
    backgroundColor: Colors.primary[50],
  },

  featuredOutfit: {
    marginBottom: Spacing.lg,
  },

  outfitHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: Spacing.sm,
  },

  outfitTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  featuredTitle: {
    color: Colors.primary[700],
    fontSize: Typography.sizes.lg,
  },

  occasionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },

  confidenceScore: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },

  scoreText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.success,
  },

  outfitReasoning: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.sm,
  },

  itemsList: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },

  itemChip: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },

  itemChipText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
  },

  outfitActions: {
    flexDirection: 'row' as const,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: Spacing.sm,
  },

  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingVertical: 4,
  },

  actionButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  // Scheduled Cards
  scheduledCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },

  scheduledHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  scheduledDate: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  scheduledOccasion: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  removeButton: {
    padding: Spacing.xs,
  },

  // Empty States
  emptySchedule: {
    alignItems: 'center' as const,
    paddingVertical: Spacing.xxl,
  },

  emptySaved: {
    alignItems: 'center' as const,
    paddingVertical: Spacing.xxl,
  },

  emptyWardrobe: {
    alignItems: 'center' as const,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },

  emptyText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    textAlign: 'center' as const,
  },

  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    textAlign: 'center' as const,
  },

  emptySubtext: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: Spacing.xl,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.md,
  },

  emptySubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: Spacing.xl,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.md,
  },

  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },

  addButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: Spacing.xl,
  },

  loadingText: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginTop: Spacing.md,
  },

  // Modal
  modal: {
    justifyContent: 'flex-end' as const,
    margin: 0,
  },

  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: Dimensions.get('window').height * 0.7,
  },

  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },

  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  modalBody: {
    padding: Spacing.lg,
  },

  modalSubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.md,
  },

  dateSelection: {
    marginBottom: Spacing.xl,
  },

  dateLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },

  dateButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.neutral[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: Spacing.sm,
  },

  dateButtonText: {
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
  },

  scheduleButton: {
    backgroundColor: Colors.primary[500],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
  },

  scheduleButtonDisabled: {
    backgroundColor: Colors.neutral[300],
  },

  scheduleButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
};
