// app/(tabs)/wardrobe.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  Grid3X3,
  List,
  Plus,
  Filter,
  SlidersHorizontal,
  X,
  ChevronDown,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Modal from 'react-native-modal';
import {
  ClothingItem,
  WardrobeFilters,
  CLOTHING_CATEGORIES,
  COMMON_COLORS,
  FormalityLevel,
  Season,
} from '../../types/clothing';
import { AppState } from 'react-native';
import {
  getStoredWardrobeItems,
  deleteWardrobeItem,
} from '../../services/WardrobeStorage';
import DatabaseService from '../../services/DatabaseService';
// Import our design system
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Shadows,
  IconSizes,
} from '../../constants/Design';

import WardrobeItem from '../../components/WardrobeItem';

const { width } = Dimensions.get('window');

// View mode type
type ViewMode = 'grid' | 'list';

// Sort options
const SORT_OPTIONS = [
  { label: 'Recently Added', value: 'dateAdded' },
  { label: 'Name (A-Z)', value: 'name' },
  { label: 'Most Worn', value: 'timesWorn' },
  { label: 'Last Worn', value: 'lastWorn' },
  { label: 'Brand', value: 'brand' },
] as const;

export default function Wardrobe() {
  // State management
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filters, setFilters] = useState<WardrobeFilters>({});
  const [sortBy, setSortBy] = useState<
    'dateAdded' | 'name' | 'timesWorn' | 'lastWorn' | 'brand'
  >('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load wardrobe items on mount
  useEffect(() => {
    loadWardrobeItems();
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('🔄 App became active - reloading wardrobe');
        loadWardrobeItems();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  /**
   * Load wardrobe items from storage
   * Includes error handling and loading states
   */
  const loadWardrobeItems = async () => {
    try {
      setLoading(true);
      const wardrobeItems = await getStoredWardrobeItems({
        includeSQLite: true,
        includeAsyncStorage: false,
      });
      const typedItems: ClothingItem[] = wardrobeItems.map((item) => ({
        id: item.id || Date.now().toString(),
        name: item.name || 'Unnamed Item',
        category: item.category || 'Other',
        description: item.description || '',
        brand: item.brand,
        size: item.size || 'Unknown',
        color: item.colors[0] || 'Unknown',
        imageUri: item.image || '',
        originalImageUri: item.image,
        inLaundry: item.inLaundry || false,
        notes: item.notes || '',
        dateAdded: item.dateAdded || new Date().toISOString(),
        lastWorn: undefined,
        timesWorn: 0,
        tags: [],
        seasonality: ['summer'],
        formality: 'casual',
        material: undefined,
        price: undefined,
        purchaseDate: undefined,
        isFavorite: false,
      }));

      setItems(typedItems);
    } catch (error) {
      console.error('Failed to load wardrobe items:', error);
      Alert.alert(
        'Error Loading Wardrobe',
        'Failed to load your wardrobe items. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = () => {
    setRefreshing(true);
    loadWardrobeItems();
  };

  /**
   * Delete wardrobe item with confirmation
   */
  const handleDeleteItem = async (itemId: string, itemName: string) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to remove "${itemName}" from your wardrobe?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = DatabaseService.getDatabase();

              //  Step 1: Get the item to find image URI
              const item = (await db.getFirstAsync(
                'SELECT image_uri FROM clothing_items WHERE id = ?',
                [parseInt(itemId)],
              )) as any;

              //  Step 2: Delete image file from storage if it exists
              if (item?.image_uri) {
                const fileSystem = require('expo-file-system');
                await fileSystem.deleteAsync(item.image_uri, {
                  idempotent: true,
                });
              }

              //  Step 3: Delete from database
              await db.runAsync('DELETE FROM clothing_items WHERE id = ?', [
                parseInt(itemId),
              ]);

              //  Step 4: Refresh the UI
              console.log(`Item "${itemName}" deleted successfully`);
            } catch (error) {
              console.error('Delete failed:', error);
              Alert.alert('Error', 'Failed to delete item. Please try again.');
            }
          },
        },
      ],
    );
  };

  /**
   * Filter and sort items based on current filters
   */
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter((item) => {
      // Text search
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      // Category filter
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;

      // Advanced filters
      const matchesColor =
        !filters.color?.length || filters.color.includes(item.color);
      const matchesBrand =
        !filters.brand?.length || filters.brand.includes(item.brand || '');
      const matchesFormality =
        !filters.formality?.length ||
        filters.formality.includes(item.formality);
      const matchesLaundry =
        filters.inLaundry === undefined || item.inLaundry === filters.inLaundry;
      const matchesFavorite =
        filters.isFavorite === undefined ||
        item.isFavorite === filters.isFavorite;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesColor &&
        matchesBrand &&
        matchesFormality &&
        matchesLaundry &&
        matchesFavorite
      );
    });

    // Sort items
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'brand':
          comparison = (a.brand || '').localeCompare(b.brand || '');
          break;
        case 'timesWorn':
          comparison = a.timesWorn - b.timesWorn;
          break;
        case 'lastWorn':
          const aDate = a.lastWorn ? new Date(a.lastWorn).getTime() : 0;
          const bDate = b.lastWorn ? new Date(b.lastWorn).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'dateAdded':
        default:
          comparison =
            new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [items, searchQuery, selectedCategory, filters, sortBy, sortOrder]);

  /**
   * Calculate wardrobe statistics
   */
  const stats = useMemo(() => {
    const inLaundry = items.filter((item) => item.inLaundry).length;
    const withNotes = items.filter((item) => item.notes.length > 0).length;
    const favorites = items.filter((item) => item.isFavorite).length;

    return {
      total: items.length,
      inLaundry,
      withNotes,
      favorites,
    };
  }, [items]);

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setSelectedCategory('All');
    setFilters({});
    setSearchQuery('');
    setShowFilters(false);
  };

  /**
   * Render individual wardrobe item
   */
  const renderWardrobeItem = ({ item }: { item: ClothingItem }) => (
    <WardrobeItem
      item={item}
      viewMode={viewMode}
      onUpdate={loadWardrobeItems}
    />
  );

  /**
   * Get active filter count for display
   */
  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategory !== 'All') count++;
    if (filters.color?.length) count += filters.color.length;
    if (filters.brand?.length) count += filters.brand.length;
    if (filters.formality?.length) count += filters.formality.length;
    if (filters.inLaundry !== undefined) count++;
    if (filters.isFavorite !== undefined) count++;
    return count;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>My Wardrobe</Text>

          <View style={styles.headerActions}>
            {/* Filter Button */}
            <TouchableOpacity
              style={[
                styles.headerButton,
                getActiveFilterCount() > 0 && styles.headerButtonActive,
              ]}
              onPress={() => setShowFilters(true)}
            >
              <SlidersHorizontal
                size={IconSizes.md}
                color={
                  getActiveFilterCount() > 0
                    ? Colors.primary[500]
                    : Colors.neutral[600]
                }
              />
              {getActiveFilterCount() > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {getActiveFilterCount()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* View Mode Toggle */}
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? (
                <List size={IconSizes.md} color={Colors.neutral[600]} />
              ) : (
                <Grid3X3 size={IconSizes.md} color={Colors.neutral[600]} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={IconSizes.md} color={Colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, brand, or category..."
            placeholderTextColor={Colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={IconSizes.md} color={Colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 12 }}>Clear Old Data</Text>
      </TouchableOpacity>
      {/* Statistics Row */}
      <View style={styles.statsContainer}>
        <StatCard
          label="Total"
          value={stats.total}
          color={Colors.primary[500]}
        />
        <StatCard label="Laundry" value={stats.inLaundry} color={Colors.info} />
        <StatCard
          label="Favorites"
          value={stats.favorites}
          color={Colors.warning}
        />
        <StatCard
          label="Notes"
          value={stats.withNotes}
          color={Colors.success}
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScrollContainer}
        style={styles.categoryScroll}
      >
        {['All', ...CLOTHING_CATEGORIES].map((category) => (
          <CategoryChip
            key={category}
            category={category}
            isSelected={selectedCategory === category}
            onPress={() => setSelectedCategory(category)}
          />
        ))}
      </ScrollView>

      {/* Results Info */}
      <View style={styles.resultsInfo}>
        <Text style={styles.resultsText}>
          {filteredAndSortedItems.length} item
          {filteredAndSortedItems.length !== 1 ? 's' : ''}
          {selectedCategory !== 'All' && ` in ${selectedCategory}`}
        </Text>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => {
            // Toggle sort order or show sort menu
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
          }}
        >
          <Text style={styles.sortButtonText}>
            {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}
            {sortOrder === 'asc' ? ' ↑' : ' ↓'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : filteredAndSortedItems.length === 0 ? (
        <EmptyState
          category={selectedCategory}
          hasFilters={getActiveFilterCount() > 0}
          onAddItem={() => router.push('/(tabs)/camera')}
          onClearFilters={clearFilters}
        />
      ) : (
        <FlatList
          data={filteredAndSortedItems}
          renderItem={renderWardrobeItem}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={`${viewMode}-${selectedCategory}`}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary[500]}
            />
          }
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/camera')}
        activeOpacity={0.8}
      >
        <Plus size={IconSizes.lg} color={Colors.text.inverse} strokeWidth={2} />
      </TouchableOpacity>

      {/* Advanced Filters Modal */}
      <FilterModal
        visible={showFilters}
        filters={filters}
        onFiltersChange={setFilters}
        onClose={() => setShowFilters(false)}
        onClear={clearFilters}
      />
    </SafeAreaView>
  );
}

