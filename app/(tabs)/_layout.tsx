// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Home, Shirt, Camera, User, Sparkles } from 'lucide-react-native';
import { Colors, Layout, Typography, IconSizes } from '../../constants/Design';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // Hide header since we'll handle it in individual screens
        headerShown: false,

        // Tab bar styling using our design system
        tabBarActiveTintColor: Colors.primary[500], // Main brand purple
        tabBarInactiveTintColor: Colors.neutral[400], // Neutral gray for inactive

        tabBarStyle: {
          backgroundColor: Colors.background.primary, // Clean white background
          borderTopWidth: 1,
          borderTopColor: Colors.border.light, // Light border
          paddingTop: 0,
          paddingBottom: 8, // Slight padding for touch comfort
          height: Layout.tabBar.height, // Consistent height from design system
          // Add subtle shadow for depth
          ...Platform.select({
            ios: {
              shadowColor: Colors.neutral[900],
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
            },
            android: {
              elevation: 8,
            },
          }),
        },

        tabBarLabelStyle: {
          fontSize: Typography.sizes.xs, // 12px from design system
          fontWeight: Typography.weights.medium, // 500 weight
          marginTop: 4,
          fontFamily: 'System', // Will use system font
        },

        // Consistent icon sizing
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}
    >
      {/* Home - Dashboard/Overview */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home
              size={focused ? IconSizes.lg : IconSizes.md}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

      {/* Wardrobe - View all clothing items */}
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: 'Wardrobe',
          tabBarIcon: ({ color, focused }) => (
            <Shirt
              size={focused ? IconSizes.lg : IconSizes.md}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

      {/* Add Clothes - Primary action (camera) */}
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Add Item',
          tabBarIcon: ({ color, focused }) => (
            <Camera
              size={focused ? IconSizes.lg : IconSizes.md}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

      {/* Outfits - AI recommendations and outfit planning */}
      <Tabs.Screen
        name="outfit" // Changed from "outfits" to match your file name
        options={{
          title: 'Outfits',
          tabBarIcon: ({ color, focused }) => (
            <Sparkles
              size={focused ? IconSizes.lg : IconSizes.md}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

      {/* Profile - User settings and preferences */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User
              size={focused ? IconSizes.lg : IconSizes.md}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
    </Tabs>
  );
}
