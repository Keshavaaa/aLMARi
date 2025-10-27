// app/(tabs)/profile.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Modal from 'react-native-modal';

// Icons
import {
  User,
  Heart,
  TrendingUp,
  Camera,
  Edit,
  Palette,
  Target,
  BarChart3,
  Share2,
  Info,
  X,
  Check,
  Sparkles,
  Calendar,
  ShoppingBag,
  Award,
  Mail,
  Globe,
  ChevronRight,
} from 'lucide-react-native';

// Types and Services
import {
  UserPreferences,
  WardrobeStats,
  ClothingItem,
  COMMON_COLORS,
  BodyType,
} from '../../types/clothing';

import { getWardrobeItems } from '../../services/WardrobeService';

// Design System
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Shadows,
  IconSizes,
} from '../../constants/Design';

/**
 * Mock user data
 */
const MOCK_USER = {
  name: 'User',
  email: 'user@example.com',
  joinDate: '2025-09-15',
  avatar: null,
};

/**
 * Modal state type
 */
type SettingsModal = 'preferences' | 'about' | null;

/**
 * ProfileScreen Component
 * Displays wardrobe statistics, preferences, and app info
 */
export default function ProfileScreen() {
  // ============ STATE MANAGEMENT ============

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wardrobeStats, setWardrobeStats] = useState<WardrobeStats | null>(
    null,
  );
  const [showModal, setShowModal] = useState<SettingsModal>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    favoriteColors: [],
    preferredBrands: [],
    avoidedMaterials: [],
    stylePreference: 'classic',
    formalityPreference: ['casual'],
    seasonalPreferences: {
      spring: [],
      summer: [],
      fall: [],
      winter: [],
      'all-season': [],
    },
    bodyType: undefined,
    skinTone: undefined,
    preferredFit: 'fitted',
  });

  // ============ EFFECTS ============

  useEffect(() => {
    loadProfileData();
  }, []);

  // ============ DATA LOADING ============

  /**
   * Load user profile data and wardrobe statistics
   */
  const loadProfileData = async () => {
    setLoading(true);

    try {
      const wardrobeItems = await getWardrobeItems();
      const stats = calculateWardrobeStats(wardrobeItems);
      setWardrobeStats(stats);
    } catch (error) {
      console.error('❌ Failed to load profile data:', error);
      Alert.alert(
        'Error Loading Profile',
        'Could not load your profile data. Please try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Calculate wardrobe statistics
   */
  const calculateWardrobeStats = (items: ClothingItem[]): WardrobeStats => {
    const totalItems = items.length;
    const itemsInLaundry = items.filter((item) => item.inLaundry).length;
    const favoriteItems = items.filter((item) => item.isFavorite).length;

    const itemsByCategory = items.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const sortedByWear = [...items].sort((a, b) => b.timesWorn - a.timesWorn);
    const mostWornItems = sortedByWear.slice(0, 5);
    const leastWornItems = sortedByWear.slice(-5).reverse();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentlyAdded = items.filter(
      (item) => new Date(item.dateAdded) > thirtyDaysAgo,
    );

    const costPerWear = items.reduce(
      (acc, item) => {
        if (item.price && item.timesWorn > 0) {
          acc[item.id] = item.price / item.timesWorn;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalItems,
      itemsByCategory,
      itemsInLaundry,
      favoriteItems,
      mostWornItems,
      leastWornItems,
      recentlyAdded,
      costPerWear,
    };
  };

  // ============ USER ACTIONS ============

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const savePreferences = async (newPreferences: UserPreferences) => {
    try {
      setUserPreferences(newPreferences);

      Alert.alert(
        'Preferences Saved',
        'Your style preferences have been updated!',
      );
    } catch (error) {
      console.error('❌ Failed to save preferences:', error);
      Alert.alert(
        'Save Failed',
        'Could not save preferences. Please try again.',
      );
    }
  };

  /**
   * Open email app for support
   */
  const handleContactSupport = () => {
    Linking.openURL('mailto:support@almari.app?subject=aLMARi Support Request');
  };

  // ============ RENDER ============

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary[500]}
          />
        }
      >
        {/* Profile Header */}
        <ProfileHeader user={MOCK_USER} />

        {/* Wardrobe Statistics */}
        {wardrobeStats && <WardrobeStatsSection stats={wardrobeStats} />}

        {/* Insights */}
        <InsightsSection stats={wardrobeStats} />

        {/* Quick Actions */}
        <QuickActionsSection />

        {/* Settings */}
        <SettingsSection onOpenModal={setShowModal} />

        {/* Support */}
        <SupportSection onContactSupport={handleContactSupport} />

        {/* App Info */}
        <AppInfoSection onOpenAbout={() => setShowModal('about')} />
      </ScrollView>

      {/* ============ MODALS ============ */}

      <StylePreferencesModal
        visible={showModal === 'preferences'}
        preferences={userPreferences}
        onClose={() => setShowModal(null)}
        onSave={savePreferences}
      />

      <AboutModal
        visible={showModal === 'about'}
        onClose={() => setShowModal(null)}
      />
    </SafeAreaView>
  );
}
/**
 * ProfileHeader Component
 */
const ProfileHeader = ({ user }: { user: typeof MOCK_USER }) => (
  <View style={styles.profileHeader}>
    {/* Avatar */}
    <View style={styles.avatarContainer}>
      <User size={48} color={Colors.primary[600]} strokeWidth={1.5} />
    </View>

    {/* User Info */}
    <Text style={styles.userName}>{user.name}</Text>
    <Text style={styles.userEmail}>{user.email}</Text>

    {/* Join Date */}
    <View style={styles.joinDateBadge}>
      <Calendar size={14} color={Colors.text.secondary} />
      <Text style={styles.joinDateText}>
        Member since{' '}
        {new Date(user.joinDate).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        })}
      </Text>
    </View>
  </View>
);

