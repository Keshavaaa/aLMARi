// app/(tabs)/profile.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Modal from 'react-native-modal';

// Icons
import {
  User,
  Settings,
  Heart,
  TrendingUp,
  Camera,
  Edit,
  Bell,
  Palette,
  Target,
  BarChart3,
  Share2,
  HelpCircle,
  Shield,
  Smartphone,
  Moon,
  Sun,
  Globe,
  ChevronRight,
  X,
  Check,
} from 'lucide-react-native';

// Types and Services
import {
  UserPreferences,
  WardrobeStats,
  ClothingItem,
  FormalityLevel,
  Season,
  COMMON_COLORS,
  COMMON_BRANDS,
  BodyType,
  SkinTone,
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

// Mock user data (replace with real user management later)
const MOCK_USER = {
  name: 'Fashion Enthusiast',
  email: 'user@almari.app',
  joinDate: '2024-01-15',
  avatar: null,
  bio: 'Building my perfect wardrobe with AI',
};

const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteColors: ['Blue', 'White', 'Black'],
  preferredBrands: ['Uniqlo', 'Zara'],
  avoidedMaterials: ['Wool'],
  stylePreference: 'minimalist',
  formalityPreference: ['casual', 'smart-casual'],
  seasonalPreferences: {
    Summer: ['Tops', 'Shorts', 'Dresses'],
    Winter: ['Outerwear', 'Sweaters'],
    Spring: ['Light Jackets', 'Jeans'],
    Fall: ['Cardigans', 'Boots'],
  },
  bodyType: 'rectangle',
  skinTone: 'neutral',
  preferredFit: 'fitted',
};

type SettingsModal = 'preferences' | 'notifications' | 'display' | null;

