import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Heart, ShoppingBag } from 'lucide-react-native';

interface RecommendationCardProps {
  item: {
    id: string;
    name: string;
    category: string;
    imageUri: string;
    matchScore: number;
    reason: string;
  };
}

export default function RecommendationCard({ item }: RecommendationCardProps) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: item.imageUri }} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{item.name}</Text>
          <TouchableOpacity style={styles.favoriteButton}>
            <Heart size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.reason}>{item.reason}</Text>
        <View style={styles.footer}>
          <View style={styles.matchScore}>
            <Text style={styles.matchText}>{item.matchScore}% Match</Text>
          </View>
          <TouchableOpacity style={styles.selectButton}>
            <ShoppingBag size={14} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: 200,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  favoriteButton: {
    padding: 4,
  },
  category: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
    marginBottom: 8,
  },
  reason: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchScore: {
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  selectButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 8,
  },
});