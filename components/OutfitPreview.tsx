// components/OutfitPreview.tsx
import React from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { ClothingItem, OutfitRecommendation } from '../types/clothing';

interface OutfitPreviewProps {
  outfit: OutfitRecommendation; // Use the correct type
  wardrobeItems?: ClothingItem[]; // Make optional since outfit already has items
}

export const OutfitPreview: React.FC<OutfitPreviewProps> = ({
  outfit,
  wardrobeItems,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.outfitGrid}>
        {outfit.items.map((item) => (
          <View key={item.id} style={styles.itemContainer}>
            <Image source={{ uri: item.imageUri }} style={styles.itemImage} />
            <Text style={styles.itemType}>{item.category}</Text>
          </View>
        ))}
      </View>

      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>Confidence: {outfit.confidence}%</Text>
        <Text style={styles.reasoningText}>{outfit.reasoning}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8,
  },
  outfitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  itemContainer: {
    alignItems: 'center',
    margin: 8,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 4,
  },
  itemType: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  reasoningText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
