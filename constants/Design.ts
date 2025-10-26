// constants/Design.ts
export const Colors = {
  // Primary Brand Colors - Consistent purple theme for aLMARi
  primary: {
    50: '#F5F3FF',   // Very light purple background
    100: '#EDE9FE',  // Light purple for cards/sections
    200: '#DDD6FE',  // Lighter purple for borders
    300: '#C4B5FD',  // Medium light purple
    400: '#A78BFA',  // Medium purple
    500: '#8C00FF',  // Main brand purple (your primary)
    600: '#7C3AED',  // Darker purple for hover states
    700: '#6D28D9',  // Dark purple for active states
    800: '#5B21B6',  // Very dark purple
    900: '#4C1D95'   // Darkest purple for text
  },
  
  // Magenta accent (left side of gradient)
  accent: {
    500: '#CD01FE',  // Vibrant magenta
    600: '#9800F7',  // Purple-magenta
  },
  // Secondary Brand Color - Tropical Wood Brown (keeping this)
  secondary: {
    50: '#FAF7F5',
    100: '#F5EFE9',
    200: '#E8DDD2',
    300: '#D4C3B3',
    400: '#B8A091',
    500: '#603B2A',  // Tropical Wood Brown
    600: '#52321F',
    700: '#442916',
    800: '#36200F',
    900: '#281708'
  },

  // Neutral Grays - Professional and clean
  neutral: {
    50: '#FAFAFA',   // Almost white background
    100: '#F5F5F5',  // Light gray background
    200: '#E5E5E5',  // Border gray
    300: '#D4D4D4',  // Light text gray
    400: '#A3A3A3',  // Medium text gray
    500: '#737373',  // Normal text gray
    600: '#525252',  // Dark text gray
    700: '#404040',  // Darker text
    800: '#262626',  // Very dark text
    900: '#171717'   // Almost black text
  },
  
  // Status Colors - Standard and accessible
  success: '#10B981',  // Green for success states
  warning: '#F59E0B',  // Amber for warnings
  error: '#EF4444',   // Red for errors
  info: '#3B82F6',    // Blue for information
  
  // Background Colors
  background: {
    primary: '#FFFFFF',    // Main app background
    secondary: '#FAFAFA',  // Secondary sections
    card: '#FFFFFF',       // Card backgrounds
    overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlays
  },

  // Text Colors - Semantic naming for better readability
  text: {
    primary: '#171717',    // Main text color
    secondary: '#525252',  // Secondary text
    tertiary: '#A3A3A3',   // Subtle text
    inverse: '#FFFFFF',    // White text on dark backgrounds
    brand: '#8C00FF',      // ✅ Electric purple
    accent: '#603B2A',     // Brown accent
  },

  // Border Colors
  border: {
    light: '#E5E5E5',     // Light borders
    medium: '#D4D4D4',    // Medium borders
    dark: '#A3A3A3',      // Dark borders
  }
};

export const Typography = {
  // Font Sizes - Using a consistent scale
  sizes: {
    xs: 12,      // Small captions, labels
    sm: 14,      // Body text, secondary info
    md: 16,      // Main body text
    lg: 18,      // Subheadings
    xl: 20,      // Small headings
    xxl: 24,     // Medium headings
    title: 28,   // Large headings
    hero: 34,    // Hero text
  },
  
  // Font Weights
  weights: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const
  },
  
  // Brand Typography for aLMARi logo
  brand: {
    fontFamily: 'System',
    fontSize: 32,
    fontWeight: '300' as const,
    primaryColor: '#8C00FF',    // ✅ Electric purple for 'a' and 'i'
    secondaryColor: '#603B2A',  // Brown for 'LMAR'
    letterSpacing: 1.2,
  },
  
  // Line Heights for better readability
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  }
};

export const Spacing = {
  // Consistent spacing scale - multiples of 4 for pixel-perfect design
  xs: 4,       // Tiny gaps
  sm: 8,       // Small gaps
  md: 16,      // Standard gaps
  lg: 24,      // Large gaps
  xl: 32,      // Extra large gaps
  xxl: 48,     // Hero sections
  xxxl: 64,    // Maximum spacing
  
  // Screen margins
  screen: {
    horizontal: 16,  // Left/right screen padding
    vertical: 24,    // Top/bottom screen padding
  },
  
  // Component spacing
  component: {
    padding: 16,     // Standard component padding
    margin: 12,      // Standard component margin
  }
};

export const BorderRadius = {
  none: 0,
  sm: 8,       // Small buttons, inputs
  md: 12,      // Cards, medium components
  lg: 16,      // Large cards
  xl: 24,      // Hero cards
  xxl: 32,     // Large modals
  full: 9999,  // Circular elements
};

export const Shadows = {
  // iOS-style shadows that work on both platforms
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  }
};

// Animation durations for consistent motion
export const Animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    easeInOut: 'ease-in-out',
    easeOut: 'ease-out',
    easeIn: 'ease-in',
  }
};

// Layout constants
export const Layout = {
  // Screen dimensions helpers
  window: {
    width: '100%' as const,
    height: '100%' as const,
  },
  
  // Common component sizes
  button: {
    height: {
      sm: 36,
      md: 44,
      lg: 52,
    },
    minWidth: 88,
  },
  
  input: {
    height: 48,
    borderWidth: 1,
  },
  
  card: {
    minHeight: 120,
    borderWidth: 1,
  },
  
  // Tab bar
  tabBar: {
    height: 60,
  }
};

// Professional icon sizes
export const IconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxs : 48,
};
