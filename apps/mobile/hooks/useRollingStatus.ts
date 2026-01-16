/**
 * useRollingStatus Hook
 * Shared logic for fetching and managing rolling workout status
 * Used by both RollingStatusBadge and DashboardHeader
 */

import { useState, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../app/_contexts/auth-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Theme';

export type WorkoutStatus = 'Getting into it' | 'Building Momentum' | 'In the Zone' | 'On Fire' | 'Offline';

export type TempStatusMessageType = 'success' | 'error' | 'added' | 'removed';

export interface TempStatusMessage {
  message: string;
  type: TempStatusMessageType;
}

export interface StatusConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
  description: string;
}

export const STATUS_CONFIG: Record<WorkoutStatus, StatusConfig> = {
  'Getting into it': {
    icon: 'barbell',
    color: Colors.mutedForeground,
    backgroundColor: Colors.muted,
    description: "You're just getting started or have had a break. Keep it up!",
  },
  'Building Momentum': {
    icon: 'checkmark-circle',
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    description: "You've been working out consistently for 1-3 weeks.",
  },
  'In the Zone': {
    icon: 'flame',
    color: '#f97316',
    backgroundColor: '#ffedd5',
    description: "You've maintained your workout habit for 4-7 weeks.",
  },
  'On Fire': {
    icon: 'flame',
    color: '#ef4444',
    backgroundColor: '#fee2e2',
    description: "Incredible consistency! You've been working out for 8+ weeks straight.",
  },
  'Offline': {
    icon: 'cloud-offline',
    color: '#ef4444',
    backgroundColor: '#fee2e2',
    description: 'Your progress is being saved locally and will sync when you reconnect.',
  },
};

// Temporary status configs for temporary messages
export const TEMP_STATUS_CONFIG: Record<TempStatusMessageType, StatusConfig> = {
  success: {
    icon: 'checkmark-circle',
    color: 'white',
    backgroundColor: '#22C55E',
    description: 'Success message',
  },
  error: {
    icon: 'alert-circle',
    color: 'white',
    backgroundColor: '#ef4444',
    description: 'Error message',
  },
  added: {
    icon: 'checkmark-circle',
    color: 'white',
    backgroundColor: '#22C55E',
    description: 'Item added',
  },
  removed: {
    icon: 'close-circle',
    color: 'white',
    backgroundColor: '#ef4444',
    description: 'Item removed',
  },
};

// Config for "Updating Plan..." status
export const UPDATING_PLAN_CONFIG: StatusConfig = {
  icon: 'sync',
  color: '#1D4ED8',
  backgroundColor: '#DBEAFE',
  description: 'AI is generating your personalized workout program.',
};

// Config for "Syncing" status
export const SYNCING_CONFIG: StatusConfig = {
  icon: 'sync',
  color: '#1D4ED8',
  backgroundColor: '#DBEAFE',
  description: 'Syncing your workout data...',
};

const isValidStatus = (status: string): boolean => {
  return ['Getting into it', 'Building Momentum', 'In the Zone', 'On Fire'].includes(status);
};

export interface UseRollingStatusProps {
  tempStatusMessage?: TempStatusMessage | null;
  isGeneratingPlan?: boolean;
  isSyncing?: boolean;
}

