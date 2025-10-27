// app/calendar-screen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Sparkles,
  X,
  Edit,
  Trash2,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
} from 'lucide-react-native';

// Components and Services
import { OutfitCalendar } from '../components/OutfitCalendar';
import calendarService, { ScheduledOutfit } from '../services/CalendarService';
import { WeatherService } from '../services/WeatherServices';
import { AIService } from '../services/AIService';
import wardrobeService from '../services/WardrobeService';

// Types
import {
  WeatherCondition,
} from '../types/clothing';

// Design System
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Shadows,
  IconSizes,
} from '../constants/Design';

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDateWeather, setSelectedDateWeather] =
    useState<WeatherCondition | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<ScheduledOutfit | null>(
    null,
  );
  const [upcomingOutfits, setUpcomingOutfits] = useState<ScheduledOutfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingOutfit, setGeneratingOutfit] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<WeatherCondition | null>(
    null,
  );

  useEffect(() => {
    loadCalendarData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadOutfitForDate(selectedDate);
    }
  }, [selectedDate]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      // Load upcoming scheduled outfits
      const upcoming = await calendarService.getUpcomingOutfits();
      setUpcomingOutfits(upcoming);

      // Load current weather for display
      const weather = await WeatherService.getCurrentWeather();
      setCurrentWeather(weather);

      // Set today's date as selected by default
      const today = calendarService.formatDate(new Date());
      setSelectedDate(today);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
      Alert.alert('Error', 'Failed to load calendar. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadOutfitForDate = async (date: string) => {
    try {
      const outfit = await calendarService.getOutfitForDate(date);
      setSelectedOutfit(outfit);
    } catch (error) {
      console.error('Failed to load outfit for date:', error);
    }
  };

  const handleDateSelect = async (
    date: string,
    hasOutfit: boolean,
    weather?: WeatherCondition,
  ) => {
    setSelectedDate(date);
    setSelectedDateWeather(weather || null);

    console.log(
      `Selected ${date}:`,
      weather ? `${weather.temperature}°C ${weather.condition}` : 'No forecast',
    );
  };

  const handleDeleteScheduledOutfit = async (id: string) => {
    Alert.alert(
      'Delete Scheduled Outfit',
      'Are you sure you want to remove this scheduled outfit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await calendarService.deleteScheduledOutfit(id);
              setSelectedOutfit(null);
              await loadCalendarData();
              Alert.alert('Success', 'Scheduled outfit deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete outfit');
            }
          },
        },
      ],
    );
  };

  const handleGenerateOutfitForDate = async () => {
    // Check if date is selected
    if (!selectedDate) {
      Alert.alert('Select a Date', 'Please select a date first');
      return;
    }

    // Check if it's a past date
    const selectedDateObj = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDateObj < today) {
      Alert.alert('Past Date', 'Cannot generate outfits for past dates');
      return;
    }

    // Check if weather forecast is available
    if (!selectedDateWeather) {
      Alert.alert(
        'Weather Unavailable',
        'Weather forecast is not available for this date. Please try a date within the next 16 days.',
      );
      return;
    }

    // Check if wardrobe has items
    const items = await wardrobeService.getWardrobeItems();
    if (items.length === 0) {
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

    setGeneratingOutfit(true);

    try {
      // Show generating alert with weather context
      Alert.alert(
        'Generating Outfit',
        `Creating outfit for ${selectedDateWeather.temperature}°C ${selectedDateWeather.condition} weather on ${new Date(selectedDate).toLocaleDateString()}`,
      );

      // Generate outfit with future date's weather
      const outfit = await AIService.generateOutfitRecommendation(
        items,
        selectedDateWeather,
        'casual day', // Could add UI to let user select occasion
      );

      // Schedule outfit with weather info
      await calendarService.scheduleOutfit(
        selectedDate,
        outfit,
        'casual day',
        undefined,
        selectedDateWeather,
      );

      // Reload calendar and outfit
      await loadCalendarData();
      await loadOutfitForDate(selectedDate);

      Alert.alert(
        '✨ Outfit Scheduled!',
        `For ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n\nWeather: ${selectedDateWeather.temperature}°C ${selectedDateWeather.condition}\nLocation: ${selectedDateWeather.location}\n\n${outfit.reasoning}\n\n${outfit.items.length} items selected • ${outfit.confidence}% match`,
      );
    } catch (error) {
      console.error('Failed to generate outfit:', error);
      Alert.alert(
        'Generation Failed',
        'Could not generate outfit. Please try again.',
      );
    } finally {
      setGeneratingOutfit(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCalendarData();
  };

  const getWeatherIcon = (condition?: string) => {
    if (!condition) return Sun;

    switch (condition.toLowerCase()) {
      case 'rainy':
        return CloudRain;
      case 'snowy':
        return CloudSnow;
      case 'windy':
        return Wind;
      case 'cloudy':
        return Cloud;
      case 'sunny':
      default:
        return Sun;
    }
  };

  const CurrentWeatherIcon = getWeatherIcon(currentWeather?.condition);
  const SelectedDateWeatherIcon = getWeatherIcon(
    selectedDateWeather?.condition,
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={IconSizes.lg} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Outfit Calendar</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary[500]}
          />
        }
      >
        {/* Current Weather Card */}
        {currentWeather && (
          <View style={styles.weatherCard}>
            <CurrentWeatherIcon size={24} color={Colors.primary[500]} />
            <View style={styles.weatherInfo}>
              <Text style={styles.weatherTemp}>
                {currentWeather.temperature}°C
              </Text>
              <Text style={styles.weatherDesc}>
                {currentWeather.description}
              </Text>
              <Text style={styles.weatherLocation}>
                📍 {currentWeather.location}
              </Text>
            </View>
          </View>
        )}

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <OutfitCalendar
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate}
          />
        </View>

        {/* Selected Date Section */}
        {selectedDate && (
          <View style={styles.selectedDateSection}>
            <View style={styles.selectedDateHeader}>
              <Text style={styles.sectionTitle}>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>

              {/* Show weather forecast for selected date */}
              {selectedDateWeather && (
                <View style={styles.selectedDateWeather}>
                  <SelectedDateWeatherIcon
                    size={16}
                    color={Colors.primary[500]}
                  />
                  <Text style={styles.selectedDateWeatherText}>
                    {selectedDateWeather.temperature}°C{' '}
                    {selectedDateWeather.condition}
                  </Text>
                </View>
              )}
            </View>

            {selectedOutfit ? (
              <View style={styles.outfitDetails}>
                <View style={styles.outfitHeader}>
                  <View>
                    <Text style={styles.outfitTitle}>
                      {selectedOutfit.outfitRecommendation.confidence}% Match
                    </Text>
                    <Text style={styles.outfitOccasion}>
                      {selectedOutfit.occasion}
                    </Text>
                    {/* Show weather that was used for this outfit */}
                    {selectedOutfit.weatherAtSchedule && (
                      <Text style={styles.outfitWeatherUsed}>
                        Planned for:{' '}
                        {selectedOutfit.weatherAtSchedule.temperature}°C{' '}
                        {selectedOutfit.weatherAtSchedule.condition}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      handleDeleteScheduledOutfit(selectedOutfit.id)
                    }
                    style={styles.deleteButton}
                  >
                    <Trash2 size={IconSizes.md} color={Colors.error} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.outfitReasoning}>
                  {selectedOutfit.outfitRecommendation.reasoning}
                </Text>

                <View style={styles.itemsList}>
                  {selectedOutfit.outfitRecommendation.items.map(
                    (item, index) => (
                      <View
                        key={`${selectedOutfit.id}-item-${index}`}
                        style={styles.itemChip}
                      >
                        <Text style={styles.itemChipText}>{item.name}</Text>
                        <Text style={styles.itemChipCategory}>
                          {item.category}
                        </Text>
                      </View>
                    ),
                  )}
                </View>

                {selectedOutfit.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{selectedOutfit.notes}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noOutfitContainer}>
                <Calendar size={48} color={Colors.neutral[300]} />
                <Text style={styles.noOutfitText}>No outfit scheduled</Text>
                <Text style={styles.noOutfitSubtext}>
                  {selectedDateWeather
                    ? `Generate a weather-appropriate outfit for ${selectedDateWeather.temperature}°C ${selectedDateWeather.condition} conditions`
                    : 'Select a future date to see weather forecast and generate outfit'}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.generateButton,
                    (!selectedDateWeather || generatingOutfit) &&
                      styles.generateButtonDisabled,
                  ]}
                  onPress={handleGenerateOutfitForDate}
                  disabled={!selectedDateWeather || generatingOutfit}
                >
                  {generatingOutfit ? (
                    <ActivityIndicator
                      size="small"
                      color={Colors.text.inverse}
                    />
                  ) : (
                    <Sparkles size={IconSizes.md} color={Colors.text.inverse} />
                  )}
                  <Text style={styles.generateButtonText}>
                    {generatingOutfit ? 'Generating...' : 'Generate Outfit'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Upcoming Outfits */}
        <View style={styles.upcomingSection}>
          <Text style={styles.sectionTitle}>Upcoming This Week</Text>

          {upcomingOutfits.length === 0 ? (
            <View style={styles.emptyUpcoming}>
              <Text style={styles.emptyText}>
                No upcoming scheduled outfits
              </Text>
            </View>
          ) : (
            upcomingOutfits.map((outfit) => {
              const UpcomingWeatherIcon = outfit.weatherAtSchedule
                ? getWeatherIcon(outfit.weatherAtSchedule.condition)
                : Calendar;

              return (
                <TouchableOpacity
                  key={outfit.id}
                  style={styles.upcomingCard}
                  onPress={() => setSelectedDate(outfit.date)}
                >
                  <View style={styles.upcomingDate}>
                    <Text style={styles.upcomingDay}>
                      {new Date(outfit.date).getDate()}
                    </Text>
                    <Text style={styles.upcomingMonth}>
                      {new Date(outfit.date).toLocaleDateString('en-US', {
                        month: 'short',
                      })}
                    </Text>
                  </View>

                  <View style={styles.upcomingInfo}>
                    <Text style={styles.upcomingOccasion}>
                      {outfit.occasion}
                    </Text>
                    <Text style={styles.upcomingItems}>
                      {outfit.outfitRecommendation.items.length} items •{' '}
                      {outfit.outfitRecommendation.confidence}% match
                    </Text>
                    {outfit.weatherAtSchedule && (
                      <View style={styles.upcomingWeather}>
                        <UpcomingWeatherIcon
                          size={14}
                          color={Colors.text.secondary}
                        />
                        <Text style={styles.upcomingWeatherText}>
                          {outfit.weatherAtSchedule.temperature}°C{' '}
                          {outfit.weatherAtSchedule.condition}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    ...Shadows.sm,
  },

  backButton: {
    padding: Spacing.xs,
  },

  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },

  headerSpacer: {
    width: IconSizes.lg + Spacing.xs * 2,
  },

  content: {
    flex: 1,
  },

  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },

  weatherInfo: {
    flex: 1,
  },

  weatherTemp: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary[700],
  },

  weatherDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary[600],
    textTransform: 'capitalize',
  },

  weatherLocation: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary[600],
    marginTop: 2,
  },

  calendarContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    ...Shadows.sm,
  },

  selectedDateSection: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },

  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },

  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  selectedDateWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },

  selectedDateWeatherText: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary[700],
    fontWeight: Typography.weights.medium,
  },

  outfitDetails: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },

  outfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },

  outfitTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  outfitOccasion: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },

  outfitWeatherUsed: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary[600],
    marginTop: 4,
  },

  deleteButton: {
    padding: Spacing.xs,
  },

  outfitReasoning: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.sm,
  },

  itemsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },

  itemChip: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary[100],
  },

  itemChipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.primary[700],
  },

  itemChipCategory: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary[600],
    marginTop: 2,
  },

  notesSection: {
    backgroundColor: Colors.neutral[50],
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },

  notesLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
    marginBottom: 4,
  },

  notesText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.sm,
  },

  noOutfitContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.sm,
  },

  noOutfitText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
  },

  noOutfitSubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.sm,
  },

  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },

  generateButtonDisabled: {
    backgroundColor: Colors.neutral[300],
  },

  generateButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },

  upcomingSection: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },

  emptyUpcoming: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },

  emptyText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  upcomingCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },

  upcomingDate: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },

  upcomingDay: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary[700],
  },

  upcomingMonth: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary[600],
    textTransform: 'uppercase',
  },

  upcomingInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  upcomingOccasion: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  upcomingItems: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },

  upcomingWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },

  upcomingWeatherText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },

  loadingText: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
  },
});
