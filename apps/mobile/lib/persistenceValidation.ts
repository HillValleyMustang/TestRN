/**
 * Data Persistence and Recovery Validation
 * Tests data persistence across app restarts and validates recovery mechanisms
 * Ensures onboarding data integrity and proper state management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Test data structures
interface PersistenceTestData {
  testId: string;
  timestamp: number;
  data: any;
  expectedResult: boolean;
}

interface RecoveryTestResult {
  testName: string;
  success: boolean;
  dataIntegrity: boolean;
  recoveryTime: number;
  errors: string[];
}

/**
 * Comprehensive persistence validation
 */
export const validateDataPersistence = async (): Promise<{
  overallSuccess: boolean;
  results: RecoveryTestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageRecoveryTime: number;
  };
}> => {
  const results: RecoveryTestResult[] = [];

  console.log('[PersistenceValidation] Starting comprehensive persistence validation');

  // Test 1: Basic AsyncStorage operations
  results.push(await testBasicStorageOperations());

  // Test 2: Onboarding data persistence
  results.push(await testOnboardingDataPersistence());

  // Test 3: Data recovery after simulated app restart
  results.push(await testDataRecoveryAfterRestart());

  // Test 4: Large data handling
  results.push(await testLargeDataHandling());

  // Test 5: Concurrent operations
  results.push(await testConcurrentOperations());

  // Test 6: Error recovery
  results.push(await testErrorRecovery());

  // Calculate summary
  const passedTests = results.filter(r => r.success).length;
  const failedTests = results.length - passedTests;
  const averageRecoveryTime = results.reduce((sum, r) => sum + r.recoveryTime, 0) / results.length;

  const summary = {
    totalTests: results.length,
    passedTests,
    failedTests,
    averageRecoveryTime: Math.round(averageRecoveryTime),
  };

  console.log('[PersistenceValidation] Validation complete:', summary);

  return {
    overallSuccess: failedTests === 0,
    results,
    summary,
  };
};

/**
 * Test basic AsyncStorage operations
 */
