/**
 * Loading Timeout Debug Script
 * 
 * This script provides debugging for the loading timeout fix that prevents
 * infinite loading states after workout deletion.
 */

// Test loading timeout behavior
export const testLoadingTimeoutBehavior = {
  name: "Loading Timeout Behavior Test",
  description: "Tests that the dashboard doesn't get stuck in infinite loading after deletion",
  
  steps: [
    "1. Load dashboard and verify normal operation",
    "2. Open browser console and clear logs",
    "3. Navigate to workout history",
    "4. Delete a workout",
    "5. Return to dashboard",
    "6. Monitor console for loading timeout logs",
    "7. Verify dashboard renders within 15 seconds even if stuck"
  ],
  
  expectedConsoleOutput: [
    "✅ '[Dashboard] Started tracking loading time: [timestamp]'",
    "✅ '[Dashboard] Profile loading or data fetching...' with loadingDuration",
    "✅ '[Dashboard] Forcing render with cached data: { loadingTimeout: false/true }'",
    "✅ Dashboard renders without infinite loading"
  ],
  
  timeoutConditions: {
    normalCase: "Dashboard loads within 5-10 seconds, no timeout needed",
    stuckCase: "If loading > 15 seconds, timeout triggers and renders with cached/empty data",
    deletionCase: "After deletion, loading timeout should not interfere with normal refresh"
  }
};

// Test deletion with loading timeout interaction
export const testDeletionWithLoadingTimeout = {
  name: "Deletion with Loading Timeout Test",
  description: "Tests that deletion properly resets loading timeout and refreshes data",
  
  steps: [
    "1. Start with dashboard loaded and working",
    "2. Begin deletion process",
    "3. Monitor loadingStartTimeRef.current reset",
    "4. Verify deletion timestamp is set",
    "5. Check that cache bypass works within timeout period",
    "6. Confirm dashboard renders with updated data"
  ],
  
  expectedBehavior: [
    "✅ Loading timeout reset when deletion starts",
    "✅ Deletion timestamp triggers cache bypass",
    "✅ Fresh data loaded within timeout period",
    "✅ No infinite loading state",
    "✅ Dashboard shows updated data after deletion"
  ],
  
  debugCommands: {
    checkLoadingTimeout: "console.log('Loading timeout state:', { startTime: loadingStartTimeRef.current, duration: Date.now() - loadingStartTimeRef.current, timeout: 15000 });",
    checkDeletionTimeout: "console.log('Deletion timeout state:', { deletionTime: lastDeletionTimeRef.current, timeSince: Date.now() - lastDeletionTimeRef.current, bypassWindow: 10000 });",
    forceTimeout: "loadingStartTimeRef.current = Date.now() - 16000; // Force timeout condition"
  }
};

// Test cache fallback behavior
export const testCacheFallbackBehavior = {
  name: "Cache Fallback Behavior Test",
  description: "Tests that cached data is used when loading takes too long",
  
  steps: [
    "1. Load dashboard and note cached data state",
    "2. Simulate slow loading condition",
    "3. Check that renderDashboardWithData is called",
    "4. Verify cached data is properly displayed",
    "5. Confirm user can interact with dashboard"
  ],
  
  expectedFallbackData: {
    profile: "User profile information from cache",
    gyms: "Gym list and active gym from cache", 
    weeklySummary: "Weekly workout summary from cache",
    volumeHistory: "Volume chart data from cache",
    recentWorkouts: "Recent workouts list from cache",
    nextWorkout: "Next workout suggestion from cache"
  },
  
  debugCommands: {
    checkCacheData: "console.log('Cached data available:', { hasCache: !!dataCache.data, cacheKeys: Object.keys(dataCache.data || {}) });",
    simulateSlowLoad: "loadingStartTimeRef.current = Date.now() - 16000; // Force 16 second load",
    checkRenderFallback: "console.log('Render fallback triggered, checking cache...');"
  }
};

