/**
 * useRollingStatus Hook
 * Shared logic for fetching and managing rolling workout status
 * Used by both RollingStatusBadge and DashboardHeader
 */

import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../app/_contexts/auth-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Theme';

export type WorkoutStatus = 'Getting into it' | 'Building Momentum' | 'In the Zone' | 'On Fire' | 'Offline';

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

const isValidStatus = (status: string): boolean => {
  return ['Getting into it', 'Building Momentum', 'In the Zone', 'On Fire'].includes(status);
};

export function useRollingStatus() {
  const { userId, supabase } = useAuth();
  const [status, setStatus] = useState<WorkoutStatus>('Getting into it');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

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

  const config = STATUS_CONFIG[status];

  return {
    status,
    loading,
    isOnline,
    config,
    refetch: fetchStatus,
  };
}
