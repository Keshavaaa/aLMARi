import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react-native';

interface CategorySelectorProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

const categories = [
  { id: 'shirts', name: 'Shirts', subcategories: ['T-Shirts', 'Dress Shirts', 'Polo Shirts', 'Tank Tops'] },
  { id: 'pants', name: 'Pants', subcategories: ['Jeans', 'Chinos', 'Dress Pants', 'Shorts', 'Leggings'] },
  { id: 'dresses', name: 'Dresses', subcategories: ['Casual Dresses', 'Formal Dresses', 'Maxi Dresses', 'Mini Dresses'] },
  { id: 'skirts', name: 'Skirts', subcategories: ['Mini Skirts', 'Midi Skirts', 'Maxi Skirts', 'Pencil Skirts'] },
  { id: 'jackets', name: 'Jackets', subcategories: ['Blazers', 'Hoodies', 'Leather Jackets', 'Winter Coats'] },
  { id: 'shoes', name: 'Shoes', subcategories: ['Sneakers', 'Boots', 'Heels', 'Flats', 'Sandals'] },
  { id: 'accessories', name: 'Accessories', subcategories: ['Bags', 'Belts', 'Hats', 'Jewelry', 'Scarves'] },
  { id: 'undergarments', name: 'Undergarments', subcategories: ['Bras', 'Underwear', 'Socks', 'Tights'] },
  { id: 'activewear', name: 'Activewear', subcategories: ['Sports Bras', 'Yoga Pants', 'Athletic Shorts', 'Swimwear'] },
];

export default function CategorySelector({ selectedCategory, onCategorySelect }: CategorySelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Category *</Text>
      
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={[styles.selectorText, !selectedCategory && styles.placeholder]}>
          {selectedCategory || 'Select a category'}
        </Text>
        <ChevronDown 
          size={20} 
          color="#6B7280" 
          style={[styles.chevron, isExpanded && styles.chevronUp]} 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.scrollView} nestedScrollEnabled>
            {categories.map((category) => (
              <View key={category.id} style={styles.categoryGroup}>
                <Text style={styles.categoryTitle}>{category.name}</Text>
                {category.subcategories.map((subcategory) => (
                  <TouchableOpacity
                    key={subcategory}
                    style={[
                      styles.subcategoryItem,
                      selectedCategory === subcategory && styles.selectedItem
                    ]}
                    onPress={() => {
                      onCategorySelect(subcategory);
                      setIsExpanded(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.subcategoryText,
                        selectedCategory === subcategory && styles.selectedText
                      ]}
                    >
                      {subcategory}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  selector: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectorText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholder: {
    color: '#9CA3AF',
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronUp: {
    transform: [{ rotate: '180deg' }],
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollView: {
    maxHeight: 280,
  },
  categoryGroup: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  subcategoryItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  selectedItem: {
    backgroundColor: '#EEF2FF',
  },
  subcategoryText: {
    fontSize: 14,
    color: '#4B5563',
  },
  selectedText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
});