/**
 * Statistics Card Component
 */
const StatCard = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <View style={styles.statCard}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/**
 * Category Filter Chip Component
 */
const CategoryChip = ({
  category,
  isSelected,
  onPress,
}: {
  category: string;
  isSelected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
    onPress={onPress}
  >
    <Text
      style={[
        styles.categoryChipText,
        isSelected && styles.categoryChipTextSelected,
      ]}
    >
      {category}
    </Text>
  </TouchableOpacity>
);

/**
 * Loading State Component
 */
const LoadingState = () => (
  <View style={styles.centerContainer}>
    <Text style={styles.loadingText}>Loading your wardrobe...</Text>
  </View>
);

/**
 * Empty State Component
 */
const EmptyState = ({
  category,
  hasFilters,
  onAddItem,
  onClearFilters,
}: {
  category: string;
  hasFilters: boolean;
  onAddItem: () => void;
  onClearFilters: () => void;
}) => (
  <View style={styles.centerContainer}>
    <Text style={styles.emptyIcon}>{hasFilters ? '🔍' : ''}</Text>
    <Text style={styles.emptyTitle}>
      {hasFilters
        ? 'No items match your filters'
        : category === 'All'
          ? 'Your wardrobe is empty'
          : `No ${category.toLowerCase()} found`}
    </Text>
    <Text style={styles.emptySubtitle}>
      {hasFilters
        ? 'Try adjusting your search or filters'
        : 'Start building your digital wardrobe by adding your first item'}
    </Text>

    <View style={styles.emptyActions}>
      {hasFilters && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onClearFilters}
        >
          <Text style={styles.secondaryButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.primaryButton} onPress={onAddItem}>
        <Text style={styles.primaryButtonText}>
          {category === 'All'
            ? 'Add First Item'
            : `Add ${category.slice(0, -1)}`}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

/**
 * Advanced Filters Modal Component
 */
const FilterModal = ({
  visible,
  filters,
  onFiltersChange,
  onClose,
  onClear,
}: {
  visible: boolean;
  filters: WardrobeFilters;
  onFiltersChange: (filters: WardrobeFilters) => void;
  onClose: () => void;
  onClear: () => void;
}) => {
  const updateFilter = (key: keyof WardrobeFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      style={styles.modal}
      swipeDirection="down"
      onSwipeComplete={onClose}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filter Wardrobe</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={IconSizes.lg} color={Colors.neutral[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          {/* Color Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Colors</Text>
            <View style={styles.filterOptions}>
              {COMMON_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.filterOption,
                    filters.color?.includes(color) &&
                      styles.filterOptionSelected,
                  ]}
                  onPress={() => {
                    const currentColors = filters.color || [];
                    const newColors = currentColors.includes(color)
                      ? currentColors.filter((c) => c !== color)
                      : [...currentColors, color];
                    updateFilter(
                      'color',
                      newColors.length ? newColors : undefined,
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.color?.includes(color) &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    {color}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Formality Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Formality</Text>
            <View style={styles.filterOptions}>
              {(
                [
                  'casual',
                  'smart-casual',
                  'semi-formal',
                  'formal',
                ] as FormalityLevel[]
              ).map((formality) => (
                <TouchableOpacity
                  key={formality}
                  style={[
                    styles.filterOption,
                    filters.formality?.includes(formality) &&
                      styles.filterOptionSelected,
                  ]}
                  onPress={() => {
                    const current = filters.formality || [];
                    const updated = current.includes(formality)
                      ? current.filter((f) => f !== formality)
                      : [...current, formality];
                    updateFilter(
                      'formality',
                      updated.length ? updated : undefined,
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.formality?.includes(formality) &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    {formality.charAt(0).toUpperCase() + formality.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status Filters */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Status</Text>
            <View style={styles.statusFilters}>
              <TouchableOpacity
                style={[
                  styles.statusFilter,
                  filters.inLaundry === true && styles.statusFilterSelected,
                ]}
                onPress={() =>
                  updateFilter(
                    'inLaundry',
                    filters.inLaundry === true ? undefined : true,
                  )
                }
              >
                <Text
                  style={[
                    styles.statusFilterText,
                    filters.inLaundry === true &&
                      styles.statusFilterTextSelected,
                  ]}
                >
                  In Laundry
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusFilter,
                  filters.isFavorite === true && styles.statusFilterSelected,
                ]}
                onPress={() =>
                  updateFilter(
                    'isFavorite',
                    filters.isFavorite === true ? undefined : true,
                  )
                }
              >
                <Text
                  style={[
                    styles.statusFilterText,
                    filters.isFavorite === true &&
                      styles.statusFilterTextSelected,
                  ]}
                >
                  Favorites
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.clearButton} onPress={onClear}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={onClose}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },

  // Header styles
  header: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    ...Shadows.sm,
  },

  headerTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.md,
  },

  title: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },

  headerActions: {
    flexDirection: 'row' as const,
    gap: Spacing.sm,
  },

  headerButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.sm,
    position: 'relative' as const,
  },

  headerButtonActive: {
    backgroundColor: Colors.primary[50],
  },

  filterBadge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.full,
    width: 18,
    height: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  filterBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.text.inverse,
  },

  // Search styles
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
  },

  // Stats styles
  statsContainer: {
    flexDirection: 'row' as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },

  statCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
    ...Shadows.sm,
  },

  statValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },

  statLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
  },

  // Category styles
  categoryScroll: {
    maxHeight: 60,
    marginBottom: Spacing.md,
  },

  categoryScrollContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
    alignItems: 'center' as const,
  },

  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.light,
    height: 36,
    justifyContent: 'center' as const,
  },

  categoryChipSelected: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },

  categoryChipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
  },

  categoryChipTextSelected: {
    color: Colors.text.inverse,
  },

  // Results info
  resultsInfo: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },

  resultsText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  sortButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },

  sortButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary[500],
    fontWeight: Typography.weights.medium,
  },

  // List styles
  listContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },

  gridRow: {
    justifyContent: 'space-between' as const,
  },

  // Center container for loading/empty states
  centerContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.xl,
  },

  // Loading state
  loadingText: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
  },

  // Empty state
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },

  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    textAlign: 'center' as const,
    marginBottom: Spacing.xs,
  },

  emptySubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: Spacing.xl,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.md,
  },

  emptyActions: {
    flexDirection: 'row' as const,
    gap: Spacing.md,
  },

  primaryButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },

  primaryButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },

  secondaryButton: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },

  secondaryButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
  },

  // FAB
  fab: {
    position: 'absolute' as const,
    bottom: 20,
    right: 20,
    backgroundColor: Colors.primary[500],
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...Shadows.lg,
  },

  // Modal styles
  modal: {
    justifyContent: 'flex-end' as const,
    margin: 0,
  },

  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: 80,
  },

  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },

  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  modalBody: {
    flex: 1,
    padding: Spacing.lg,
  },

  filterSection: {
    marginBottom: Spacing.xl,
  },

  filterSectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },

  filterOptions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Spacing.sm,
  },

  filterOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  filterOptionSelected: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary[500],
  },

  filterOptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  filterOptionTextSelected: {
    color: Colors.primary[500],
    fontWeight: Typography.weights.medium,
  },

  statusFilters: {
    flexDirection: 'row' as const,
    gap: Spacing.md,
  },

  statusFilter: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  statusFilterSelected: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary[500],
  },

  statusFilterText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  statusFilterTextSelected: {
    color: Colors.primary[500],
    fontWeight: Typography.weights.medium,
  },

  modalFooter: {
    flexDirection: 'row' as const,
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },

  clearButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
  },

  clearButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
  },

  applyButton: {
    flex: 2,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
  },

  applyButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
};
