import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, Sparkles } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Design';
import { saveWardrobeItem, updateWardrobeItem, StoredWardrobeItem } from '@/services/WardrobeStorage';

const CATEGORIES = ['Shirts', 'Pants', 'Dresses', 'Jackets', 'Shoes', 'Accessories'];
const COLORS = ['Black', 'White', 'Blue', 'Red', 'Green', 'Yellow', 'Gray', 'Brown'];


export default function ItemDetailsScreen() {
  const params = useLocalSearchParams();
  const isNewItem = params.isNewItem === 'true';
  
  const [item, setItem] = useState({
    name: '',
    category: '',
    colors: [] as string[],
    description: '',
    notes: '',
    brand: '',
    size: '',
    image: (params.imageUri as string) || 'https://placehold.co/300x400/8B5CF6/ffffff?text=New+Item',
  });

  const [aiSuggestion, setAiSuggestion] = useState('');

  useEffect(() => {
    console.log('Item details params:', params);
    console.log('Image URI from params:', params.imageUri);
    console.log('Is new item:', isNewItem);
  
    if (isNewItem) {
    // Get processed image data from params
      const dominantColors = params.dominantColors 
        ? JSON.parse(params.dominantColors as string) 
        : [];
    
      console.log('Setting item image to:', params.imageUri);
    
    // Pre-fill colors from image processing
      setItem(prev => ({
        ...prev,
        colors: dominantColors,
        image: params.imageUri as string // Make sure this gets set
      }));
    
      // Simulate AI analysis of the captured photo
      setTimeout(() => {
        setAiSuggestion('AI detected: Blue cotton shirt with collar, casual style, light blue color');
        // Pre-fill some fields based on AI
        setItem(prev => ({
          ...prev,
          name: 'Blue Cotton Shirt',
          category: 'Shirts',
          colors: ['Blue'],
          description: 'Casual cotton shirt with collar, light blue color, comfortable fit'
        }));
      }, 2000);
    }
  }, []);

  const toggleColor = (color: string) => {
    setItem(prev => ({
      ...prev,
      colors: prev.colors.includes(color) 
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }));
  };

  const saveItem = async () => {
    if (!item.name) {
      Alert.alert('Missing Name', 'Please add a name for this item');
      return;
    }

    try {
      const wardrobeItem: StoredWardrobeItem = {
        id: params.itemId as string || Date.now().toString(),
        name: item.name,
        category: item.category,
        colors: item.colors,
        description: item.description,
        notes: item.notes,
        brand: item.brand,
        size: item.size,
        image: item.image,
        inLaundry: false,
        dateAdded: new Date().toISOString(),
      };

      let success = false;
      if (isNewItem) {
        success = await saveWardrobeItem(wardrobeItem);
      } else {
        success = await updateWardrobeItem(wardrobeItem);
      }

      if (success) {
        Alert.alert(
          'Saved! ✅',
          `${item.name} has been ${isNewItem ? 'added to' : 'updated in'} your wardrobe.`,
          [{ text: 'OK', onPress: () => router.push('/wardrobe') }]
        );
      } else {
        Alert.alert('Error', 'Failed to save item. Please try again.');
      }
    } catch (error) {
      console.error('Save item error:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.secondary }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        backgroundColor: Colors.background.primary,
        ...Shadows.sm,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.md }}>
          <ArrowLeft size={24} color={Colors.neutral[600]} />
        </TouchableOpacity>
        <Text style={{
          flex: 1,
          fontSize: Typography.sizes.lg,
          fontWeight: Typography.weights.semibold,
          color: Colors.neutral[800],
        }}>
          {isNewItem ? 'Describe Your Item' : 'Edit Item'}
        </Text>
        <TouchableOpacity onPress={saveItem}>
          <Save size={24} color={Colors.primary[500]} />
        </TouchableOpacity>
      </View>
      {/* Image Display Section - ADD THIS */}
      <View style={{
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.md,
        }}>
          {item.image?(
        <Image
          source={{ uri: item.image }}
          style={{
            width: '100%',
            height: 200,
            borderRadius: BorderRadius.md,
            backgroundColor: Colors.neutral[100],
          }}
          resizeMode="cover"
          onError={(error) => {
            console.log('❌ Image failed to load:', item.image);
            console.error('Error details:', error.nativeEvent);
          }}
          onLoad={() => {
            console.log('✅ Image loaded successfully:', item.image);
          }}
        />
      ) : (
        <View style={{
          width: '100%',
          height: 200,
          borderRadius: BorderRadius.md,
          backgroundColor: Colors.neutral[200],
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{ color: Colors.neutral[500] }}>No Image</Text>
     </View>
      )}
      
    </View>


      <ScrollView contentContainerStyle={{ padding: Spacing.md }}>
        {/* Item Photo */}
        <View style={{
          backgroundColor: Colors.background.primary,
          borderRadius: BorderRadius.lg,
          padding: Spacing.md,
          marginBottom: Spacing.md,
          ...Shadows.sm,
        }}>
          {/*<Image
            source={{ uri: item.image }}
            style={{
              width: '100%',
              height: 200,
              borderRadius: BorderRadius.md,
              backgroundColor: Colors.neutral[100],
            }}
            resizeMode="cover"
          />*/}
          
          {/* AI Suggestion Banner */}
          {aiSuggestion && (
            <View style={{
              backgroundColor: Colors.primary[50],
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              marginTop: Spacing.md,
              borderWidth: 1,
              borderColor: Colors.primary[100],
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Sparkles size={16} color={Colors.primary[500]} />
                <Text style={{
                  fontSize: Typography.sizes.sm,
                  fontWeight: Typography.weights.semibold,
                  color: Colors.primary[700],
                  marginLeft: 4,
                }}>
                  AI Suggestion
                </Text>
              </View>
              <Text style={{ fontSize: Typography.sizes.sm, color: Colors.primary[600] }}>
                {aiSuggestion}
              </Text>
            </View>
          )}
        </View>

        {/* Description Form */}
        <View style={{
          backgroundColor: Colors.background.primary,
          borderRadius: BorderRadius.lg,
          padding: Spacing.lg,
          ...Shadows.sm,
        }}>
          
          {/* Item Name */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={{ fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, marginBottom: 8 }}>
              Item Name
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: Colors.neutral[300],
                borderRadius: BorderRadius.md,
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.sm,
                fontSize: Typography.sizes.md,
              }}
              placeholder="e.g., Blue Cotton Shirt"
              value={item.name}
              onChangeText={(text) => setItem(prev => ({ ...prev, name: text }))}
            />
          </View>

          {/* Category */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={{ fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, marginBottom: 8 }}>
              Category
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(category => (
                <TouchableOpacity
                  key={category}
                  onPress={() => setItem(prev => ({ ...prev, category }))}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: BorderRadius.full,
                    backgroundColor: item.category === category ? Colors.primary[500] : Colors.neutral[100],
                    borderWidth: 1,
                    borderColor: item.category === category ? Colors.primary[500] : Colors.neutral[300],
                  }}
                >
                  <Text style={{
                    fontSize: Typography.sizes.sm,
                    color: item.category === category ? '#FFFFFF' : Colors.neutral[700],
                  }}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Colors */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={{ fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, marginBottom: 8 }}>
              Colors
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  onPress={() => toggleColor(color)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: BorderRadius.full,
                    backgroundColor: item.colors.includes(color) ? Colors.primary[500] : Colors.neutral[100],
                    borderWidth: 1,
                    borderColor: item.colors.includes(color) ? Colors.primary[500] : Colors.neutral[300],
                  }}
                >
                  <Text style={{
                    fontSize: Typography.sizes.sm,
                    color: item.colors.includes(color) ? '#FFFFFF' : Colors.neutral[700],
                  }}>
                    {color}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Brand & Size */}
          <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, marginBottom: 8 }}>
                Brand
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: Colors.neutral[300],
                  borderRadius: BorderRadius.md,
                  paddingHorizontal: Spacing.md,
                  paddingVertical: Spacing.sm,
                  fontSize: Typography.sizes.md,
                }}
                placeholder="e.g., Zara"
                value={item.brand}
                onChangeText={(text) => setItem(prev => ({ ...prev, brand: text }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, marginBottom: 8 }}>
                Size
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: Colors.neutral[300],
                  borderRadius: BorderRadius.md,
                  paddingHorizontal: Spacing.md,
                  paddingVertical: Spacing.sm,
                  fontSize: Typography.sizes.md,
                }}
                placeholder="M, L, XL"
                value={item.size}
                onChangeText={(text) => setItem(prev => ({ ...prev, size: text }))}
              />
            </View>
          </View>

          {/* Description */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={{ fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, marginBottom: 8 }}>
              Description
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: Colors.neutral[300],
                borderRadius: BorderRadius.md,
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.sm,
                fontSize: Typography.sizes.md,
                height: 80,
                textAlignVertical: 'top',
              }}
              placeholder="Describe the style, fit, material, pattern..."
              value={item.description}
              onChangeText={(text) => setItem(prev => ({ ...prev, description: text }))}
              multiline
            />
          </View>

          {/* Personal Notes */}
          <View style={{ marginBottom: Spacing.lg }}>
            <Text style={{ fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, marginBottom: 8 }}>
              Personal Notes
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: Colors.neutral[300],
                borderRadius: BorderRadius.md,
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.sm,
                fontSize: Typography.sizes.md,
                height: 60,
                textAlignVertical: 'top',
              }}
              placeholder="How it fits, when to wear, styling tips..."
              value={item.notes}
              onChangeText={(text) => setItem(prev => ({ ...prev, notes: text }))}
              multiline
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={{
            backgroundColor: Colors.primary[500],
            borderRadius: BorderRadius.md,
            paddingVertical: Spacing.md,
            alignItems: 'center',
            marginTop: Spacing.md,
            ...Shadows.sm,
          }}
          onPress={saveItem}
        >
          <Text style={{
            color: '#FFFFFF',
            fontSize: Typography.sizes.lg,
            fontWeight: Typography.weights.semibold,
          }}>
            Save to Wardrobe
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
