// components/OutfitCalendar.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
} from 'lucide-react-native';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  IconSizes,
} from '../constants/Design';
import calendarService, { CalendarDay } from '../services/CalendarService';
import { WeatherCondition } from '../types/clothing';

const { width } = Dimensions.get('window');
const DAY_WIDTH = (width - Spacing.md * 2) / 7;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface OutfitCalendarProps {
  onDateSelect: (
    date: string,
    hasOutfit: boolean,
    weather?: WeatherCondition,
  ) => void;
  selectedDate?: string;
}

export const OutfitCalendar: React.FC<OutfitCalendarProps> = ({
  onDateSelect,
  selectedDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalendarMonth();
  }, [currentMonth]);

  const loadCalendarMonth = async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      // This automatically prefetches weather for all days in the month
      const days = await calendarService.getCalendarMonth(year, month);
      setCalendarDays(days);
    } catch (error) {
      console.error('Failed to load calendar month:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'sunny':
        return Sun;
      case 'rainy':
        return CloudRain;
      case 'snowy':
        return CloudSnow;
      case 'windy':
        return Wind;
      case 'cloudy':
      default:
        return Cloud;
    }
  };

  const renderCalendarHeader = () => (
    <View style={styles.calendarHeader}>
      <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthButton}>
        <ChevronLeft size={IconSizes.lg} color={Colors.primary[500]} />
      </TouchableOpacity>

      <Text style={styles.monthTitle}>
        {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
      </Text>

      <TouchableOpacity onPress={goToNextMonth} style={styles.monthButton}>
        <ChevronRight size={IconSizes.lg} color={Colors.primary[500]} />
      </TouchableOpacity>
    </View>
  );

  const renderWeekdayHeaders = () => (
    <View style={styles.weekdayContainer}>
      {WEEKDAYS.map((day) => (
        <View key={day} style={styles.weekdayCell}>
          <Text style={styles.weekdayText}>{day}</Text>
        </View>
      ))}
    </View>
  );

  const renderCalendarGrid = () => {
    // Get first day of month to calculate offset
    const firstDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    const firstDayOfWeek = firstDay.getDay();

    // Create empty cells for days before month starts
    const emptyCells = Array(firstDayOfWeek).fill(null);

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading weather...</Text>
        </View>
      );
    }

    return (
      <View style={styles.calendarGrid}>
        {emptyCells.map((_, index) => (
          <View key={`empty-${index}`} style={styles.dayCell} />
        ))}

        {calendarDays.map((day) => {
          const dayNumber = new Date(day.date).getDate();
          const isSelected = day.date === selectedDate;
          const WeatherIcon = day.weather
            ? getWeatherIcon(day.weather.condition)
            : null;

          return (
            <TouchableOpacity
              key={day.date}
              style={[
                styles.dayCell,
                day.isToday && styles.todayCell,
                isSelected && styles.selectedCell,
                day.isPast && styles.pastCell,
              ]}
              onPress={() => onDateSelect(day.date, day.hasOutfit, day.weather)}
            >
              <Text
                style={[
                  styles.dayNumber,
                  day.isToday && styles.todayText,
                  isSelected && styles.selectedText,
                  day.isPast && styles.pastText,
                ]}
              >
                {dayNumber}
              </Text>

              {/* Show weather icon for future dates */}
              {day.isFuture && WeatherIcon && day.weather && (
                <View style={styles.weatherIconContainer}>
                  <WeatherIcon
                    size={12}
                    color={
                      isSelected ? Colors.text.inverse : Colors.primary[500]
                    }
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.weatherTemp,
                      isSelected && styles.weatherTempSelected,
                    ]}
                  >
                    {day.weather.temperature}°
                  </Text>
                </View>
              )}

              {/* Show outfit indicator dot */}
              {day.hasOutfit && (
                <View
                  style={[
                    styles.outfitDot,
                    isSelected && styles.outfitDotSelected,
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderCalendarHeader()}
      {renderWeekdayHeaders()}
      {renderCalendarGrid()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },

  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },

  monthButton: {
    padding: Spacing.xs,
  },

  monthTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  weekdayContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },

  weekdayCell: {
    width: DAY_WIDTH,
    alignItems: 'center',
  },

  weekdayText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },

  loadingText: {
    marginTop: Spacing.sm,
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  dayCell: {
    width: DAY_WIDTH,
    height: DAY_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: Spacing.xs,
  },

  todayCell: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.sm,
  },

  selectedCell: {
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.sm,
  },

  pastCell: {
    opacity: 0.4,
  },

  dayNumber: {
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
    fontWeight: Typography.weights.medium,
  },

  todayText: {
    color: Colors.primary[700],
    fontWeight: Typography.weights.semibold,
  },

  selectedText: {
    color: Colors.text.inverse,
    fontWeight: Typography.weights.bold,
  },

  pastText: {
    color: Colors.text.tertiary,
  },

  weatherIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },

  weatherTemp: {
    fontSize: 9,
    color: Colors.primary[600],
    fontWeight: Typography.weights.semibold,
  },

  weatherTempSelected: {
    color: Colors.text.inverse,
  },

  outfitDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.success,
  },

  outfitDotSelected: {
    backgroundColor: Colors.text.inverse,
  },
});
