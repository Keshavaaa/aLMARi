import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fontsLoaded] = useFonts({
    Centaur: require('../assets/fonts/centaur-regular.ttf'),
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const letterAnims = {
    a: useRef(new Animated.Value(0)).current,
    L: useRef(new Animated.Value(0)).current,
    M: useRef(new Animated.Value(0)).current,
    A: useRef(new Animated.Value(0)).current,
    R: useRef(new Animated.Value(0)).current,
    i: useRef(new Animated.Value(0)).current,
  };

  const aPositionX = useRef(new Animated.Value(0)).current;
  const iPositionX = useRef(new Animated.Value(0)).current;
  const finalFadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!fontsLoaded) return;

    // Step 1: Initial fade in (0-500ms)
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Step 2: Show all letters with stagger (500-1500ms)
    setTimeout(() => {
      Animated.stagger(100, [
        Animated.timing(letterAnims.a, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(letterAnims.L, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(letterAnims.M, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(letterAnims.A, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(letterAnims.R, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(letterAnims.i, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Step 3: Hold full logo for 1 second, then animate (2500-3500ms)
      setTimeout(() => {
        Animated.parallel([
          // Fade out LMAR
          Animated.timing(letterAnims.L, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(letterAnims.M, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(letterAnims.A, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(letterAnims.R, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          // Move 'a' to the right
          Animated.timing(aPositionX, {
            toValue: 115,
            duration: 700,
            useNativeDriver: true,
          }),
          // Move 'i' to the left
          Animated.timing(iPositionX, {
            toValue: -115,
            duration: 700,
            useNativeDriver: true,
          }),
        ]).start();

        // Step 4: Hold "ai" for a moment, then fade out everything (3500-4500ms)
        setTimeout(() => {
          Animated.timing(finalFadeOut, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start(() => {
            // Step 5: Navigate to home (4500ms total)
            if (onFinish) {
              onFinish();
            }
          });
        }, 1500); // Hold "ai" for 1.5 seconds
      }, 2000); // Show full logo for 2 seconds
    }, 500);
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={styles.gradient}>
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: Animated.multiply(fadeAnim, finalFadeOut),
            },
          ]}
        >
          <View style={styles.letterContainer}>
            <Animated.Text
              style={[
                styles.letter,
                styles.purpleLetter,
                {
                  opacity: letterAnims.a,
                  transform: [{ translateX: aPositionX }],
                },
              ]}
            >
              a
            </Animated.Text>
            <Animated.Text
              style={[
                styles.letter,
                styles.brownLetter,
                { opacity: letterAnims.L },
              ]}
            >
              L
            </Animated.Text>
            <Animated.Text
              style={[
                styles.letter,
                styles.brownLetter,
                { opacity: letterAnims.M },
              ]}
            >
              M
            </Animated.Text>
            <Animated.Text
              style={[
                styles.letter,
                styles.brownLetter,
                { opacity: letterAnims.A },
              ]}
            >
              A
            </Animated.Text>
            <Animated.Text
              style={[
                styles.letter,
                styles.brownLetter,
                { opacity: letterAnims.R },
              ]}
            >
              R
            </Animated.Text>
            <Animated.Text
              style={[
                styles.letter,
                styles.purpleLetter,
                {
                  opacity: letterAnims.i,
                  transform: [{ translateX: iPositionX }],
                },
              ]}
            >
              i
            </Animated.Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  letterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  letter: {
    fontSize: 80,
    fontWeight: '400',
    fontFamily: 'Centaur',
    letterSpacing: 4,
  },
  purpleLetter: {
    color: '#8C00FF',
  },
  brownLetter: {
    color: '#6B7280',
  },
});
