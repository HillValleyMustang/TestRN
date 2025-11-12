/**
 * Local Data Cleanup Test Utility
 * Helps test and debug the local data cleanup functionality
 *
 * USAGE: Add these console commands to your React Native app during development
 */

// Simple console command for testing - run this in your React Native app:
export const testLocalDataCleanup = async () => {
  // You can add this to a test screen or run in console:
  // import { testLocalDataCleanup } from './local-data-cleanup-test';
  // testLocalDataCleanup();
  
  console.log('[Test] Local data cleanup test - use the following commands:');
  console.log('1. Check current user data: console.log("Current user:", userId);');
  console.log('2. Clean up local data: const result = await cleanupUserData(userId);');
  console.log('3. Emergency reset all: const result = await emergencyReset();');
  console.log('4. Clear AsyncStorage: await AsyncStorage.clear();');
};

// Use these commands directly in your React Native console:
export const quickTestCommands = `
// React Native Console Commands (run these during development):

// 1. Check current user
console.log('Current user:', userId);

// 2. Clean up local data for current user
const result = await cleanupUserData(userId);
console.log('Cleanup result:', result);

// 3. Emergency reset (deletes ALL local data)
const resetResult = await emergencyReset();
console.log('Reset result:', resetResult);

// 4. Clear AsyncStorage manually
await AsyncStorage.clear();
console.log('AsyncStorage cleared');

// 5. Check what data exists
const keys = await AsyncStorage.getAllKeys();
console.log('Local storage keys:', keys);

// 6. Check gyms data
const gyms = await getGyms(userId);
console.log('User gyms:', gyms);
`;

// Manual testing steps
export const manualTestingSteps = `
MANUAL TESTING STEPS FOR LOCAL DATA CLEANUP:

1. **Setup Test Environment:**
   - Delete user from Supabase dashboard
   - Run the app and notice old gyms still appear
   - This confirms the local data persistence issue

2. **Test Cleanup Functionality:**
   - Add the test functions to a test screen
   - Call testLocalDataCleanup() after creating a new user
   - Verify that old gyms are removed

3. **Test Automatic Cleanup:**
   - Delete user from Supabase
   - Create a new user
   - Verify old gym data doesn't appear (automatic cleanup)

4. **Expected Results:**
   - Old gym data should be automatically cleaned up when user changes
   - New users should start with a clean slate
   - No more ghost gyms from previous users

5. **If Issues Persist:**
   - Use testEmergencyReset() to clear all data
   - Or manually clear AsyncStorage
   - Check console logs for cleanup activity
`;

// Console command for quick testing (run in React Native console)
export const quickTestCommands = `
// Run these in React Native console during development:

// 1. Test cleanup for current user
import { testLocalDataCleanup } from './local-data-cleanup-test';
testLocalDataCleanup();

// 2. Emergency reset (deletes ALL local data)
import { testEmergencyReset } from './local-data-cleanup-test';
testEmergencyReset();

// 3. Check what data exists
import AsyncStorage from '@react-native-async-storage/async-storage';
const keys = await AsyncStorage.getAllKeys();
console.log('Local storage keys:', keys);
`;

// Troubleshooting guide
export const troubleshooting = `
TROUBLESHOOTING GUIDE:

Problem: Old gyms still appear after new user signup
Solution: The automatic cleanup should trigger when user changes

Problem: Cleanup not working
Solutions:
1. Check console logs for cleanup activity
2. Verify the auth flow is detecting user changes
3. Try manual cleanup with testLocalDataCleanup()

Problem: Need to start completely fresh
Solutions:
1. Use testEmergencyReset() for nuclear option
2. Delete and reinstall the app
3. Clear app data in device settings

Debugging Commands:
- Check current user: console.log('Current user:', userId);
- Check local data: const gyms = await getGyms(userId);
- Check AsyncStorage: const keys = await AsyncStorage.getAllKeys();
`;