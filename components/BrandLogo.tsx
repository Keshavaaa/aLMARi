// components/BrandLogo.tsx
import { View, Text, TextStyle } from 'react-native';
import { useFonts } from 'expo-font';

interface BrandLogoProps {
  size?: 'small' | 'medium' | 'large';
  style?: TextStyle;
}

export default function BrandLogo({ size = 'medium', style }: BrandLogoProps) {
  const [fontsLoaded] = useFonts({
    Centaur: require('../assets/fonts/centaur-regular.ttf'),
  });

  const sizes = {
    small: 24,
    medium: 32,
    large: 40,
  };

  const fontSize = sizes[size];

  // ✅ NEW COLORS - Electric Purple & Brown
  const purpleColor = '#8C00FF'; // Electric purple for 'a' and 'i'
  const brownColor = '#6B7280'; // Tropical wood brown for 'LMAR'

  const baseStyle = {
    fontFamily: fontsLoaded ? 'Centaur' : 'serif',
    fontSize: fontSize,
    letterSpacing: 1.5,
    ...style,
  };

  if (!fontsLoaded) {
    // Fallback while font loads
    return (
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={{ ...baseStyle, color: purpleColor }}>a</Text>
        <Text style={{ ...baseStyle, color: brownColor }}>LMAR</Text>
        <Text style={{ ...baseStyle, color: purpleColor }}>i</Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={{ ...baseStyle, color: purpleColor }}>a</Text>
      <Text style={{ ...baseStyle, color: brownColor }}>LMAR</Text>
      <Text style={{ ...baseStyle, color: purpleColor }}>i</Text>
    </View>
  );
}
