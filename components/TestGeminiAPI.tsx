// components/TestGeminiAPI.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { testAIConnection } from '../services/ImageProcessingService';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/Design';

export default function TestGeminiAPI() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>('');

  const runTest = async () => {
    setTesting(true);
    setResult('Testing...');

    try {
      const response = await testAIConnection();

      if (response.success) {
        setResult(`✅ Success: ${response.data}`);
        Alert.alert('API Test Successful!', 'Gemini AI is working correctly');
      } else {
        setResult(`❌ Failed: ${response.error?.message}`);
        Alert.alert(
          'API Test Failed',
          response.error?.message || 'Unknown error',
        );
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`);
      Alert.alert('Test Error', 'Failed to test API connection');
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gemini AI Test</Text>

      <TouchableOpacity
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={runTest}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Gemini API'}
        </Text>
      </TouchableOpacity>

      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}
    </View>
  );
}

const styles = {
  container: {
    padding: Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    margin: Spacing.md,
  },

  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    textAlign: 'center' as const,
  },

  button: {
    backgroundColor: Colors.primary[500],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
    marginBottom: Spacing.md,
  },

  buttonDisabled: {
    backgroundColor: Colors.neutral[400],
  },

  buttonText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },

  resultContainer: {
    backgroundColor: Colors.neutral[50],
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },

  resultText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    fontFamily: 'monospace',
  },
};
