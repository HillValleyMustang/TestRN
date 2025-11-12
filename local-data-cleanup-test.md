# Local Data Cleanup - Testing Guide

## Problem Solved
The issue was that gyms were persisting locally even after deleting the user from Supabase. This happened because:

1. **Local SQLite Database**: Gyms are stored locally in the app with `user_id` field
2. **No Cleanup on User Change**: When you delete a user from Supabase, local gym data remains
3. **Data Leakage**: New users see gyms from previous users

## Solution Implemented

### 1. Database Cleanup Methods
Added to `apps/mobile/app/_lib/database.ts`:
- `cleanupUserData(userId)`: Cleans all data for a specific user
- `emergencyReset()`: Clears all local data (nuclear option)

### 2. Data Context Integration  
Added to `apps/mobile/app/_contexts/data-context.tsx`:
- `cleanupUserData()`: Public method to trigger cleanup
- `emergencyReset()`: Public method for complete reset

### 3. Automatic User Change Detection
Added to `apps/mobile/app/_contexts/auth-context.tsx`:
- Detects when a different user logs in
- Automatically cleans up previous user's local data
- Prevents data leakage between users

## How to Test

### 1. Manual Testing Steps

**Before the fix (you should see this behavior):**
- Create user, add gyms
- Delete user from Supabase
- Create new user
- **Problem**: Old gyms still appear in new user's profile

**After the fix (expected behavior):**
- Create user, add gyms  
- Delete user from Supabase
- Create new user
- **Fixed**: New user sees clean slate, no old gyms

### 2. Console Commands for Testing

Run these in your React Native console during development:

```javascript
// Check current user
console.log('Current user:', userId);

// Clean up local data for current user
const result = await cleanupUserData(userId);
console.log('Cleanup result:', result);

// Emergency reset (deletes ALL local data)
const resetResult = await emergencyReset();
console.log('Reset result:', resetResult);

// Clear AsyncStorage manually
await AsyncStorage.clear();
console.log('AsyncStorage cleared');

// Check what data exists
const keys = await AsyncStorage.getAllKeys();
console.log('Local storage keys:', keys);

// Check gyms data
const gyms = await getGyms(userId);
console.log('User gyms:', gyms);
```

### 3. Add Test Component (Optional)

You can add a test component to your app:

```jsx
// TestScreen.jsx
import React from 'react';
import { Button, Text } from 'react-native';
import { useData } from './_contexts/data-context';

export function TestScreen() {
  const { userId } = useAuth();
  const { cleanupUserData, emergencyReset } = useData();

  const handleCleanup = async () => {
    if (!userId) return;
    const result = await cleanupUserData(userId);
    console.log('Cleanup result:', result);
    alert('Cleanup completed - check console');
  };

  const handleEmergencyReset = async () => {
    const result = await emergencyReset();
    console.log('Reset result:', result);
    alert('Emergency reset completed - check console');
  };

  return (
    <div>
      <Button title="Clean Up User Data" onPress={handleCleanup} />
      <Button title="Emergency Reset" onPress={handleEmergencyReset} />
    </div>
  );
}
```

## Verification Steps

### 1. Test Automatic Cleanup
1. Delete user from Supabase dashboard
2. Create a new user
3. Check gym section in profile
4. **Expected**: No old gyms, clean slate

### 2. Test Manual Cleanup  
1. Manually call `cleanupUserData(userId)` in console
2. Check that gyms are removed
3. **Expected**: Local gym data is cleared

### 3. Test Emergency Reset
1. Call `emergencyReset()` in console
2. Restart the app
3. **Expected**: Complete fresh start

## Expected Console Output

When user changes, you should see:
```
[Auth] User transition: {from: "old-user-id", to: "new-user-id"}
[Auth] User change detected, cleaning up local data for previous user: old-user-id
[DataContext] Starting cleanup for user: old-user-id
[Database] Cleanup completed for user old-user-id: {success: true, cleanedTables: ["gyms", "workout_sessions", ...]}
[Auth] Local data cleanup completed for previous user
```

## Troubleshooting

### If old gyms still appear:
1. Check console logs for cleanup activity
2. Try manual cleanup: `await cleanupUserData(userId)`
3. Try emergency reset: `await emergencyReset()`
4. Check that user IDs are different when switching users

### If cleanup doesn't trigger:
1. Verify auth context is detecting user changes
2. Check that the new `useData` hook is available
3. Ensure the cleanup function is being called

### Complete reset:
If you need to start completely fresh:
1. Call `emergencyReset()` in console
2. Clear AsyncStorage: `await AsyncStorage.clear()`
3. Restart the app
4. Delete user from Supabase and create new one

## Files Modified

1. **apps/mobile/app/_lib/database.ts**
   - Added `cleanupUserData()` method
   - Added `emergencyReset()` method

2. **apps/mobile/app/_contexts/data-context.tsx** 
   - Added cleanup methods to context interface
   - Implemented cleanup functions

3. **apps/mobile/app/_contexts/auth-context.tsx**
   - Added user change detection
   - Automatic cleanup trigger

This solution ensures that when you delete a user from Supabase and create a new one, the new user gets a completely clean slate without any ghost data from previous users.