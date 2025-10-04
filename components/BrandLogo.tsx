import { View, Text, TextStyle } from 'react-native';
import { useFonts } from 'expo-font';

interface BrandLogoProps {
  size?: 'small' | 'medium' | 'large';
  style?: TextStyle;
}

export default function BrandLogo({ size = 'medium', style }: BrandLogoProps) {
  const [fontsLoaded] = useFonts({
    'Centaur': require('../assets/fonts/centaur-regular.ttf'),
  });

  const sizes = {
    small: 24,
    medium: 32,
    large: 40,
  };

  const fontSize = sizes[size];
  
  // Meta AI style colors
  const purpleColor = '#7148d0ff'; // Purple for 'a' and 'i'
  const brownColor = '#43270F';  // Brown for 'LMAR'

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
