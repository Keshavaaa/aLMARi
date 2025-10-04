import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import SplashScreen from '@/components/SplashScreen';

// Import your database service
import DatabaseService from '../services/DatabaseService';

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [appInitialized, setAppInitialized] = useState(false);

  useFrameworkReady();

  useEffect(() => {
    // Initialize app first, then handle splash screen
    initializeApp();
  }, []);

  useEffect(() => {
    if (appInitialized) {
      // Show splash for 4 seconds after app is initialized
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [appInitialized]);

  // Add this initialization function
  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing aLMARi App...');

      // Get or create device ID
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId =
          Platform.OS +
          '_' +
          Date.now() +
          '_' +
          Math.random().toString(36).substr(2, 9);
        await AsyncStorage.setItem('device_id', deviceId);
        console.log('📱 New device ID created:', deviceId);
      } else {
        console.log('📱 Existing device ID found:', deviceId);
      }

      // Store device ID globally for use in other components
      global.deviceId = deviceId;

      // Database will be initialized automatically by DatabaseService constructor
      // Wait a moment to ensure database is ready
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('✅ aLMARi App initialization complete');
      setAppInitialized(true);
    } catch (error) {
      console.error('❌ App initialization error:', error);
      // Still allow app to continue even if initialization fails
      setAppInitialized(true);
    }
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
