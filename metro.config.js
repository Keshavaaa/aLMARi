const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// SDK 54 specific resolver configuration
config.resolver.alias = {
  '@': './src'
};

// Add source extensions if needed
config.resolver.sourceExts.push('cjs');

module.exports = config;
