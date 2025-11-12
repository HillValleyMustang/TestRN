/**
 * GymToggle Component
 * Allows switching between multiple gyms on dashboard
 * Reference: apps/web/src/components/dashboard/gym-toggle.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { useAuth } from '../../app/_contexts/auth-context';
import { useData } from '../../app/_contexts/data-context';
import type { Gym } from '@data/storage/models';

interface GymToggleProps {
  gyms?: Gym[];
  activeGym?: Gym | null;
  onGymChange?: (gymId: string, newActiveGym: Gym | null) => Promise<void>;
}

export function GymToggle({ gyms = [], activeGym = null, onGymChange }: GymToggleProps = {}) {
  const { userId } = useAuth();
  const { getGyms, getActiveGym, setActiveGym } = useData();
  
  const [localGyms, setLocalGyms] = useState<Gym[]>(gyms);
  const [activeGymId, setActiveGymId] = useState<string | null>(activeGym?.id || null);
  const [loading, setLoading] = useState(gyms.length === 0);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    // If gyms are provided via props, use them
    if (gyms.length > 0) {
      setLocalGyms(gyms);
      const gymId = activeGym?.id || gyms[0]?.id || null;
      if (gymId !== activeGymId) {
        setActiveGymId(gymId);
      }
      setLoading(false);
      setDataLoaded(true);
    } else if (!dataLoaded && !loading) {
      // Fall back to loading from database - load gyms when no props provided
      loadGyms();
    }
  }, [gyms, activeGym, activeGymId, dataLoaded, loading]);

  const loadGyms = useCallback(async () => {
    if (!userId || loading) return;

    try {
      setLoading(true);
      console.log('[GymToggle] Loading gyms for user:', userId);

      const userGyms = await getGyms(userId);
      console.log('[GymToggle] Found gyms:', userGyms.length, userGyms.map(g => ({ id: g.id, name: g.name, is_active: g.is_active })));
      setLocalGyms(userGyms);

      const activeGymData = await getActiveGym(userId);
      console.log('[GymToggle] Active gym data:', activeGymData);
      const targetGymId = activeGymData?.id || (userGyms.length > 0 ? userGyms[0].id : null);
      
      // Only update if the gym ID has actually changed
      if (targetGymId && targetGymId !== activeGymId) {
        console.log('[GymToggle] Setting active gym ID:', targetGymId);
        setActiveGymId(targetGymId);
        
        // If we had to set the first gym as active, persist it
        if (!activeGymData && userGyms.length > 0) {
          console.log('[GymToggle] Persisting first gym as active');
          await setActiveGym(userId, targetGymId);
        }
      }
      
      setDataLoaded(true);
    } catch (error) {
      console.error('[GymToggle] Error loading gyms:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, getGyms, getActiveGym, setActiveGym, activeGymId, loading]);

  const handlePrevious = useCallback(async () => {
    const gymsToUse = gyms.length > 0 ? gyms : localGyms;
    if (!userId || gymsToUse.length === 0 || !activeGymId) return;
    
    const currentIndex = gymsToUse.findIndex(g => g.id === activeGymId);
    if (currentIndex === -1) return;
    
    const previousIndex = currentIndex === 0 ? gymsToUse.length - 1 : currentIndex - 1;
    const newGymId = gymsToUse[previousIndex].id;
    const newActiveGym = gymsToUse[previousIndex];
    
    if (onGymChange) {
      await onGymChange(newGymId, newActiveGym);
    } else {
      try {
        await setActiveGym(userId, newGymId);
      } catch (error) {
        console.error('Error setting active gym:', error);
      }
    }
    setActiveGymId(newGymId);
  }, [gyms, localGyms, userId, activeGymId, onGymChange, setActiveGym]);

  const handleNext = useCallback(async () => {
    const gymsToUse = gyms.length > 0 ? gyms : localGyms;
    if (!userId || gymsToUse.length === 0 || !activeGymId) return;
    
    const currentIndex = gymsToUse.findIndex(g => g.id === activeGymId);
    if (currentIndex === -1) return;
    
    const nextIndex = currentIndex === gymsToUse.length - 1 ? 0 : currentIndex + 1;
    const newGymId = gymsToUse[nextIndex].id;
    const newActiveGym = gymsToUse[nextIndex];
    
    if (onGymChange) {
      await onGymChange(newGymId, newActiveGym);
    } else {
      try {
        await setActiveGym(userId, newGymId);
      } catch (error) {
        console.error('Error setting active gym:', error);
      }
    }
    setActiveGymId(newGymId);
  }, [gyms, localGyms, userId, activeGymId, onGymChange, setActiveGym]);

  const gymsToUse = gyms.length > 0 ? gyms : localGyms;
  if (loading || gymsToUse.length <= 1) {
    return null;
  }

  const activeGymObj = gymsToUse.find(g => g.id === activeGymId);
  const gymName = activeGymObj?.name || 'Select Gym';

  return (
    <Card style={styles.container}>
      <View style={styles.content}>
        <Pressable
          onPress={handlePrevious}
          style={styles.chevronButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.foreground} />
        </Pressable>

        <View style={styles.gymInfo}>
          <Text style={styles.label}>Active Gym</Text>
          <Text style={styles.gymName} numberOfLines={1}>
            {gymName}
          </Text>
        </View>

        <Pressable
          onPress={handleNext}
          style={styles.chevronButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={20} color={Colors.foreground} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.sm,
    minHeight: 50,
    minWidth: 280,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  chevronButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gymInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs / 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
  gymName: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 80,
    maxWidth: 150,
  },
});
