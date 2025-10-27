import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, Sparkles } from 'lucide-react-native';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Shadows,
} from '@/constants/Design';
import DatabaseService from '@/services/DatabaseService';
const CATEGORIES = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Shoes',
  'Accessories',
  'Other',
];
const COLORS = [
  'Black',
  'White',
  'Blue',
  'Red',
  'Green',
  'Yellow',
  'Gray',
  'Brown',
  'Pink',
  'Purple',
  'Orange',
];

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
    image: '',
  });

  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    console.log('📝 Item details params:', params);
    console.log('🖼️ Image URI from params:', params.imageUri);
    console.log('🆕 Is new item:', isNewItem);

    try {
      if (isNewItem && params.imageUri) {
        const suggestedName = (params.suggestedName as string) || '';
        const suggestedCategory = (params.suggestedCategory as string) || '';
        const suggestedColor = (params.suggestedColor as string) || '';
        const suggestedDescription =
          (params.suggestedDescription as string) || '';

        const dominantColors = params.dominantColors
          ? (params.dominantColors as string).split(',').filter(Boolean)
          : [];

        console.log('🤖 AI Suggestions:', {
          name: suggestedName,
          category: suggestedCategory,
          color: suggestedColor,
          description: suggestedDescription,
          colors: dominantColors,
        });

        // Pre-fill with AI data
        setItem({
          name: suggestedName,
          category: suggestedCategory,
          colors: suggestedColor
            ? [suggestedColor]
            : dominantColors.slice(0, 2),
          description: suggestedDescription,
          notes: '',
          brand: '',
          size: '',
          image: params.imageUri as string,
        });

        // Set AI suggestion banner
        if (suggestedName && suggestedCategory) {
          setAiSuggestion(
            `AI detected: ${suggestedName} - ${suggestedDescription}`,
          );
        }
      } else if (!isNewItem && params.imageUri) {
        console.log('📂 Loading existing item from wardrobe');

        setItem({
          name: (params.name as string) || '',
          category: (params.category as string) || '',
          colors: params.color ? [params.color as string] : [],
          description: '',
          notes: (params.notes as string) || '',
          brand: (params.brand as string) || '',
          size: (params.size as string) || '',
          image: params.imageUri as string,
        });
      }
    } catch (error) {
      console.error('❌ useEffect error in item-details:', error);
      Alert.alert('Error', 'Failed to load item details. Please try again.');
    }
  }, [params.imageUri]);

  const toggleColor = (color: string) => {
    setItem((prev) => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter((c) => c !== color)
        : [...prev.colors, color],
    }));
  };

  const saveItem = async () => {
    if (!item.name.trim()) {
      Alert.alert('Missing Name', 'Please add a name for this item');
      return;
    }

    if (!item.category) {
      Alert.alert('Missing Category', 'Please select a category');
      return;
    }

    setIsSaving(true);

    try {
      console.log('💾 Saving item:', item);

      // Use direct SQLite
      const SQLite = require('expo-sqlite');
      const db = await DatabaseService.getDatabase();

      // Get or create user
      const deviceId = globalThis.deviceId || `android_${Date.now()}_temp`;

      let user = (await db.getFirstAsync(
        'SELECT * FROM users WHERE device_id = ?',
        [deviceId],
      )) as any;

      if (!user) {
        console.log('🆕 Creating new user');
        const result = await db.runAsync(
          'INSERT INTO users (username, device_id) VALUES (?, ?)',
          [`User_${Date.now()}`, deviceId],
        );
        user = { id: result.lastInsertRowId };
      }

      console.log('👤 User ID:', user.id);

      // Prepare AI analysis
      const aiAnalysisData = {
        description: item.description.trim(),
        notes: item.notes.trim(),
      };

      if (isNewItem) {
        // Insert new item
        const result = await db.runAsync(
          `
        INSERT INTO clothing_items (
          user_id, name, image_uri, clothing_type, primary_color,
          brand, size, ai_analysis
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
          [
            user.id,
            item.name.trim(),
            item.image,
            item.category,
            item.colors[0] || 'Unknown',
            item.brand.trim() || null,
            item.size.trim() || null,
            JSON.stringify(aiAnalysisData),
          ],
        );

        console.log('✅ Item saved with ID:', result.lastInsertRowId);
      } else {
        //  Update existing item
        const itemId = params.id as string;
        await db.runAsync(
          `
        UPDATE clothing_items 
        SET name = ?, clothing_type = ?, primary_color = ?, 
            brand = ?, size = ?, ai_analysis = ?
        WHERE id = ?
      `,
          [
            item.name.trim(),
            item.category,
            item.colors[0] || 'Unknown',
            item.brand.trim() || null,
            item.size.trim() || null,
            JSON.stringify(aiAnalysisData),
            parseInt(itemId),
          ],
        );

        console.log('✅ Item updated');
      }

      Alert.alert(
        '✅ Saved!',
        `${item.name} has been added to your wardrobe.`,
        [
          {
            text: 'View Wardrobe',
            onPress: () => router.push('/(tabs)/wardrobe'),
          },
        ],
      );
    } catch (error) {
      console.error('❌ Save item error:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.background.secondary }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: Spacing.md,
          backgroundColor: Colors.background.primary,
          ...Shadows.sm,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: Spacing.md }}
        >
          <ArrowLeft size={24} color={Colors.neutral[600]} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: Typography.sizes.lg,
            fontWeight: Typography.weights.semibold,
            color: Colors.neutral[800],
          }}
        >
          {isNewItem ? 'Review & Save Item' : 'Edit Item'}
        </Text>
        <TouchableOpacity onPress={saveItem} disabled={isSaving}>
          <Save
            size={24}
            color={isSaving ? Colors.neutral[300] : Colors.primary[500]}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.md }}>
        {/* Image Preview */}
        <View
          style={{
            backgroundColor: Colors.background.primary,
            borderRadius: BorderRadius.lg,
            padding: Spacing.md,
            marginBottom: Spacing.md,
            ...Shadows.sm,
          }}
        >
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={{
                width: '100%',
                height: 250,
                borderRadius: BorderRadius.md,
                backgroundColor: Colors.neutral[100],
              }}
              resizeMode="contain"
              onError={(error) => {
                console.log('❌ Image failed to load:', item.image);
                console.error('Error details:', error.nativeEvent);
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully');
              }}
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: 250,
                borderRadius: BorderRadius.md,
                backgroundColor: Colors.neutral[200],
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: Colors.neutral[500] }}>No Image</Text>
            </View>
          )}

          {/* AI Suggestion Banner */}
          {aiSuggestion && (
            <View
              style={{
                backgroundColor: Colors.primary[50],
                borderRadius: BorderRadius.md,
                padding: Spacing.md,
                marginTop: Spacing.md,
                borderWidth: 1,
                borderColor: Colors.primary[100],
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <Sparkles size={16} color={Colors.primary[500]} />
                <Text
                  style={{
                    fontSize: Typography.sizes.sm,
                    fontWeight: Typography.weights.semibold,
                    color: Colors.primary[700],
                    marginLeft: 4,
                  }}
                >
                  AI Analysis
                </Text>
              </View>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: Colors.primary[600],
                }}
              >
                {aiSuggestion}
              </Text>
            </View>
          )}
        </View>

        {/* Form */}
        <View
          style={{
            backgroundColor: Colors.background.primary,
            borderRadius: BorderRadius.lg,
            padding: Spacing.lg,
            ...Shadows.sm,
          }}
        >
          {/* Item Name */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text
              style={{
                fontSize: Typography.sizes.md,
                fontWeight: Typography.weights.semibold,
                marginBottom: 8,
              }}
            >
              Item Name *
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
              onChangeText={(text) =>
                setItem((prev) => ({ ...prev, name: text }))
              }
            />
          </View>

          {/* Category */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text
              style={{
                fontSize: Typography.sizes.md,
                fontWeight: Typography.weights.semibold,
                marginBottom: 8,
              }}
            >
              Category *
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  onPress={() => setItem((prev) => ({ ...prev, category }))}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: BorderRadius.full,
                    backgroundColor:
                      item.category === category
                        ? Colors.primary[500]
                        : Colors.neutral[100],
                    borderWidth: 1,
                    borderColor:
                      item.category === category
                        ? Colors.primary[500]
                        : Colors.neutral[300],
                  }}
                >
                  <Text
                    style={{
                      fontSize: Typography.sizes.sm,
                      color:
                        item.category === category
                          ? '#FFFFFF'
                          : Colors.neutral[700],
                    }}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Colors */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text
              style={{
                fontSize: Typography.sizes.md,
                fontWeight: Typography.weights.semibold,
                marginBottom: 8,
              }}
            >
              Colors
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => toggleColor(color)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: BorderRadius.full,
                    backgroundColor: item.colors.includes(color)
                      ? Colors.primary[500]
                      : Colors.neutral[100],
                    borderWidth: 1,
                    borderColor: item.colors.includes(color)
                      ? Colors.primary[500]
                      : Colors.neutral[300],
                  }}
                >
                  <Text
                    style={{
                      fontSize: Typography.sizes.sm,
                      color: item.colors.includes(color)
                        ? '#FFFFFF'
                        : Colors.neutral[700],
                    }}
                  >
                    {color}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Brand & Size */}
          <View
            style={{
              flexDirection: 'row',
              gap: Spacing.md,
              marginBottom: Spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: Typography.sizes.md,
                  fontWeight: Typography.weights.semibold,
                  marginBottom: 8,
                }}
              >
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
                onChangeText={(text) =>
                  setItem((prev) => ({ ...prev, brand: text }))
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: Typography.sizes.md,
                  fontWeight: Typography.weights.semibold,
                  marginBottom: 8,
                }}
              >
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
                onChangeText={(text) =>
                  setItem((prev) => ({ ...prev, size: text }))
                }
              />
            </View>
          </View>

          {/* Description */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text
              style={{
                fontSize: Typography.sizes.md,
                fontWeight: Typography.weights.semibold,
                marginBottom: 8,
              }}
            >
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
              placeholder="Style, fit, material, pattern..."
              value={item.description}
              onChangeText={(text) =>
                setItem((prev) => ({ ...prev, description: text }))
              }
              multiline
            />
          </View>

          {/* Personal Notes */}
          <View style={{ marginBottom: Spacing.lg }}>
            <Text
              style={{
                fontSize: Typography.sizes.md,
                fontWeight: Typography.weights.semibold,
                marginBottom: 8,
              }}
            >
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
              onChangeText={(text) =>
                setItem((prev) => ({ ...prev, notes: text }))
              }
              multiline
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={{
            backgroundColor: isSaving
              ? Colors.neutral[300]
              : Colors.primary[500],
            borderRadius: BorderRadius.md,
            paddingVertical: Spacing.md,
            alignItems: 'center',
            marginTop: Spacing.md,
            ...Shadows.sm,
          }}
          onPress={saveItem}
          disabled={isSaving}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: Typography.sizes.lg,
              fontWeight: Typography.weights.semibold,
            }}
          >
            {isSaving ? 'Saving...' : 'Save to Wardrobe'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
