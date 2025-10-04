// components/WardrobeItem.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  StickyNote,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react-native';
import Modal from 'react-native-modal';
import { TextInput } from 'react-native';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  IconSizes,
} from '../constants/Design';

interface WardrobeItemProps {
  item: {
    id: string;
    name: string;
    category: string;
    imageUri: string;
    inLaundry: boolean;
    notes: string;
    color: string;
    brand?: string;
    size: string;
  };
  viewMode: 'grid' | 'list';
  onUpdate: () => void;
}

export default function WardrobeItem({
  item,
  viewMode,
  onUpdate,
}: WardrobeItemProps) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [note, setNote] = useState(item.notes || '');

  /**
   * Toggle laundry status for the clothing item
   * In a real app, this would update your local storage or backend
   */
  const toggleLaundry = () => {
    console.log(`Toggle laundry for item ${item.id}`);
    // TODO: Implement actual laundry status update
    onUpdate();
  };

  /**
   * Handle item deletion with confirmation dialog
   */
  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to remove "${item.name}" from your wardrobe?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log(`Delete item ${item.id}`);
            // TODO: Implement actual item deletion
            onUpdate();
          },
        },
      ],
    );
  };

  /**
   * Save note to the clothing item
   */
  const saveNote = () => {
    console.log(`Save note for item ${item.id}: ${note}`);
    // TODO: Implement actual note saving to storage
    setShowNoteModal(false);
    onUpdate();
  };

  // Dynamic styles based on view mode
  const cardStyle = viewMode === 'grid' ? styles.gridCard : styles.listCard;
  const imageStyle = viewMode === 'grid' ? styles.gridImage : styles.listImage;
  const contentStyle =
    viewMode === 'grid' ? styles.gridContent : styles.listContent;

  return (
    <>
      <TouchableOpacity style={cardStyle} activeOpacity={0.7}>
        {/* Item Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.imageUri }}
            style={imageStyle}
          />

          {/* Laundry Badge - Only show when item is in laundry */}
          {item.inLaundry && (
            <View style={styles.laundryBadge}>
              <Text style={styles.laundryText}>In Laundry</Text>
            </View>
          )}
        </View>

        {/* Item Information */}
        <View style={contentStyle}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>

            <Text style={styles.itemCategory}>{item.category}</Text>

            {/* Additional details for list view */}
            {viewMode === 'list' && (
              <View style={styles.itemDetails}>
                <Text style={styles.itemDetail}>
                  {item.brand} • {item.size}
                </Text>
                <Text
                  style={[
                    styles.itemDetail,
                    { color: item.color.toLowerCase() },
                  ]}
                >
                  {item.color}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.itemActions}>
            {/* Notes Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                item.notes ? styles.actionButtonActive : null,
              ]}
              onPress={() => setShowNoteModal(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} // Better touch area
            >
              <StickyNote
                size={IconSizes.sm}
                color={item.notes ? Colors.warning : Colors.neutral[400]}
                strokeWidth={2}
              />
            </TouchableOpacity>

            {/* Laundry Toggle Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                item.inLaundry ? styles.actionButtonActive : null,
              ]}
              onPress={toggleLaundry}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {item.inLaundry ? (
                <ToggleRight
                  size={IconSizes.sm}
                  color={Colors.info}
                  strokeWidth={2}
                />
              ) : (
                <ToggleLeft
                  size={IconSizes.sm}
                  color={Colors.neutral[400]}
                  strokeWidth={2}
                />
              )}
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2
                size={IconSizes.sm}
                color={Colors.error}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Notes Modal */}
      <Modal
        isVisible={showNoteModal}
        onBackdropPress={() => setShowNoteModal(false)}
        onSwipeComplete={() => setShowNoteModal(false)}
        swipeDirection="down"
        style={styles.modal}
        backdropOpacity={0.5}
        animationIn="slideInUp"
        animationOut="slideOutDown"
      >
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Note</Text>
            <Text style={styles.modalSubtitle}>for {item.name}</Text>
          </View>

          {/* Note Input */}
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add styling tips, care instructions, or personal notes..."
            placeholderTextColor={Colors.neutral[400]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={200} // Reasonable character limit
          />

          {/* Character Counter */}
          <Text style={styles.characterCounter}>{note.length}/200</Text>

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowNoteModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={saveNote}>
              <Text style={styles.saveButtonText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Grid View Card
  gridCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    margin: Spacing.xs,
    flex: 1,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  // List View Card
  listCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  // Image Container
  imageContainer: {
    position: 'relative',
  },

  // Grid Image
  gridImage: {
    width: '100%',
    height: 120,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.neutral[100],
    resizeMode: 'cover',
  },

  // List Image
  listImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.neutral[100],
    marginRight: Spacing.md,
    resizeMode: 'cover',
  },

  // Content Areas
  gridContent: {
    marginTop: Spacing.sm,
  },

  listContent: {
    flex: 1,
  },

  // Item Information
  itemInfo: {
    flex: 1,
  },

  itemName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: 2,
  },

  itemCategory: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary[600],
    fontWeight: Typography.weights.medium,
    textTransform: 'capitalize',
  },

  itemDetails: {
    marginTop: Spacing.xs,
  },

  itemDetail: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    marginBottom: 2,
    fontWeight: Typography.weights.normal,
  },

  // Action Buttons
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },

  actionButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.neutral[50],
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionButtonActive: {
    backgroundColor: Colors.primary[50],
  },

  // Laundry Badge
  laundryBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: Colors.info,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    ...Shadows.sm,
  },

  laundryText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.inverse,
    fontWeight: Typography.weights.semibold,
  },

  // Modal Styles
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },

  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '80%',
  },

  modalHeader: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },

  modalSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginTop: 4,
  },

  noteInput: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
    textAlignVertical: 'top',
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  characterCounter: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
  },

  saveButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
  },

  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
  },

  saveButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
});
