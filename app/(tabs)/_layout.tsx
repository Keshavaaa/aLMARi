// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Home, Container, Plus, User, Sparkles } from 'lucide-react-native';
import { Colors, Layout, Typography, IconSizes } from '../../constants/Design';
import { Platform, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary[500],
        tabBarInactiveTintColor: Colors.neutral[400],

        tabBarStyle: {
          backgroundColor: Colors.background.primary,
          borderTopWidth: 1,
          borderTopColor: Colors.border.light,
          paddingTop: 0,
          paddingBottom: 8,
          height: Layout.tabBar.height,
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
          fontSize: Typography.sizes.xs,
          fontWeight: Typography.weights.medium,
          marginTop: 4,
          fontFamily: 'System',
        },

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
            <Container
              size={focused ? IconSizes.lg : IconSizes.md}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

      {/* Add Clothes - PRIMARY ELEVATED BUTTON WITH GRADIENT */}
      <Tabs.Screen
        name="camera"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerButtonContainer}>
              <LinearGradient
                colors={['#CD01FE', '#8C00FF', '#6500F1']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.centerButton,
                  focused && styles.centerButtonActive,
                ]}
              >
                <Plus
                  size={32}
                  color={Colors.background.primary}
                  strokeWidth={3}
                />
              </LinearGradient>
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />

      {/* Outfits - AI recommendations and outfit planning */}
      <Tabs.Screen
        name="outfit"
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
              strokeWidth={focused ? 2.1 : 2}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerButtonContainer: {
    position: 'absolute',
    top: -27, //value to raise/lower the button
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: Colors.background.primary,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },

  centerButtonActive: {
    transform: [{ scale: 1.05 }],
  },
});
