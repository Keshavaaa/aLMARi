import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

type CategoryFilterProps = {
  categories: string[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
};

export default function CategoryFilter({ categories, selectedCategory, onCategorySelect }: CategoryFilterProps) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      style={{ marginVertical: 12 }}
    >
      {categories.map((category) => (
        <TouchableOpacity
          key={category}
          onPress={() => onCategorySelect(category)}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: selectedCategory === category ? '#8B5CF6' : '#FFFFFF',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: selectedCategory === category ? '#8B5CF6' : '#E5E7EB',
            minWidth: 60,
            alignItems: 'center',
          }}
        >
          <Text style={{
            color: selectedCategory === category ? '#FFFFFF' : '#6B7280',
            fontSize: 14,
            fontWeight: selectedCategory === category ? '600' : '400',
          }}>
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