export default function ProfileScreen() {
  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userPreferences, setUserPreferences] =
    useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [wardrobeStats, setWardrobeStats] = useState<WardrobeStats | null>(
    null,
  );
  const [showModal, setShowModal] = useState<SettingsModal>(null);

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  /**
   * Load user profile data and wardrobe statistics
   */
  const loadProfileData = async () => {
    setLoading(true);

    try {
      // Load wardrobe items and calculate stats
      const wardrobeItems = await getWardrobeItems();
      const stats = calculateWardrobeStats(wardrobeItems);
      setWardrobeStats(stats);

      // Load user preferences from storage
      // TODO: Implement actual user preferences loading
      setUserPreferences(DEFAULT_PREFERENCES);
    } catch (error) {
      console.error('Failed to load profile data:', error);
      Alert.alert('Error', 'Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Calculate comprehensive wardrobe statistics
   */
  const calculateWardrobeStats = (items: ClothingItem[]): WardrobeStats => {
    const totalItems = items.length;
    const itemsInLaundry = items.filter((item) => item.inLaundry).length;
    const favoriteItems = items.filter((item) => item.isFavorite).length;

    // Calculate items by category
    const itemsByCategory = items.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Find most and least worn items
    const sortedByWear = [...items].sort((a, b) => b.timesWorn - a.timesWorn);
    const mostWornItems = sortedByWear.slice(0, 5);
    const leastWornItems = sortedByWear.slice(-5).reverse();

    // Recently added items (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentlyAdded = items.filter(
      (item) => new Date(item.dateAdded) > thirtyDaysAgo,
    );

    // Calculate cost per wear for items with price
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

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  /**
   * Save user preferences
   */
  const savePreferences = async (newPreferences: UserPreferences) => {
    try {
      // TODO: Save to local storage or API
      setUserPreferences(newPreferences);
      Alert.alert(
        'Preferences Saved',
        'Your style preferences have been updated!',
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  };

  /**
   * Handle edit profile
   */
  const handleEditProfile = () => {
    Alert.alert('Edit Profile', "Choose what you'd like to update:", [
      {
        text: 'Personal Info',
        onPress: () => console.log('Edit personal info'),
      },
      { text: 'Style Preferences', onPress: () => setShowModal('preferences') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary[500]}
          />
        }
      >
        {/* Profile Header */}
        <ProfileHeader onEditProfile={handleEditProfile} />

        {/* Wardrobe Statistics */}
        {wardrobeStats && <WardrobeStatsSection stats={wardrobeStats} />}

        {/* Quick Actions */}
        <QuickActionsSection />

        {/* Settings Menu */}
        <SettingsSection
          notificationsEnabled={notificationsEnabled}
          onNotificationsToggle={setNotificationsEnabled}
          darkMode={darkMode}
          onDarkModeToggle={setDarkMode}
          autoBackup={autoBackup}
          onAutoBackupToggle={setAutoBackup}
          onOpenModal={setShowModal}
        />

        {/* App Info */}
        <AppInfoSection />
      </ScrollView>

      {/* Modals */}
      <StylePreferencesModal
        visible={showModal === 'preferences'}
        preferences={userPreferences}
        onClose={() => setShowModal(null)}
        onSave={savePreferences}
      />

      <NotificationSettingsModal
        visible={showModal === 'notifications'}
        enabled={notificationsEnabled}
        onClose={() => setShowModal(null)}
        onToggle={setNotificationsEnabled}
      />

      <DisplaySettingsModal
        visible={showModal === 'display'}
        darkMode={darkMode}
        onClose={() => setShowModal(null)}
        onDarkModeToggle={setDarkMode}
      />
    </SafeAreaView>
  );
}

/**
 * Profile Header Component
 */
const ProfileHeader = ({ onEditProfile }: { onEditProfile: () => void }) => (
  <View style={styles.profileHeader}>
    <View style={styles.avatarContainer}>
      <User size={40} color={Colors.primary[600]} strokeWidth={2} />
    </View>

    <Text style={styles.userName}>{MOCK_USER.name}</Text>
    <Text style={styles.userBio}>{MOCK_USER.bio}</Text>
    <Text style={styles.joinDate}>
      Member since{' '}
      {new Date(MOCK_USER.joinDate).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })}
    </Text>

    <TouchableOpacity style={styles.editButton} onPress={onEditProfile}>
      <Edit size={16} color={Colors.text.inverse} strokeWidth={2} />
      <Text style={styles.editButtonText}>Edit Profile</Text>
    </TouchableOpacity>
  </View>
);

/**
 * Wardrobe Statistics Section
 */
const WardrobeStatsSection = ({ stats }: { stats: WardrobeStats }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Your Wardrobe Stats</Text>

    <View style={styles.statsGrid}>
      <StatCard
        icon={Camera}
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
        icon={TrendingUp}
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
    <View style={styles.categoriesContainer}>
      <Text style={styles.subsectionTitle}>Top Categories</Text>
      {Object.entries(stats.itemsByCategory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([category, count]) => (
          <View key={category} style={styles.categoryItem}>
            <Text style={styles.categoryName}>{category}</Text>
            <Text style={styles.categoryCount}>{count} items</Text>
          </View>
        ))}
    </View>
  </View>
);

/**
 * Quick Actions Section
 */
const QuickActionsSection = () => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Quick Actions</Text>
    <View style={styles.quickActions}>
      <QuickActionButton
        icon={Camera}
        label="Add Item"
        onPress={() => router.push('/(tabs)/camera')}
        color={Colors.primary[500]}
      />
      <QuickActionButton
        icon={Heart}
        label="Favorites"
        onPress={() => router.push('/(tabs)/wardrobe')}
        color={Colors.error}
      />
      <QuickActionButton
        icon={BarChart3}
        label="Analytics"
        onPress={() =>
          Alert.alert(
            'Coming Soon',
            'Analytics feature will be available soon!',
          )
        }
        color={Colors.success}
      />
      <QuickActionButton
        icon={Share2}
        label="Share"
        onPress={() =>
          Alert.alert('Coming Soon', 'Share feature will be available soon!')
        }
        color={Colors.warning}
      />
    </View>
  </View>
);

/**
 * Settings Section
 */
const SettingsSection = ({
  notificationsEnabled,
  onNotificationsToggle,
  darkMode,
  onDarkModeToggle,
  autoBackup,
  onAutoBackupToggle,
  onOpenModal,
}: {
  notificationsEnabled: boolean;
  onNotificationsToggle: (value: boolean) => void;
  darkMode: boolean;
  onDarkModeToggle: (value: boolean) => void;
  autoBackup: boolean;
  onAutoBackupToggle: (value: boolean) => void;
  onOpenModal: (modal: SettingsModal) => void;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Settings</Text>

    <SettingsItem
      icon={Palette}
      title="Style Preferences"
      subtitle="Colors, brands, and style preferences"
      onPress={() => onOpenModal('preferences')}
      showChevron
    />

    <SettingsItem
      icon={Bell}
      title="Notifications"
      subtitle="Outfit reminders and style tips"
      onPress={() => onOpenModal('notifications')}
      rightElement={
        <Switch
          value={notificationsEnabled}
          onValueChange={onNotificationsToggle}
          trackColor={{ false: Colors.neutral[300], true: Colors.primary[200] }}
          thumbColor={
            notificationsEnabled ? Colors.primary[500] : Colors.neutral[500]
          }
        />
      }
    />

    <SettingsItem
      icon={darkMode ? Moon : Sun}
      title="Appearance"
      subtitle="Theme and display settings"
      onPress={() => onOpenModal('display')}
      rightElement={
        <Switch
          value={darkMode}
          onValueChange={onDarkModeToggle}
          trackColor={{ false: Colors.neutral[300], true: Colors.primary[200] }}
          thumbColor={darkMode ? Colors.primary[500] : Colors.neutral[500]}
        />
      }
    />

    <SettingsItem
      icon={Smartphone}
      title="Auto Backup"
      subtitle="Automatically backup your wardrobe"
      rightElement={
        <Switch
          value={autoBackup}
          onValueChange={onAutoBackupToggle}
          trackColor={{ false: Colors.neutral[300], true: Colors.primary[200] }}
          thumbColor={autoBackup ? Colors.primary[500] : Colors.neutral[500]}
        />
      }
    />

    <SettingsItem
      icon={Shield}
      title="Privacy & Security"
      subtitle="Data protection and privacy settings"
      onPress={() =>
        Alert.alert('Coming Soon', 'Privacy settings will be available soon!')
      }
      showChevron
    />

    <SettingsItem
      icon={HelpCircle}
      title="Help & Support"
      subtitle="FAQs, tutorials, and contact support"
      onPress={() =>
        Alert.alert('Coming Soon', 'Help center will be available soon!')
      }
      showChevron
    />
  </View>
);

/**
 * App Info Section
 */
const AppInfoSection = () => (
  <View style={styles.appInfo}>
    <Text style={styles.appVersion}>aLMARi v1.0.0</Text>
    <Text style={styles.appDescription}>Made with ❤️ and AI</Text>
    <Text style={styles.copyright}>© 2024 aLMARi. All rights reserved.</Text>
  </View>
);

/**
 * Reusable Components
 */
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
    <Icon size={IconSizes.lg} color={color} strokeWidth={2} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const QuickActionButton = ({
  icon: Icon,
  label,
  onPress,
  color,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  color: string;
}) => (
  <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
    <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
      <Icon size={IconSizes.md} color={color} strokeWidth={2} />
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

const SettingsItem = ({
  icon: Icon,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = false,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}) => (
  <TouchableOpacity
    style={styles.settingsItem}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.settingsIcon}>
      <Icon size={IconSizes.md} color={Colors.primary[600]} strokeWidth={2} />
    </View>
    <View style={styles.settingsContent}>
      <Text style={styles.settingsTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement ||
      (showChevron && (
        <ChevronRight size={IconSizes.md} color={Colors.neutral[400]} />
      ))}
  </TouchableOpacity>
);

/**
 * Style Preferences Modal
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
  const [tempPreferences, setTempPreferences] = useState(preferences);

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
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Style Preferences</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={IconSizes.lg} color={Colors.neutral[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          {/* Favorite Colors */}
          <View style={styles.preferenceSection}>
            <Text style={styles.preferenceSectionTitle}>Favorite Colors</Text>
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
                    <Check size={12} color={Colors.primary[500]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Style Preference */}
          <View style={styles.preferenceSection}>
            <Text style={styles.preferenceSectionTitle}>Style Preference</Text>
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
            <Text style={styles.preferenceSectionTitle}>
              Body Type (Optional)
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
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Notification Settings Modal
 */
const NotificationSettingsModal = ({
  visible,
  enabled,
  onClose,
  onToggle,
}: {
  visible: boolean;
  enabled: boolean;
  onClose: () => void;
  onToggle: (enabled: boolean) => void;
}) => (
  <Modal isVisible={visible} onBackdropPress={onClose} style={styles.modal}>
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Notification Settings</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={IconSizes.lg} color={Colors.neutral[600]} />
        </TouchableOpacity>
      </View>

      <View style={styles.modalBody}>
        <Text style={styles.modalSubtitle}>
          Stay updated with outfit recommendations and style tips
        </Text>

        <View style={styles.notificationOption}>
          <View>
            <Text style={styles.notificationTitle}>Push Notifications</Text>
            <Text style={styles.notificationSubtitle}>
              Daily outfit suggestions and reminders
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={onToggle}
            trackColor={{
              false: Colors.neutral[300],
              true: Colors.primary[200],
            }}
            thumbColor={enabled ? Colors.primary[500] : Colors.neutral[500]}
          />
        </View>
      </View>
    </View>
  </Modal>
);

/**
 * Display Settings Modal
 */
const DisplaySettingsModal = ({
  visible,
  darkMode,
  onClose,
  onDarkModeToggle,
}: {
  visible: boolean;
  darkMode: boolean;
  onClose: () => void;
  onDarkModeToggle: (enabled: boolean) => void;
}) => (
  <Modal isVisible={visible} onBackdropPress={onClose} style={styles.modal}>
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Display Settings</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={IconSizes.lg} color={Colors.neutral[600]} />
        </TouchableOpacity>
      </View>

      <View style={styles.modalBody}>
        <Text style={styles.modalSubtitle}>
          Customize your app's appearance
        </Text>

        <View style={styles.displayOption}>
          <View style={styles.displayOptionContent}>
            {darkMode ? (
              <Moon size={20} color={Colors.primary[500]} />
            ) : (
              <Sun size={20} color={Colors.primary[500]} />
            )}
            <View style={styles.displayOptionText}>
              <Text style={styles.displayTitle}>Dark Mode</Text>
              <Text style={styles.displaySubtitle}>
                {darkMode ? 'Dark theme enabled' : 'Light theme enabled'}
              </Text>
            </View>
          </View>
          <Switch
            value={darkMode}
            onValueChange={onDarkModeToggle}
            trackColor={{
              false: Colors.neutral[300],
              true: Colors.primary[200],
            }}
            thumbColor={darkMode ? Colors.primary[500] : Colors.neutral[500]}
          />
        </View>
      </View>
    </View>
  </Modal>
);

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },

  scrollContent: {
    padding: Spacing.md,
  },

  // Profile Header
  profileHeader: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center' as const,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },

  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[100],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: Spacing.md,
  },

  userName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: 4,
  },

  userBio: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: 4,
  },

  joinDate: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
  },

  editButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },

  editButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },

  // Sections
  section: {
    marginBottom: Spacing.xl,
  },

  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },

  subsectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },

  statCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center' as const,
    flex: 1,
    minWidth: 45,
    ...Shadows.sm,
  },

  statValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginTop: Spacing.xs,
    marginBottom: 4,
  },

  statLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },

  // Categories
  categoriesContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.sm,
  },

  categoryItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: Spacing.xs,
  },

  categoryName: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    fontWeight: Typography.weights.medium,
  },

  categoryCount: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Spacing.md,
  },

  quickActionButton: {
    alignItems: 'center' as const,
    flex: 1,
    minWidth: 80,
  },

  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: Spacing.xs,
  },

  quickActionLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    fontWeight: Typography.weights.medium,
  },

  // Settings
  settingsItem: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },

  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[100],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: Spacing.md,
  },

  settingsContent: {
    flex: 1,
  },

  settingsTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: 2,
  },

  settingsSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  // App Info
  appInfo: {
    alignItems: 'center' as const,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.lg,
  },

  appVersion: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
    marginBottom: 4,
  },

  appDescription: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },

  copyright: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
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
    padding: Spacing.lg,
    maxHeight: 400,
  },

  modalSubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.md,
  },

  modalFooter: {
    flexDirection: 'row' as const,
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
  },

  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
  },

  saveButton: {
    flex: 2,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
  },

  saveButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },

  // Preference sections
  preferenceSection: {
    marginBottom: Spacing.xl,
  },

  preferenceSectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },

  // Color options
  colorGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Spacing.sm,
  },

  colorOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: Spacing.xs,
  },

  colorOptionSelected: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary[500],
  },

  colorOptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  colorOptionTextSelected: {
    color: Colors.primary[500],
    fontWeight: Typography.weights.medium,
  },

  // Style options
  styleOptions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Spacing.sm,
  },

  styleOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  styleOptionSelected: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary[500],
  },

  styleOptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  styleOptionTextSelected: {
    color: Colors.primary[500],
    fontWeight: Typography.weights.medium,
  },

  // Body type options
  bodyTypeOptions: {
    gap: Spacing.sm,
  },

  bodyTypeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  bodyTypeOptionSelected: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary[500],
  },

  bodyTypeOptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },

  bodyTypeOptionTextSelected: {
    color: Colors.primary[500],
    fontWeight: Typography.weights.medium,
  },

  // Notification settings
  notificationOption: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: Spacing.md,
  },

  notificationTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: 4,
  },

  notificationSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },

  // Display settings
  displayOption: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: Spacing.md,
  },

  displayOptionContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.md,
  },

  displayOptionText: {
    flex: 1,
  },

  displayTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: 4,
  },

  displaySubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },
};