/**
 * WardrobeStatsSection Component
 */
const WardrobeStatsSection = ({ stats }: { stats: WardrobeStats }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Wardrobe Overview</Text>
      <TouchableOpacity onPress={() => router.push('/(tabs)/wardrobe')}>
        <Text style={styles.sectionLink}>View All</Text>
      </TouchableOpacity>
    </View>

    {/* Stats Grid */}
    <View style={styles.statsGrid}>
      <StatCard
        icon={ShoppingBag}
        label="Total Items"
        value={stats.totalItems}
        color={Colors.primary[500]}
      />
      <StatCard
        icon={Heart}
        label="Favorites"
        value={stats.favoriteItems}
        color={Colors.error}
      />
      <StatCard
        icon={Sparkles}
        label="Recently Added"
        value={stats.recentlyAdded.length}
        color={Colors.success}
      />
      <StatCard
        icon={Target}
        label="In Laundry"
        value={stats.itemsInLaundry}
        color={Colors.info}
      />
    </View>

    {/* Top Categories */}
    <View style={styles.categoriesCard}>
      <View style={styles.categoriesHeader}>
        <BarChart3 size={20} color={Colors.primary[600]} />
        <Text style={styles.categoriesTitle}>Top Categories</Text>
      </View>

      {Object.entries(stats.itemsByCategory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([category, count], index) => {
          const percentage = Math.round((count / stats.totalItems) * 100);
          return (
            <View key={category} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryRank}>#{index + 1}</Text>
                <Text style={styles.categoryName}>{category}</Text>
              </View>
              <View style={styles.categoryMetrics}>
                <Text style={styles.categoryCount}>{count} items</Text>
                <Text style={styles.categoryPercentage}>({percentage}%)</Text>
              </View>
            </View>
          );
        })}
    </View>
  </View>
);

/**
 * InsightsSection Component
 */
