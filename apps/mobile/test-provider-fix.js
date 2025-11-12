/**
 * Test Utility for Provider Fix
 * This helps verify that the circular dependency and provider order issues are resolved
 * 
 * Add this to your app temporarily for testing, then remove it.
 */

import React, { useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { useAuth } from './_contexts/auth-context';
import { useData } from './_contexts/data-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function ProviderFixTest() {
  const { userId, session } = useAuth();
  const { cleanupUserData, emergencyReset } = useData();
  const [testResults, setTestResults] = useState([]);

  const addResult = (test, status, message) => {
    setTestResults(prev => [...prev, { test, status, message, timestamp: new Date() }]);
  };

  const runTests = async () => {
    console.log('🧪 Starting Provider Fix Tests...');
    setTestResults([]);

    // Test 1: Check if providers are working
    try {
      if (userId) {
        addResult('Provider Access', '✅', 'useAuth and useData hooks working correctly');
      } else {
        addResult('Provider Access', '⚠️', 'No user logged in, but hooks working');
      }
    } catch (error) {
      addResult('Provider Access', '❌', `Hook error: ${error.message}`);
    }

    // Test 2: Test cleanup function
    try {
      if (userId) {
        // Don't actually clean up, just test if the function exists
        if (typeof cleanupUserData === 'function') {
          addResult('Cleanup Function', '✅', 'cleanupUserData function accessible');
        } else {
          addResult('Cleanup Function', '❌', 'cleanupUserData not available');
        }
      } else {
        addResult('Cleanup Function', '⚠️', 'Cannot test - no user logged in');
      }
    } catch (error) {
      addResult('Cleanup Function', '❌', `Function error: ${error.message}`);
    }

    // Test 3: Test emergency reset
    try {
      if (typeof emergencyReset === 'function') {
        addResult('Emergency Reset', '✅', 'emergencyReset function accessible');
      } else {
        addResult('Emergency Reset', '❌', 'emergencyReset not available');
      }
    } catch (error) {
      addResult('Emergency Reset', '❌', `Function error: ${error.message}`);
    }

    // Test 4: Test manual user data cleanup (only if user exists)
    try {
      if (userId) {
        console.log('Testing manual cleanup...');
        // This will actually clean up data, so warn the user
        Alert.alert(
          'Test Manual Cleanup',
          'This will delete ALL local data for the current user. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Continue', 
              style: 'destructive',
              onPress: async () => {
                const result = await cleanupUserData(userId);
                addResult('Manual Cleanup', result.success ? '✅' : '❌', 
                  `Cleanup completed. Tables: ${result.cleanedTables.join(', ')}`);
                if (result.errors.length > 0) {
                  addResult('Cleanup Errors', '⚠️', result.errors.join(', '));
                }
              }
            }
          ]
        );
      } else {
        addResult('Manual Cleanup', '⚠️', 'Cannot test - no user logged in');
      }
    } catch (error) {
      addResult('Manual Cleanup', '❌', `Cleanup error: ${error.message}`);
    }

    // Test 5: AsyncStorage check
    try {
      const keys = await AsyncStorage.getAllKeys();
      addResult('AsyncStorage', '✅', `AsyncStorage accessible, ${keys.length} keys found`);
    } catch (error) {
      addResult('AsyncStorage', '❌', `AsyncStorage error: ${error.message}`);
    }

    console.log('🧪 Provider Fix Tests Completed');
  };

  return (
    <View style={{ padding: 20, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Provider Fix Test Results
      </Text>
      
      <Button title="Run Tests" onPress={runTests} />
      
      {testResults.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Results:</Text>
          {testResults.map((result, index) => (
            <View key={index} style={{ marginTop: 5, padding: 10, backgroundColor: 'white', borderRadius: 5 }}>
              <Text style={{ fontWeight: 'bold' }}>
                {result.status} {result.test}
              </Text>
              <Text style={{ color: '#666', fontSize: 14 }}>{result.message}</Text>
              <Text style={{ color: '#999', fontSize: 12 }}>
                {result.timestamp.toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      <Text style={{ marginTop: 20, color: '#666', fontSize: 12 }}>
        Remove this component after testing
      </Text>
    </View>
  );
}

// Usage:
// 1. Import this component in your app
// 2. Add <ProviderFixTest /> temporarily to any screen
// 3. Run the app and test the functions
// 4. Remove the component after testing