// Comprehensive loading state debug
export const debugLoadingTimeoutState = {
  name: "Debug Loading Timeout State",
  description: "Comprehensive debugging for all loading timeout related state",
  
  functions: {
    checkAllLoadingState: () => {
      console.log("⏱️  LOADING TIMEOUT STATE DEBUG");
      console.log("================================");
      console.log("Loading timeout refs:", {
        loadingStartTime: loadingStartTimeRef.current,
        lastDeletionTime: lastDeletionTimeRef.current,
        currentTime: Date.now()
      });
      console.log("Loading durations:", {
        loadingDuration: loadingStartTimeRef.current > 0 ? Date.now() - loadingStartTimeRef.current : 0,
        deletionDuration: lastDeletionTimeRef.current > 0 ? Date.now() - lastDeletionTimeRef.current : 0,
        timeoutLimit: 15000,
        deletionBypassWindow: 10000
      });
      console.log("Timeout conditions:", {
        hasLoadingTimeout: loadingStartTimeRef.current > 0 && (Date.now() - loadingStartTimeRef.current) > 15000,
        hasDeletionBypass: lastDeletionTimeRef.current > 0 && (Date.now() - lastDeletionTimeRef.current) < 10000,
        shouldForceRender: (loadingStartTimeRef.current > 0 && (Date.now() - loadingStartTimeRef.current) > 15000) || (dataCache.data && loading)
      });
      console.log("Current state:", {
        loading,
        hasUserProfile: !!userProfile,
        hasCachedData: !!dataCache.data,
        authLoading,
        hasSession: !!session,
        hasUserId: !!userId
      });
    },
    
    forceLoadingTimeout: () => {
      console.log("🔧 FORCING LOADING TIMEOUT");
      console.log("===========================");
      loadingStartTimeRef.current = Date.now() - 16000;
      console.log("Set loading start time to 16 seconds ago");
      console.log("This should trigger timeout on next render");
    },
    
    resetAllTimeouts: () => {
      console.log("🔄 RESETTING ALL TIMEOUTS");
      console.log("===========================");
      loadingStartTimeRef.current = 0;
      lastDeletionTimeRef.current = 0;
      console.log("All timeout refs reset to 0");
    },
    
    simulateDeletionScenario: () => {
      console.log("🧪 SIMULATING DELETION SCENARIO");
      console.log("=================================");
      // Set up deletion scenario
      lastDeletionTimeRef.current = Date.now();
      loadingStartTimeRef.current = 0; // Reset loading timeout
      setDataCache({ lastFetch: 0, data: null }); // Clear cache
      setRecentWorkouts([]); // Clear recent workouts
      
      console.log("Deletion scenario setup complete:");
      console.log("- Deletion timestamp set");
      console.log("- Loading timeout reset"); 
      console.log("- Cache cleared");
      console.log("- Recent workouts cleared");
      console.log("This should trigger cache bypass and fresh data load");
    }
  }
};

// Test runner
export const runLoadingTimeoutTests = () => {
  console.log("⏱️  LOADING TIMEOUT DEBUG SUITE");
  console.log("================================");
  console.log("");
  
  console.log("🧪 Test Scenarios:");
  console.log("1. Loading Timeout Behavior");
  console.log("2. Deletion with Loading Timeout");
  console.log("3. Cache Fallback Behavior");
  console.log("");
  
  console.log("🔧 Debug Functions:");
  console.log("• debugLoadingTimeoutState.checkAllLoadingState()");
  console.log("• debugLoadingTimeoutState.forceLoadingTimeout()");
  console.log("• debugLoadingTimeoutState.resetAllTimeouts()");
  console.log("• debugLoadingTimeoutState.simulateDeletionScenario()");
  console.log("");
  
  console.log("💡 Usage Instructions:");
  console.log("1. Load the app and navigate to dashboard");
  console.log("2. Open browser console");
  console.log("3. Run: debugLoadingTimeoutState.checkAllLoadingState()");
  console.log("4. Delete a workout and monitor console");
  console.log("5. Verify dashboard doesn't get stuck in loading");
  console.log("6. If needed, test timeout with: debugLoadingTimeoutState.forceLoadingTimeout()");
  console.log("");
  
  console.log("🎯 Success Criteria:");
  console.log("✅ Dashboard never shows infinite loading (> 15 seconds)");
  console.log("✅ Cache fallback renders when timeout occurs");
  console.log("✅ Deletion properly resets timeout and refreshes data");
  console.log("✅ User can always interact with dashboard (cached data if needed)");
  console.log("✅ No blank/empty dashboard states");
};

// Auto-run setup
if (typeof window !== 'undefined') {
  console.log("Loading Timeout Debug Suite Loaded");
  console.log("Run runLoadingTimeoutTests() to see all test scenarios");
}

export default {
  testLoadingTimeoutBehavior,
  testDeletionWithLoadingTimeout,
  testCacheFallbackBehavior,
  debugLoadingTimeoutState,
  runLoadingTimeoutTests
};