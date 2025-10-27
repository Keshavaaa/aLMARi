// app/item-view.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Heart,
  Tag,
  Shirt,
  Droplet,
  Calendar,
  Package,
  StickyNote,
  TrendingUp,
  X,
  Check,
} from 'lucide-react-native';
import DatabaseService from '@/services/DatabaseService';
// Design System
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Shadows,
  IconSizes,
} from '../constants/Design';

export default function ItemViewScreen() {
  const params = useLocalSearchParams();
  const itemId = params.itemId as string;

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadItemDetails();
  }, [itemId]);

  const loadItemDetails = async () => {
    try {
      setLoading(true);
      const db = await DatabaseService.getDatabase();
      const result = (await db.getFirstAsync(
        'SELECT * FROM clothing_items WHERE id = ?',
        [parseInt(itemId)],
      )) as any;

      if (result) {
        setItem(result);
      }
    } catch (error) {
      console.error('Failed to load item:', error);
      Alert.alert('Error', 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Item', `Remove "${item.name}" from your wardrobe?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const db = await DatabaseService.getDatabase();
            
            if (item.image_uri) {
              try {
                const FileSystem = require('expo-file-system/legacy'); 
                const fileInfo = await FileSystem.getInfoAsync(item.image_uri);
                if (fileInfo.exists) {
                  await FileSystem.deleteAsync(item.image_uri);
                  console.log('✅ Image file deleted');
                }
              } catch (fileError) {
                console.error('⚠️ Failed to delete image file:', fileError);
                
              }
            }

            // Delete from database
            await db.runAsync('DELETE FROM clothing_items WHERE id = ?', [
              item.id,
            ]);
            console.log('✅ Item deleted from database');

            // Navigate back
            router.back();

            // Show success message after navigation
            setTimeout(() => {
              Alert.alert('Deleted', 'Item removed from your wardrobe');
            }, 500);
          } catch (error) {
            console.error('❌ Delete error:', error);
            Alert.alert('Error', 'Failed to delete item. Please try again.');
          }
        },
      },
    ]);
  };

  const handleToggleFavorite = async () => {
    try {
      const db = await DatabaseService.getDatabase();
      const newFavoriteStatus = item.is_favorite === 1 ? 0 : 1;

      await db.runAsync(
        'UPDATE clothing_items SET is_favorite = ? WHERE id = ?',
        [newFavoriteStatus, item.id],
      );

      setItem({ ...item, is_favorite: newFavoriteStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  const handleToggleLaundry = async () => {
    try {
      const db = await DatabaseService.getDatabase();
      const newStatus =
        item.laundry_status === 'clean' ? 'in_laundry' : 'clean';

      await db.runAsync(
        'UPDATE clothing_items SET laundry_status = ? WHERE id = ?',
        [newStatus, item.id],
      );

      setItem({ ...item, laundry_status: newStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to update laundry status');
    }
  };

  const startEdit = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValue(currentValue?.toString() || '');
  };

  const saveEdit = async () => {
    if (!editingField) return;

    try {
      const db = await DatabaseService.getDatabase();

      let updateQuery = '';
      let updateValue: any = editValue;

      // Handle different field types
      if (editingField === 'notes') {
        const aiAnalysis = item.ai_analysis ? JSON.parse(item.ai_analysis) : {};
        aiAnalysis.notes = editValue;
        updateQuery = 'UPDATE clothing_items SET ai_analysis = ? WHERE id = ?';
        updateValue = JSON.stringify(aiAnalysis);
      } else if (editingField === 'description') {
        const aiAnalysis = item.ai_analysis ? JSON.parse(item.ai_analysis) : {};
        aiAnalysis.description = editValue;
        updateQuery = 'UPDATE clothing_items SET ai_analysis = ? WHERE id = ?';
        updateValue = JSON.stringify(aiAnalysis);
      } else {
        // Direct field update
        updateQuery = `UPDATE clothing_items SET ${editingField} = ? WHERE id = ?`;
      }

      await db.runAsync(updateQuery, [updateValue, item.id]);

      // Reload item
      await loadItemDetails();
      setEditingField(null);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Item not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const aiAnalysis = item.ai_analysis ? JSON.parse(item.ai_analysis) : {};
  const capitalizedName = item.name
    .split(' ')
    .map(
      (word: string) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft
            size={IconSizes.lg}
            color={Colors.text.primary}
            strokeWidth={2}
          />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleToggleFavorite}
            style={styles.iconButton}
          >
            <Heart
              size={IconSizes.lg}
              color={
                item.is_favorite === 1 ? Colors.error : Colors.neutral[400]
              }
              fill={item.is_favorite === 1 ? Colors.error : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <Trash2 size={IconSizes.lg} color={Colors.error} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Section */}
        <View style={styles.imageSection}>
          <View style={styles.imageCard}>
            <Image
              source={{ uri: item.image_uri }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Item Name */}
        <View style={styles.nameSection}>
          <Text style={styles.itemName}>{capitalizedName}</Text>

          {/* Category Tag */}
          <View style={styles.categoryTag}>
            <Shirt size={16} color={Colors.primary[600]} strokeWidth={2} />
            <Text style={styles.categoryText}>
              {item.clothing_type || 'Other'}
            </Text>
          </View>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <TrendingUp size={16} color={Colors.success} strokeWidth={2} />
            <Text style={styles.statText}>Worn {item.wear_count || 0}x</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.statBadge,
              item.laundry_status !== 'clean' && styles.statBadgeActive,
            ]}
            onPress={handleToggleLaundry}
          >
            <Droplet
              size={16}
              color={
                item.laundry_status !== 'clean'
                  ? Colors.info
                  : Colors.neutral[500]
              }
              strokeWidth={2}
            />
            <Text
              style={[
                styles.statText,
                item.laundry_status !== 'clean' && { color: Colors.info },
              ]}
            >
              {item.laundry_status === 'clean' ? 'Clean' : 'In Laundry'}
            </Text>
          </TouchableOpacity>

          {item.created_at && (
            <View style={styles.statBadge}>
              <Calendar size={16} color={Colors.neutral[500]} strokeWidth={2} />
              <Text style={styles.statText}>
                {new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Description Card with Sticky Note Style */}
        <View style={styles.stickyNoteContainer}>
          <View style={styles.stickyNote}>
            <View style={styles.stickyNoteHeader}>
              <StickyNote size={20} color={Colors.warning} strokeWidth={2} />
              <Text style={styles.stickyNoteTitle}>Description</Text>
              <TouchableOpacity
                onPress={() => startEdit('description', aiAnalysis.description)}
                style={styles.editIconButton}
              >
                <Edit3 size={16} color={Colors.neutral[600]} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={styles.stickyNoteText}>
              {aiAnalysis.description ||
                'No description yet. Tap edit to add one.'}
            </Text>
          </View>
        </View>

        {/* Details Cards */}
        <View style={styles.detailsSection}>
          <DetailCard
            icon={Tag}
            label="Color"
            value={item.primary_color || 'Unknown'}
            onEdit={() => startEdit('primary_color', item.primary_color)}
          />

          <DetailCard
            icon={Package}
            label="Size"
            value={item.size || 'Not set'}
            onEdit={() => startEdit('size', item.size)}
          />

          {item.brand && (
            <DetailCard
              icon={Tag}
              label="Brand"
              value={item.brand}
              onEdit={() => startEdit('brand', item.brand)}
            />
          )}

          {item.fabric_type && (
            <DetailCard
              icon={Package}
              label="Material"
              value={item.fabric_type}
              onEdit={() => startEdit('fabric_type', item.fabric_type)}
            />
          )}

          {item.season_suitability && (
            <DetailCard
              icon={Calendar}
              label="Season"
              value={item.season_suitability}
              onEdit={() =>
                startEdit('season_suitability', item.season_suitability)
              }
            />
          )}
        </View>

        {/* Notes Section */}
        <View style={styles.notesContainer}>
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <StickyNote
                size={20}
                color={Colors.primary[500]}
                strokeWidth={2}
              />
              <Text style={styles.notesTitle}>Personal Notes</Text>
              <TouchableOpacity
                onPress={() => startEdit('notes', aiAnalysis.notes)}
                style={styles.editIconButton}
              >
                <Edit3 size={16} color={Colors.neutral[600]} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={styles.notesText}>
              {aiAnalysis.notes ||
                'Add personal notes about styling, occasions, or care instructions.'}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editingField !== null}
        transparent
        animationType="slide"
        onRequestClose={cancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Edit{' '}
                {editingField
                  ?.replace('_', ' ')
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
              <TouchableOpacity onPress={cancelEdit}>
                <X size={24} color={Colors.neutral[600]} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.modalInput,
                (editingField === 'notes' || editingField === 'description') &&
                  styles.modalInputMultiline,
              ]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${editingField?.replace('_', ' ')}`}
              placeholderTextColor={Colors.neutral[400]}
              multiline={
                editingField === 'notes' || editingField === 'description'
              }
              numberOfLines={
                editingField === 'notes' || editingField === 'description'
                  ? 4
                  : 1
              }
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={cancelEdit}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={saveEdit}
              >
                <Check size={20} color={Colors.text.inverse} strokeWidth={2} />
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const DetailCard = ({
  icon: Icon,
  label,
  value,
  onEdit,
}: {
  icon: any;
  label: string;
  value: string;
  onEdit: () => void;
}) => (
  <TouchableOpacity style={styles.detailCard} onPress={onEdit}>
    <View style={styles.detailCardLeft}>
      <View style={styles.detailIconContainer}>
        <Icon size={18} color={Colors.primary[600]} strokeWidth={2} />
      </View>
      <View style={styles.detailTextContainer}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
    <Edit3 size={16} color={Colors.neutral[400]} strokeWidth={2} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.primary,
    ...Shadows.sm,
  },

  backButton: {
    padding: Spacing.xs,
  },

  headerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

  iconButton: {
    padding: Spacing.xs,
  },

  content: {
    flex: 1,
  },

  // Image Section
  imageSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },

  imageCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
  },

  image: {
    width: 280,
    height: 280,
  },

  // Name Section
  nameSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    alignItems: 'center',
  },

  itemName: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },

  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },

  categoryText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary[700],
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },

  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },

  statBadgeActive: {
    backgroundColor: Colors.info + '15',
    borderWidth: 1,
    borderColor: Colors.info + '40',
  },

  statText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: Colors.neutral[600],
  },

  // Sticky Note Description
  stickyNoteContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },

  stickyNote: {
    backgroundColor: '#FFFACD',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },

  stickyNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },

  stickyNoteTitle: {
    flex: 1,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  editIconButton: {
    padding: Spacing.xs,
  },

  stickyNoteText: {
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.md,
  },

  // Details Section
  detailsSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },

  detailCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },

  detailCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },

  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailTextContainer: {
    flex: 1,
  },

  detailLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    marginBottom: 2,
  },

  detailValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  // Notes Section
  notesContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },

  notesCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },

  notesTitle: {
    flex: 1,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  notesText: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.md,
  },

  // Edit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingBottom: Spacing.xl,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },

  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  modalInput: {
    margin: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.md,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  modalInputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },

  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },

  modalCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },

  modalCancelText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
  },

  modalSaveButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },

  modalSaveText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.text.inverse,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: Typography.sizes.lg,
    color: Colors.text.secondary,
  },

  errorText: {
    fontSize: Typography.sizes.lg,
    color: Colors.error,
  },
});
