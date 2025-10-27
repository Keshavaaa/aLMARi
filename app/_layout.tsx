import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import SplashScreen from '@/components/SplashScreen';
import DatabaseService from '../services/DatabaseService';
import * as Font from 'expo-font';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useFrameworkReady();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing aLMARi App...');

      await Font.loadAsync({
        Centaur: require('../assets/fonts/centaur-regular.ttf'),
      });
      console.log('✅ Centaur font loaded');

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

      globalThis.deviceId = deviceId;

      // Initialize database
      console.log('🗄️ Initializing database...');
      await DatabaseService.initialize();
      console.log('✅ Database initialized successfully');

      console.log('✅ aLMARi App initialization complete');

      // Small delay for stability
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mark app as ready
      setIsReady(true);

      // Wait 4 seconds THEN hide splash
      setTimeout(() => {
        setShowSplash(false);
      }, 4000);
    } catch (error) {
      console.error('❌ App initialization error:', error);
      setIsReady(true);
      setTimeout(() => {
        setShowSplash(false);
      }, 2000);
    }
  };

  if (!isReady || showSplash) {
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
