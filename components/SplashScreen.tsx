import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const letterAnims = {
    a: useRef(new Animated.Value(0)).current,
    L: useRef(new Animated.Value(0)).current,
    M: useRef(new Animated.Value(0)).current,
    A: useRef(new Animated.Value(0)).current,
    R: useRef(new Animated.Value(0)).current,
    i: useRef(new Animated.Value(0)).current,
  };

  useEffect(() => {
    // Initial fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Letter animation sequence
    setTimeout(() => {
      // First show all letters
      Animated.stagger(100, [
        Animated.timing(letterAnims.a, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(letterAnims.L, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(letterAnims.M, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(letterAnims.A, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(letterAnims.R, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(letterAnims.i, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // After 2 seconds, collapse middle letters
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(letterAnims.L, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(letterAnims.M, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(letterAnims.A, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(letterAnims.R, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2000);
    }, 500);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.letterContainer}>
            <Animated.Text
              style={[
                styles.letter,
                styles.purpleLetter,
                { opacity: letterAnims.a },
              ]}
            >
              a
            </Animated.Text>
            <Animated.Text
              style={[
                styles.letter,
                styles.whiteLetter,
                { opacity: letterAnims.L },
              ]}
            >
              L
            </Animated.Text>
            <Animated.Text
              style={[
                styles.letter,
                styles.whiteLetter,
                { opacity: letterAnims.M },
              ]}
            >
              M
            </Animated.Text>
            <Animated.Text
              style={[
                styles.letter,
                styles.whiteLetter,
                { opacity: letterAnims.A },
              ]}
            >
              A
            </Animated.Text>
            <Animated.Text
              style={[
                styles.letter,
                styles.whiteLetter,
                { opacity: letterAnims.R },
              ]}
            >
              R
            </Animated.Text>
            <Animated.Text
              style={[
                styles.letter,
                styles.purpleLetter,
                { opacity: letterAnims.i },
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
    fontSize: 72,
    fontWeight: '400',
    fontFamily: 'serif',
    letterSpacing: 4,
  },
  purpleLetter: {
    color: '#8B5CF6',
  },
  whiteLetter: {
    color: '#FFFFFF',
  },
});