const InsightsSection = ({ stats }: { stats: WardrobeStats | null }) => {
  if (!stats) return null;

  const leastWornCount = stats.leastWornItems.filter(
    (item) => item.timesWorn === 0,
  ).length;
  const hasLeastWorn = leastWornCount > 0;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Sparkles size={20} color={Colors.primary[600]} />
          <Text style={styles.sectionTitle}>Insights</Text>
        </View>
      </View>

      <View style={styles.insightCards}>
        {/* Most Worn */}
        {stats.mostWornItems[0] && (
          <View style={styles.insightCard}>
            <View style={styles.insightIcon}>
              <TrendingUp size={20} color={Colors.success} strokeWidth={2} />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Most Loved Item</Text>
              <Text style={styles.insightText}>
                Your{' '}
                <Text style={styles.insightHighlight}>
                  {stats.mostWornItems[0].name}
                </Text>{' '}
                has been worn{' '}
                <Text style={styles.insightHighlight}>
                  {stats.mostWornItems[0].timesWorn} times
                </Text>
              </Text>
            </View>
          </View>
        )}

        {/* Underutilized */}
        {hasLeastWorn && (
          <View style={styles.insightCard}>
            <View
              style={[
                styles.insightIcon,
                { backgroundColor: Colors.warning + '15' },
              ]}
            >
              <Info size={20} color={Colors.warning} strokeWidth={2} />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Underutilized Items</Text>
              <Text style={styles.insightText}>
                You have{' '}
                <Text style={styles.insightHighlight}>
                  {leastWornCount} items
                </Text>{' '}
                that haven't been worn yet
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

/**
 * QuickActionsSection Component
 */
const QuickActionsSection = () => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Quick Actions</Text>

    <View style={styles.actionCards}>
      <ActionCard
        icon={Camera}
        title="Add New Item"
        description="Capture and catalog clothing"
        onPress={() => router.push('/(tabs)/camera')}
        color={Colors.primary[500]}
      />
      <ActionCard
        icon={Sparkles}
        title="Get Outfit Ideas"
        description="AI-powered recommendations"
        onPress={() => router.push('/(tabs)/outfit')}
        color={Colors.success}
      />
      <ActionCard
        icon={Calendar}
        title="Plan Outfits"
        description="Schedule weekly outfits"
        onPress={() => router.push('/calendar-screen')}
        color={Colors.info}
      />
      <ActionCard
        icon={Heart}
        title="View Favorites"
        description="Your loved items"
        onPress={() => router.push('/(tabs)/wardrobe')}
        color={Colors.error}
      />
    </View>
  </View>
);

/**
 * SettingsSection Component
 */
const SettingsSection = ({
  onOpenModal,
}: {
  onOpenModal: (modal: SettingsModal) => void;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Preferences</Text>

    <View style={styles.settingsGroup}>
      <SettingsItem
        icon={Palette}
        title="Style Preferences"
        subtitle="Favorite colors, style, and body type"
        onPress={() => onOpenModal('preferences')}
        showChevron
      />
    </View>
  </View>
);

/**
 * SupportSection Component
 */
const SupportSection = ({
  onContactSupport,
}: {
  onContactSupport: () => void;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Support</Text>

    <View style={styles.settingsGroup}>
      <SettingsItem
        icon={Mail}
        title="Contact Support"
        subtitle="Get help via email"
        onPress={onContactSupport}
        showChevron
      />
    </View>
  </View>
);

/**
 * AppInfoSection Component
 */
const AppInfoSection = ({ onOpenAbout }: { onOpenAbout: () => void }) => (
  <View style={styles.appInfo}>
    <TouchableOpacity onPress={onOpenAbout} style={styles.appInfoButton}>
      <Text style={styles.appName}>aLMARi</Text>
      <Text style={styles.appVersion}>Version 1.0.0</Text>
      <Text style={styles.appTagline}>Your AI-Powered Digital Wardrobe</Text>
    </TouchableOpacity>
  </View>
);

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
      <Icon size={24} color={color} strokeWidth={2} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ActionCard = ({
  icon: Icon,
  title,
  description,
  onPress,
  color,
}: {
  icon: any;
  title: string;
  description: string;
  onPress: () => void;
  color: string;
}) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress}>
    <View style={[styles.actionCardIcon, { backgroundColor: color + '15' }]}>
      <Icon size={28} color={color} strokeWidth={2} />
    </View>
    <Text style={styles.actionCardTitle}>{title}</Text>
    <Text style={styles.actionCardDescription}>{description}</Text>
  </TouchableOpacity>
);

const SettingsItem = ({
  icon: Icon,
  title,
  subtitle,
  onPress,
  showChevron = false,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
}) => (
  <TouchableOpacity
    style={styles.settingsItem}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={0.7}
  >
    <View style={styles.settingsItemLeft}>
      <View style={styles.settingsIconContainer}>
        <Icon size={20} color={Colors.primary[600]} strokeWidth={2} />
      </View>
      <View style={styles.settingsItemContent}>
        <Text style={styles.settingsItemTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>
        )}
      </View>
    </View>

    {showChevron && (
      <ChevronRight size={20} color={Colors.neutral[400]} strokeWidth={2} />
    )}
  </TouchableOpacity>
);

// ============================================================================
// MODALS
// ============================================================================

/**
 * StylePreferencesModal
 */
const StylePreferencesModal = ({
  visible,
  preferences,
  onClose,
  onSave,
}: {
  visible: boolean;
  preferences: UserPreferences;
  onClose: () => void;
  onSave: (preferences: UserPreferences) => void;
}) => {
  const defaultPrefs: UserPreferences = {
    favoriteColors: [],
    preferredBrands: [],
    avoidedMaterials: [],
    stylePreference: 'classic',
    formalityPreference: ['casual'],
    seasonalPreferences: {
      spring: [],
      summer: [],
      fall: [],
      winter: [],
      'all-season': [],
    },
    bodyType: undefined,
    skinTone: undefined,
    preferredFit: 'fitted',
  };

  const [tempPreferences, setTempPreferences] = useState(
    preferences || defaultPrefs,
  );

  useEffect(() => {
    if (visible) {
      setTempPreferences(preferences || defaultPrefs);
    }
  }, [visible, preferences]);

  const handleSave = () => {
    onSave(tempPreferences);
    onClose();
  };

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => {
    setTempPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const toggleColor = (color: string) => {
    const currentColors = tempPreferences.favoriteColors;
    const newColors = currentColors.includes(color)
      ? currentColors.filter((c) => c !== color)
      : [...currentColors, color];
    updatePreference('favoriteColors', newColors);
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      style={styles.modal}
      swipeDirection="down"
      onSwipeComplete={onClose}
      avoidKeyboard
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <Palette size={24} color={Colors.primary[600]} />
            <Text style={styles.modalTitle}>Style Preferences</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={Colors.neutral[600]} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalBody}
          showsVerticalScrollIndicator={false}
        >
          {/* Favorite Colors */}
          <View style={styles.preferenceSection}>
            <Text style={styles.preferenceSectionTitle}>Favorite Colors</Text>
            <Text style={styles.preferenceSectionSubtitle}>
              Select colors you love to wear
            </Text>
            <View style={styles.colorGrid}>
              {COMMON_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    tempPreferences.favoriteColors.includes(color) &&
                      styles.colorOptionSelected,
                  ]}
                  onPress={() => toggleColor(color)}
                >
                  <Text
                    style={[
                      styles.colorOptionText,
                      tempPreferences.favoriteColors.includes(color) &&
                        styles.colorOptionTextSelected,
                    ]}
                  >
                    {color}
                  </Text>
                  {tempPreferences.favoriteColors.includes(color) && (
                    <Check
                      size={14}
                      color={Colors.primary[500]}
                      strokeWidth={3}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Style Preference */}
          <View style={styles.preferenceSection}>
            <Text style={styles.preferenceSectionTitle}>Style Preference</Text>
            <Text style={styles.preferenceSectionSubtitle}>
              Choose your dominant style aesthetic
            </Text>
            <View style={styles.styleOptions}>
              {(
                [
                  'minimalist',
                  'trendy',
                  'classic',
                  'eclectic',
                  'bohemian',
                  'sporty',
                ] as const
              ).map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.styleOption,
                    tempPreferences.stylePreference === style &&
                      styles.styleOptionSelected,
                  ]}
                  onPress={() => updatePreference('stylePreference', style)}
                >
                  <Text
                    style={[
                      styles.styleOptionText,
                      tempPreferences.stylePreference === style &&
                        styles.styleOptionTextSelected,
                    ]}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Body Type */}
          <View style={styles.preferenceSection}>
            <Text style={styles.preferenceSectionTitle}>Body Type</Text>
            <Text style={styles.preferenceSectionSubtitle}>
              Optional: helps with fit recommendations
            </Text>
            <View style={styles.bodyTypeOptions}>
              {(
                [
                  'apple',
                  'pear',
                  'hourglass',
                  'rectangle',
                  'inverted-triangle',
                ] as BodyType[]
              ).map((bodyType) => (
                <TouchableOpacity
                  key={bodyType}
                  style={[
                    styles.bodyTypeOption,
                    tempPreferences.bodyType === bodyType &&
                      styles.bodyTypeOptionSelected,
                  ]}
                  onPress={() => updatePreference('bodyType', bodyType)}
                >
                  <Text
                    style={[
                      styles.bodyTypeOptionText,
                      tempPreferences.bodyType === bodyType &&
                        styles.bodyTypeOptionTextSelected,
                    ]}
                  >
                    {bodyType
                      .replace('-', ' ')
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
            <Text style={styles.modalCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalSaveButton} onPress={handleSave}>
            <Check size={18} color={Colors.text.inverse} strokeWidth={2} />
            <Text style={styles.modalSaveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/**
 * AboutModal
 */
const AboutModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => (
  <Modal
    isVisible={visible}
    onBackdropPress={onClose}
    style={styles.modal}
    swipeDirection="down"
    onSwipeComplete={onClose}
  >
    <View style={styles.smallModalContent}>
      <View style={styles.modalHeader}>
        <View style={styles.modalHeaderLeft}>
          <Info size={24} color={Colors.primary[600]} />
          <Text style={styles.modalTitle}>About aLMARi</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <X size={24} color={Colors.neutral[600]} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.modalBody}>
        <View style={styles.aboutSection}>
          <Text style={styles.aboutAppName}>aLMARi</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          <Text style={styles.aboutTagline}>
            Your AI-Powered Digital Wardrobe
          </Text>
        </View>

        <Text style={styles.aboutDescription}>
          aLMARi helps you organize your wardrobe, get AI-powered outfit
          recommendations based on weather, and discover your personal style.
        </Text>

        <Text style={styles.aboutCopyright}>
          © 2024 aLMARi. All rights reserved.{'\n'}
          Made with ❤️ in India
        </Text>
      </View>
    </View>
  </Modal>
);

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },

  scrollContent: {
    paddingBottom: Spacing.xxl,
  },

  // Profile Header
  profileHeader: {
    backgroundColor: Colors.background.primary,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },

  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },

  userName: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: 4,
  },

  userEmail: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },

  joinDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },

  joinDateText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
  },

  // Sections
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },

  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },

  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },

  sectionLink: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary[600],
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },

  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },

  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },

  statValue: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },

  statLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
  },

  // Categories Card
  categoriesCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },

  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },

  categoriesTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },

  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  categoryRank: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.primary[500],
    width: 28,
  },

  categoryName: {
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
    fontWeight: Typography.weights.medium,
  },

  categoryMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },

  categoryCount: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
  },

  categoryPercentage: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
  },

  // Insights
  insightCards: {
    gap: Spacing.sm,
  },

  insightCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.sm,
  },

  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  insightContent: {
    flex: 1,
  },

  insightTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: 4,
  },

  insightText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.sm,
  },

  insightHighlight: {
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  // Action Cards
  actionCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  actionCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },

  actionCardIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },

  actionCardTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },

  actionCardDescription: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    textAlign: 'center',
  },

  // Settings
  settingsGroup: {
    gap: Spacing.xs,
  },

  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.sm,
  },

  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },

  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingsItemContent: {
    flex: 1,
  },

  settingsItemTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: 2,
  },

  settingsItemSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  // App Info
  appInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    marginTop: Spacing.lg,
  },

  appInfoButton: {
    alignItems: 'center',
  },

  appName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: 4,
  },

  appVersion: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },

  appTagline: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.tertiary,
  },

  // Modals
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },

  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '85%',
  },

  smallModalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },

  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },

  modalBody: {
    padding: Spacing.lg,
  },

  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },

  modalCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },

  modalCancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
  },

  modalSaveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.md,
  },

  modalSaveButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.text.inverse,
  },

  // Preference Sections
  preferenceSection: {
    marginBottom: Spacing.xl,
  },

  preferenceSectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: 4,
  },

  preferenceSectionSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },

  // Color Options
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },

  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },

  colorOptionSelected: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary[500],
  },

  colorOptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
  },

  colorOptionTextSelected: {
    color: Colors.primary[700],
    fontWeight: Typography.weights.semibold,
  },

  // Style Options
  styleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  styleOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },

  styleOptionSelected: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary[500],
  },

  styleOptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
  },

  styleOptionTextSelected: {
    color: Colors.primary[700],
    fontWeight: Typography.weights.semibold,
  },

  // Body Type Options
  bodyTypeOptions: {
    gap: Spacing.sm,
  },

  bodyTypeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },

  bodyTypeOptionSelected: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary[500],
  },

  bodyTypeOptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
  },

  bodyTypeOptionTextSelected: {
    color: Colors.primary[700],
    fontWeight: Typography.weights.semibold,
  },

  // About Modal
  aboutSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    marginBottom: Spacing.lg,
  },

  aboutAppName: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary[600],
    marginBottom: 4,
  },

  aboutVersion: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },

  aboutTagline: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.tertiary,
  },

  aboutDescription: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },

  aboutCopyright: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.xs,
  },
});