export function useRollingStatus(props?: UseRollingStatusProps) {
  const { tempStatusMessage = null, isGeneratingPlan = false, isSyncing = false } = props || {};
  const { userId, supabase } = useAuth();
  const [status, setStatus] = useState<WorkoutStatus>('Getting into it');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  
  // Stable sync state that doesn't flicker - only becomes false after consistent inactivity
  const stableSyncRef = useRef<boolean>(false);
  const stableSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [stableIsSyncing, setStableIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setStatus('Offline');
      setLoading(false);
      return;
    }

    if (userId && supabase) {
      fetchStatus();
    } else {
      setLoading(false);
    }
  }, [userId, isOnline, supabase]);

  // Stabilize sync state to prevent flickering
  useEffect(() => {
    if (isSyncing) {
      // Sync is active - set stable state immediately
      if (!stableSyncRef.current) {
        stableSyncRef.current = true;
        setStableIsSyncing(true);
        console.log('[useRollingStatus] Sync started - showing "Syncing" badge');
      }
      // Clear any inactive timeout since sync is active
      if (stableSyncTimeoutRef.current) {
        clearTimeout(stableSyncTimeoutRef.current);
        stableSyncTimeoutRef.current = null;
      }
    } else {
      // Sync became inactive - if we were showing stable sync state, wait before clearing it
      if (stableSyncRef.current && !stableSyncTimeoutRef.current) {
        // Wait before clearing stable state to prevent flickering
        stableSyncTimeoutRef.current = setTimeout(() => {
          // Only clear if sync is still inactive (check the current prop value via the effect dependency)
          // But since this timeout runs after the effect, we need to check via a different mechanism
          // For now, just clear it - if sync restarted, the effect will have already set it back to true
          stableSyncRef.current = false;
          setStableIsSyncing(false);
          console.log('[useRollingStatus] Sync completed - clearing "Syncing" badge');
          stableSyncTimeoutRef.current = null;
        }, 1000); // Wait 1 second to ensure sync is truly done
      } else if (!stableSyncRef.current) {
        // Sync is inactive and we haven't set stable state - make sure it's false
        setStableIsSyncing(false);
      }
    }
    
    return () => {
      if (stableSyncTimeoutRef.current) {
        clearTimeout(stableSyncTimeoutRef.current);
      }
    };
  }, [isSyncing]);

  const fetchStatus = async () => {
    if (!userId || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('rolling_workout_status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching rolling status:', error);
        setStatus('Getting into it');
      } else if (profileData?.rolling_workout_status) {
        const dbStatus = profileData.rolling_workout_status;
        
        if (dbStatus === 'Ready to Start') {
          setStatus('Getting into it');
        } else if (isValidStatus(dbStatus)) {
          setStatus(dbStatus as WorkoutStatus);
        } else {
          setStatus('Getting into it');
        }
      } else {
        setStatus('Getting into it');
      }
    } catch (error) {
      console.error('Error fetching rolling status:', error);
      setStatus('Getting into it');
    } finally {
      setLoading(false);
    }
  };

  // Priority-based status display:
  // 1. tempStatusMessage (highest priority)
  // 2. isSyncing
  // 3. isGeneratingPlan
  // 4. loading
  // 5. !isOnline
  // 6. Normal rolling status (lowest priority)

  let displayStatus: string;
  let displayConfig: StatusConfig;

  if (tempStatusMessage) {
    // Show temporary message (highest priority)
    displayStatus = tempStatusMessage.message;
    displayConfig = TEMP_STATUS_CONFIG[tempStatusMessage.type];
  } else if (stableIsSyncing) {
    // Show "Syncing" status using stable state to prevent flickering
    displayStatus = 'Syncing';
    displayConfig = SYNCING_CONFIG;
  } else if (isGeneratingPlan) {
    // Show "Updating Plan..."
    displayStatus = 'Updating Plan...';
    displayConfig = UPDATING_PLAN_CONFIG;
  } else if (loading) {
    // Show loading state (keep existing behavior)
    displayStatus = status;
    displayConfig = STATUS_CONFIG[status];
  } else if (!isOnline) {
    // Show offline status
    displayStatus = 'Offline';
    displayConfig = STATUS_CONFIG['Offline'];
  } else {
    // Show normal rolling status
    displayStatus = status;
    displayConfig = STATUS_CONFIG[status];
  }

  return {
    status: displayStatus,
    loading,
    isOnline,
    config: displayConfig,
    refetch: fetchStatus,
    actualStatus: status, // Keep track of actual rolling status
  };
}