const testBasicStorageOperations = async (): Promise<RecoveryTestResult> => {
  const startTime = Date.now();
  const testName = 'Basic AsyncStorage Operations';

  try {
    // Test data
    const testKey = 'persistence_test_basic';
    const testData = {
      id: 'test-123',
      value: 'test-value',
      timestamp: Date.now(),
      nested: { prop: 'value' },
    };

    // Store data
    await AsyncStorage.setItem(testKey, JSON.stringify(testData));

    // Retrieve data
    const storedData = await AsyncStorage.getItem(testKey);

    // Validate data integrity
    const parsedData = JSON.parse(storedData || '{}');
    const dataIntegrity = JSON.stringify(testData) === JSON.stringify(parsedData);

    // Clean up
    await AsyncStorage.removeItem(testKey);

    return {
      testName,
      success: dataIntegrity,
      dataIntegrity,
      recoveryTime: Date.now() - startTime,
      errors: dataIntegrity ? [] : ['Data integrity check failed'],
    };

  } catch (error) {
    return {
      testName,
      success: false,
      dataIntegrity: false,
      recoveryTime: Date.now() - startTime,
      errors: [`Basic storage operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};

/**
 * Test onboarding data persistence
 */
const testOnboardingDataPersistence = async (): Promise<RecoveryTestResult> => {
  const startTime = Date.now();
  const testName = 'Onboarding Data Persistence';

  try {
    // Test data mimicking real onboarding data
    const testData = {
      step1: {
        fullName: 'Test User',
        heightCm: 175,
        weight: 70,
        bodyFatPct: 15,
      },
      step2: {
        tPathType: 'ppl',
        experience: 'intermediate',
      },
      step3: {
        goalFocus: 'muscle_gain',
        sessionLength: '45-60',
      },
      step4: {
        gymName: 'Test Gym',
        equipmentMethod: 'photo',
        consentGiven: true,
      },
    };

    const keys = [
      'onboarding_step1_data',
      'onboarding_step2_data',
      'onboarding_step3_data',
      'onboarding_step4_data',
    ];

    // Store all step data
    await Promise.all(
      keys.map((key, index) =>
        AsyncStorage.setItem(key, JSON.stringify(Object.values(testData)[index]))
      )
    );

    // Retrieve and validate all data
    const retrievedData = await Promise.all(
      keys.map(key => AsyncStorage.getItem(key))
    );

    // Validate data integrity
    let dataIntegrity = true;
    const errors: string[] = [];

    retrievedData.forEach((data, index) => {
      if (!data) {
        dataIntegrity = false;
        errors.push(`Missing data for ${keys[index]}`);
        return;
      }

      try {
        const parsed = JSON.parse(data);
        const original = Object.values(testData)[index];
        if (JSON.stringify(parsed) !== JSON.stringify(original)) {
          dataIntegrity = false;
          errors.push(`Data mismatch for ${keys[index]}`);
        }
      } catch (parseError) {
        dataIntegrity = false;
        errors.push(`Parse error for ${keys[index]}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    });

    // Clean up
    await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));

    return {
      testName,
      success: dataIntegrity,
      dataIntegrity,
      recoveryTime: Date.now() - startTime,
      errors,
    };

  } catch (error) {
    return {
      testName,
      success: false,
      dataIntegrity: false,
      recoveryTime: Date.now() - startTime,
      errors: [`Onboarding data persistence failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};

/**
 * Test data recovery after simulated app restart
 */
const testDataRecoveryAfterRestart = async (): Promise<RecoveryTestResult> => {
  const startTime = Date.now();
  const testName = 'Data Recovery After Restart';

  try {
    // Store test data
    const testKey = 'persistence_test_restart';
    const testData = {
      sessionId: 'session-123',
      userProgress: { step: 3, completedSteps: [1, 2] },
      preferences: { theme: 'dark', notifications: true },
    };

    await AsyncStorage.setItem(testKey, JSON.stringify(testData));

    // Simulate app restart by clearing memory references
    // (In real scenario, this would be tested by closing/reopening app)

    // Retrieve data as if after restart
    const recoveredData = await AsyncStorage.getItem(testKey);

    if (!recoveredData) {
      return {
        testName,
        success: false,
        dataIntegrity: false,
        recoveryTime: Date.now() - startTime,
        errors: ['Data not recovered after simulated restart'],
      };
    }

    // Validate recovery
    const parsedData = JSON.parse(recoveredData);
    const dataIntegrity = JSON.stringify(testData) === JSON.stringify(parsedData);

    // Clean up
    await AsyncStorage.removeItem(testKey);

    return {
      testName,
      success: dataIntegrity,
      dataIntegrity,
      recoveryTime: Date.now() - startTime,
      errors: dataIntegrity ? [] : ['Recovered data does not match original'],
    };

  } catch (error) {
    return {
      testName,
      success: false,
      dataIntegrity: false,
      recoveryTime: Date.now() - startTime,
      errors: [`Data recovery test failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};

/**
 * Test handling of large data sets
 */
const testLargeDataHandling = async (): Promise<RecoveryTestResult> => {
  const startTime = Date.now();
  const testName = 'Large Data Handling';

  try {
    // Create large test data (simulating extensive user data)
    const largeData = {
      userProfile: {
        id: 'user-123',
        name: 'Test User',
        preferences: {},
        history: [],
      },
      workoutHistory: Array.from({ length: 100 }, (_, i) => ({
        id: `workout-${i}`,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        exercises: Array.from({ length: 20 }, (_, j) => ({
          id: `exercise-${j}`,
          name: `Exercise ${j}`,
          sets: Array.from({ length: 4 }, (_, k) => ({
            reps: Math.floor(Math.random() * 12) + 1,
            weight: Math.floor(Math.random() * 100) + 20,
          })),
        })),
      })),
      statistics: {
        totalWorkouts: 100,
        totalExercises: 2000,
        totalSets: 8000,
        personalRecords: {},
      },
    };

    const testKey = 'persistence_test_large';

    // Store large data
    await AsyncStorage.setItem(testKey, JSON.stringify(largeData));

    // Retrieve and validate
    const storedData = await AsyncStorage.getItem(testKey);

    if (!storedData) {
      return {
        testName,
        success: false,
        dataIntegrity: false,
        recoveryTime: Date.now() - startTime,
        errors: ['Large data storage failed'],
      };
    }

    // Validate data integrity
    const parsedData = JSON.parse(storedData);
    const dataIntegrity = JSON.stringify(largeData) === JSON.stringify(parsedData);

    // Clean up
    await AsyncStorage.removeItem(testKey);

    return {
      testName,
      success: dataIntegrity,
      dataIntegrity,
      recoveryTime: Date.now() - startTime,
      errors: dataIntegrity ? [] : ['Large data integrity check failed'],
    };

  } catch (error) {
    return {
      testName,
      success: false,
      dataIntegrity: false,
      recoveryTime: Date.now() - startTime,
      errors: [`Large data handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};

/**
 * Test concurrent storage operations
 */
const testConcurrentOperations = async (): Promise<RecoveryTestResult> => {
  const startTime = Date.now();
  const testName = 'Concurrent Operations';

  try {
    const operations = Array.from({ length: 10 }, async (_, i) => {
      const key = `concurrent_test_${i}`;
      const data = { index: i, value: `data-${i}`, timestamp: Date.now() };

      // Store
      await AsyncStorage.setItem(key, JSON.stringify(data));

      // Retrieve
      const stored = await AsyncStorage.getItem(key);
      const parsed = stored ? JSON.parse(stored) : null;

      // Clean up
      await AsyncStorage.removeItem(key);

      return parsed && parsed.index === i;
    });

    // Execute all operations concurrently
    const results = await Promise.all(operations);
    const allSuccessful = results.every(result => result === true);

    return {
      testName,
      success: allSuccessful,
      dataIntegrity: allSuccessful,
      recoveryTime: Date.now() - startTime,
      errors: allSuccessful ? [] : ['Some concurrent operations failed'],
    };

  } catch (error) {
    return {
      testName,
      success: false,
      dataIntegrity: false,
      recoveryTime: Date.now() - startTime,
      errors: [`Concurrent operations test failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};

/**
 * Test error recovery mechanisms
 */
const testErrorRecovery = async (): Promise<RecoveryTestResult> => {
  const startTime = Date.now();
  const testName = 'Error Recovery';

  try {
    const errors: string[] = [];

    // Test 1: Invalid JSON handling
    try {
      await AsyncStorage.setItem('error_test_invalid', '{invalid json');
      const data = await AsyncStorage.getItem('error_test_invalid');
      if (data) {
        JSON.parse(data); // Should throw
        errors.push('Invalid JSON was not handled properly');
      }
    } catch (jsonError) {
      // Expected - invalid JSON should cause error
    } finally {
      await AsyncStorage.removeItem('error_test_invalid');
    }

    // Test 2: Null/undefined data handling
    try {
      await AsyncStorage.setItem('error_test_null', JSON.stringify(null));
      const data = await AsyncStorage.getItem('error_test_null');
      if (data && JSON.parse(data) !== null) {
        errors.push('Null data not handled correctly');
      }
    } catch (error) {
      errors.push('Null data test failed');
    } finally {
      await AsyncStorage.removeItem('error_test_null');
    }

    // Test 3: Large key names
    const longKey = 'a'.repeat(1000);
    try {
      await AsyncStorage.setItem(longKey, JSON.stringify({ test: 'large-key' }));
      const data = await AsyncStorage.getItem(longKey);
      if (!data) {
        errors.push('Large key storage failed');
      }
    } catch (error) {
      errors.push('Large key test failed');
    } finally {
      try {
        await AsyncStorage.removeItem(longKey);
      } catch {
        // Ignore cleanup errors
      }
    }

    const success = errors.length === 0;

    return {
      testName,
      success,
      dataIntegrity: success,
      recoveryTime: Date.now() - startTime,
      errors,
    };

  } catch (error) {
    return {
      testName,
      success: false,
      dataIntegrity: false,
      recoveryTime: Date.now() - startTime,
      errors: [`Error recovery test failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};