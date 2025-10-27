import { View, Text, StyleSheet } from 'react-native';
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  Droplets,
  Wind
} from 'lucide-react-native';

interface WeatherCardProps {
  weather: any;
  loading: boolean;
}

export default function WeatherCard({ weather, loading }: WeatherCardProps) {
  const getWeatherIcon = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'sunny':
        return <Sun size={32} color="#F59E0B" />;
      case 'cloudy':
        return <Cloud size={32} color="#6B7280" />;
      case 'rainy':
        return <CloudRain size={32} color="#3B82F6" />;
      default:
        return <Sun size={32} color="#F59E0B" />;
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContent}>
          <Text style={styles.loadingText}>Loading weather...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.weatherHeader}>
        <View style={styles.weatherIcon}>
          {getWeatherIcon(weather?.condition)}
        </View>
        <View style={styles.weatherInfo}>
          <Text style={styles.temperature}>{weather?.temperature || '22'}°C</Text>
          <Text style={styles.condition}>{weather?.condition || 'Sunny'}</Text>
          <Text style={styles.location}>{weather?.location || 'Current Location'}</Text>
        </View>
      </View>
      
      <View style={styles.weatherDetails}>
        <View style={styles.detailItem}>
          <Droplets size={16} color="#3B82F6" />
          <Text style={styles.detailText}>{weather?.humidity || '65'}% Humidity</Text>
        </View>
        <View style={styles.detailItem}>
          <Wind size={16} color="#10B981" />
          <Text style={styles.detailText}>{weather?.windSpeed || '12'} km/h</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  weatherIcon: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 16,
    marginRight: 16,
  },
  weatherInfo: {
    flex: 1,
  },
  temperature: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
  },
  condition: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4,
  },
  location: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
});