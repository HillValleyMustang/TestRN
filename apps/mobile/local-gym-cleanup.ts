/**
 * Local Gym Cleanup Script
 * Helps clean up gyms that exceed the MAX_GYMS_PER_USER limit
 * Run this in development to fix existing users with too many gyms
 */

import { useData } from './app/_contexts/data-context';

// Run this to check and clean up gyms for a specific user
export const cleanupUserGyms = async (userId: string) => {
  const { getGyms, deleteGym } = useData();
  
  console.log('🏋️ [GymCleanup] Starting gym cleanup for user:', userId);
  
  try {
    // Get all gyms for the user
    const gyms = await getGyms(userId);
    console.log('📊 [GymCleanup] Found gyms:', gyms.map(g => ({ id: g.id, name: g.name, is_active: g.is_active })));
    
    if (gyms.length <= 3) {
      console.log('✅ [GymCleanup] User is within gym limit (3), no cleanup needed');
      return { success: true, removed: 0, reason: 'Within limit' };
    }
    
    // Sort gyms by most recent first, keeping active gyms
    const sortedGyms = gyms.sort((a, b) => {
      // Prioritize active gyms
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      
      // Then sort by update time (newest first)
      const aUpdated = new Date(a.updated_at);
      const bUpdated = new Date(b.updated_at);
      return bUpdated.getTime() - aUpdated.getTime();
    });
    
    // Keep the 3 most recent gyms (or keep active ones)
    const gymsToRemove = sortedGyms.slice(3);
    
    if (gymsToRemove.length === 0) {
      console.log('✅ [GymCleanup] All gyms are within the 3 most recent, no cleanup needed');
      return { success: true, removed: 0, reason: 'No excess gyms' };
    }
    
    console.log('🗑️ [GymCleanup] Removing gyms:', gymsToRemove.map(g => g.name));
    
    // Remove excess gyms
    let removedCount = 0;
    const errors: string[] = [];
    
    for (const gym of gymsToRemove) {
      try {
        await deleteGym(gym.id);
        removedCount++;
        console.log('✅ [GymCleanup] Removed gym:', gym.name);
      } catch (error) {
        const errorMsg = `Failed to remove gym ${gym.name}: ${error}`;
        console.error('❌ [GymCleanup]', errorMsg);
        errors.push(errorMsg);
      }
    }
    
    const result = {
      success: errors.length === 0,
      removed: removedCount,
      errors,
      totalBefore: gyms.length,
      totalAfter: gyms.length - removedCount
    };
    
    console.log('📈 [GymCleanup] Cleanup complete:', result);
    return result;
    
  } catch (error) {
    console.error('❌ [GymCleanup] Failed to cleanup gyms:', error);
    return { success: false, removed: 0, errors: [error.toString()] };
  }
};

// Batch cleanup for multiple users
export const batchCleanupGyms = async (userIds: string[]) => {
  console.log('🚀 [GymCleanup] Starting batch cleanup for users:', userIds.length);
  
  const results = await Promise.allSettled(
    userIds.map(userId => cleanupUserGyms(userId))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
  const failed = results.filter(r => r.status === 'rejected' || !r.value.success);
  
  const summary = {
    total: userIds.length,
    successful: successful.length,
    failed: failed.length,
    totalRemoved: successful.reduce((sum, r) => sum + r.value.removed, 0)
  };
  
  console.log('📊 [GymCleanup] Batch cleanup summary:', summary);
  return summary;
};

// Find users with too many gyms (run this first to see who needs cleanup)
export const findUsersWithExcessGyms = async (gymService: any) => {
  console.log('🔍 [GymCleanup] Finding users with excess gyms...');
  
  // This would need to be implemented based on your database structure
  // For now, return empty array - implement based on your backend
  return [];
};