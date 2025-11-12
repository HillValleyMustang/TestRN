/**
 * Gym Management Utilities
 * Handles gym creation, capping, and cleanup operations
 */

// Local Gym interface to match existing components
interface Gym {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  equipment: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Constants
export const MAX_GYMS_PER_USER = 3;

/**
 * Check if user has reached the maximum gym limit
 */
export const hasReachedGymLimit = (currentGyms: Gym[]): boolean => {
  return currentGyms.length >= MAX_GYMS_PER_USER;
};

/**
 * Get gyms that should be cleaned up (keep most recent, remove oldest)
 */
export const getGymsToRemove = (allGyms: Gym[], keepCount: number = 1): Gym[] => {
  if (allGyms.length <= keepCount) return [];
  
  // Sort by creation date (newest first), then by updated date
  const sortedGyms = [...allGyms].sort((a, b) => {
    const aCreated = new Date(a.created_at);
    const bCreated = new Date(b.created_at);
    if (aCreated.getTime() !== bCreated.getTime()) {
      return bCreated.getTime() - aCreated.getTime(); // Newest first
    }
    
    const aUpdated = new Date(a.updated_at);
    const bUpdated = new Date(b.updated_at);
    return bUpdated.getTime() - aUpdated.getTime();
  });
  
  // Return gyms to remove (all except the ones to keep)
  return sortedGyms.slice(keepCount);
};

/**
 * Validate gym creation with capping
 */
export const validateGymCreation = (
  currentGyms: Gym[], 
  newGymName: string
): {
  canCreate: boolean;
  gymsToRemove: Gym[];
  errorMessage?: string;
} => {
  if (hasReachedGymLimit(currentGyms)) {
    // At limit - need to remove oldest gyms
    const gymsToRemove = getGymsToRemove(currentGyms, 2); // Keep 2, remove oldest
    
    return {
      canCreate: true, // We can create if we clean up
      gymsToRemove,
      errorMessage: `You've reached the maximum of ${MAX_GYMS_PER_USER} gyms. The oldest gym will be removed to make space.`
    };
  }
  
  return {
    canCreate: true,
    gymsToRemove: []
  };
};

/**
 * Clean up old gyms to make room for new ones
 */
export const cleanupOldGyms = (
  gymsToRemove: Gym[],
  removeGymFn: (gymId: string) => Promise<void>
): Promise<void[]> => {
  if (gymsToRemove.length === 0) {
    return Promise.resolve([]);
  }
  
  console.log('[GymManagement] Cleaning up old gyms:', gymsToRemove.map(g => g.name));
  
  const cleanupPromises = gymsToRemove.map(async (gym) => {
    try {
      await removeGymFn(gym.id);
      console.log('[GymManagement] Removed old gym:', gym.name);
    } catch (error) {
      console.error('[GymManagement] Failed to remove old gym:', gym.name, error);
      throw error;
    }
  });
  
  return Promise.all(cleanupPromises);
};

/**
 * Ensure first gym is set as active if no active gym exists
 */
export const ensureActiveGym = async (
  gyms: Gym[],
  getActiveGymFn: (userId: string) => Promise<Gym | null>,
  setActiveGymFn: (userId: string, gymId: string) => Promise<void>,
  userId: string
): Promise<Gym | null> => {
  if (gyms.length === 0) {
    console.log('[GymManagement] No gyms available to set as active');
    return null;
  }
  
  try {
    const currentActive = await getActiveGymFn(userId);
    
    if (currentActive) {
      console.log('[GymManagement] Active gym already set:', currentActive.name);
      return currentActive;
    }
    
    // No active gym - set the most recently updated gym as active
    const sortedGyms = [...gyms].sort((a, b) => {
      const aUpdated = new Date(a.updated_at);
      const bUpdated = new Date(b.updated_at);
      return bUpdated.getTime() - aUpdated.getTime(); // Most recent first
    });
    
    const gymToSet = sortedGyms[0];
    await setActiveGymFn(userId, gymToSet.id);
    
    console.log('[GymManagement] Set gym as active:', gymToSet.name);
    return gymToSet;
    
  } catch (error) {
    console.error('[GymManagement] Failed to ensure active gym:', error);
    return null;
  }
};

/**
 * Find the most appropriate gym to set as active based on recent usage
 */
export const selectBestActiveGym = (gyms: Gym[]): Gym | null => {
  if (gyms.length === 0) return null;
  
  // Prefer gyms that are already active
  const activeGyms = gyms.filter(gym => gym.is_active);
  if (activeGyms.length > 0) {
    // Return the most recently updated active gym
    return activeGyms.sort((a, b) => {
      const aUpdated = new Date(a.updated_at);
      const bUpdated = new Date(b.updated_at);
      return bUpdated.getTime() - aUpdated.getTime();
    })[0];
  }
  
  // No active gyms - return the most recently updated gym
  return gyms.sort((a, b) => {
    const aUpdated = new Date(a.updated_at);
    const bUpdated = new Date(b.updated_at);
    return bUpdated.getTime() - aUpdated.getTime();
  })[0];
};

/**
 * Clean up all user data including gyms (for incomplete onboarding)
 */
export const cleanupUserGyms = async (
  userId: string,
  getGymsFn: (userId: string) => Promise<Gym[]>,
  deleteGymFn: (gymId: string) => Promise<void>
): Promise<{ success: boolean; removedCount: number; errors: string[] }> => {
  const result = {
    success: true,
    removedCount: 0,
    errors: [] as string[]
  };
  
  try {
    const gyms = await getGymsFn(userId);
    
    if (gyms.length === 0) {
      console.log('[GymManagement] No gyms to clean up for user:', userId);
      return result;
    }
    
    console.log('[GymManagement] Cleaning up', gyms.length, 'gyms for user:', userId);
    
    // Remove all gyms
    for (const gym of gyms) {
      try {
        await deleteGymFn(gym.id);
        result.removedCount++;
        console.log('[GymManagement] Removed gym:', gym.name);
      } catch (error) {
        const errorMsg = `Failed to remove gym ${gym.name}: ${error}`;
        console.error('[GymManagement]', errorMsg);
        result.errors.push(errorMsg);
        result.success = false;
      }
    }
    
    if (result.errors.length === 0) {
      console.log('[GymManagement] Successfully cleaned up all gyms for user');
    } else {
      console.warn('[GymManagement] Some gyms failed to clean up:', result.errors);
    }
    
  } catch (error) {
    const errorMsg = `Failed to load gyms for cleanup: ${error}`;
    console.error('[GymManagement]', errorMsg);
    result.errors.push(errorMsg);
    result.success = false;
  }
  
  return result;
};