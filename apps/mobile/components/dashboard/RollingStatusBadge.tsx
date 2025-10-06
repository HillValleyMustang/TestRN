/**
 * RollingStatusBadge Component
 * Displays user's workout consistency status
 * Reference: apps/web/src/components/layout/rolling-status-badge.tsx
 * 
 * Status States:
 * - Getting into it: 0-7 days consecutive
 * - Building Momentum: 1-3 weeks (8-21 days)
 * - In the Zone: 4-7 weeks (22-49 days)
 * - On Fire: 8+ weeks (50+ days)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { Card } from '../ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { useAuth } from '../../app/_contexts/auth-context';

type WorkoutStatus = 'Getting into it' | 'Building Momentum' | 'In the Zone' | 'On Fire' | 'Offline';

interface StatusConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
  description: string;
}

const STATUS_CONFIG: Record<WorkoutStatus, StatusConfig> = {
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

interface RollingStatusBadgeProps {
  onPress?: () => void;
}

export function RollingStatusBadge({ onPress }: RollingStatusBadgeProps) {
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

    fetchStatus();
  }, [userId, isOnline]);

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

  const isValidStatus = (status: string): boolean => {
    return ['Getting into it', 'Building Momentum', 'In the Zone', 'On Fire'].includes(status);
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      showStatusInfo();
    }
  };

  const showStatusInfo = () => {
    const statusTexts = [
      '🏋️ Getting into it\nYou\'re just getting started or have had a break of more than a week. Keep it up!',
      '\n✓ Building Momentum\nYou\'ve been working out consistently for 1-3 weeks.',
      '\n🔥 In the Zone\nYou\'ve maintained your workout habit for 4-7 consecutive weeks.',
      '\n🔥 On Fire\nIncredible consistency! You\'ve been working out for 8+ weeks straight.',
      '\n📡 Offline\nYou are currently offline. Your progress is being saved locally and will sync when you reconnect.',
    ].join('\n\n');

    Alert.alert('Workout Status Explained', statusTexts);
  };

  if (loading) {
    return (
      <Card style={styles.container}>
        <View style={styles.badge}>
          <Ionicons name="ellipsis-horizontal" size={16} color={Colors.mutedForeground} />
          <Text style={styles.statusText}>Loading...</Text>
        </View>
      </Card>
    );
  }

  const config = STATUS_CONFIG[status];

  return (
    <Pressable onPress={handlePress}>
      <Card style={styles.container}>
        <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
          <Ionicons name={config.icon} size={16} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>{status}</Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {config.description}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  statusText: {
    ...TextStyles.caption,
    fontWeight: '600',
  },
  description: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
});
