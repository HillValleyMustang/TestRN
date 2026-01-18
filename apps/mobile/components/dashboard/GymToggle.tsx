/**
 * GymToggle Component
 * Allows switching between multiple gyms on dashboard
 * Reference: apps/web/src/components/dashboard/gym-toggle.tsx
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  // Ref to track if we're in the middle of a user-initiated gym change
  const isChangingGymRef = useRef(false);

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

  useEffect(() => {
    // If gyms are provided via props, use them
    if (gyms.length > 0) {
      setLocalGyms(gyms);
      const gymId = activeGym?.id || gyms.find(g => g.is_active)?.id || gyms[0]?.id || null;
      
      // Don't reset activeGymId if we're in the middle of a user-initiated change
      // This prevents the useEffect from undoing the user's selection
      if (!isChangingGymRef.current && gymId && gymId !== activeGymId) {
        console.log('[GymToggle] useEffect: Setting activeGymId to:', gymId, 'from activeGym prop:', activeGym?.id);
        setActiveGymId(gymId);
      }
      setLoading(false);
      setDataLoaded(true);
    } else if (!dataLoaded && !loading) {
      // Fall back to loading from database - load gyms when no props provided
      loadGyms();
    }
  }, [gyms, activeGym, loadGyms, dataLoaded, loading, activeGymId]);

  const handlePrevious = useCallback(async () => {
    console.log('[GymToggle] handlePrevious called');
    const gymsToUse = gyms.length > 0 ? gyms : localGyms;
    console.log('[GymToggle] gymsToUse:', gymsToUse.length, gymsToUse.map(g => ({ id: g.id, name: g.name, is_active: g.is_active })));
    console.log('[GymToggle] activeGym prop:', activeGym?.id, activeGym?.name);
    console.log('[GymToggle] activeGymId state:', activeGymId);
    
    if (!userId || gymsToUse.length === 0) {
      console.log('[GymToggle] Early return - no userId or gyms');
      return;
    }
    
    // Use activeGym prop if available, otherwise use internal state
    const currentGymId = activeGym?.id || activeGymId || gymsToUse.find(g => g.is_active)?.id || gymsToUse[0]?.id;
    console.log('[GymToggle] currentGymId determined:', currentGymId);
    
    if (!currentGymId) {
      console.log('[GymToggle] Early return - no currentGymId');
      return;
    }
    
    // Sort gyms alphabetically for consistent cycling order (independent of active status)
    const sortedGyms = [...gymsToUse].sort((a, b) => a.name.localeCompare(b.name));
    const currentIndex = sortedGyms.findIndex(g => g.id === currentGymId);
    console.log('[GymToggle] currentIndex (alphabetical):', currentIndex, 'in sorted gyms:', sortedGyms.map(g => g.name));
    
    if (currentIndex === -1) {
      console.log('[GymToggle] Early return - currentIndex not found');
      return;
    }
    
    const previousIndex = currentIndex === 0 ? sortedGyms.length - 1 : currentIndex - 1;
    const newGymId = sortedGyms[previousIndex].id;
    const newActiveGym = sortedGyms[previousIndex];
    console.log('[GymToggle] Switching to gym:', newGymId, newActiveGym.name);
    
    // Set flag to prevent useEffect from resetting state during change
    isChangingGymRef.current = true;
    setActiveGymId(newGymId);
    
    try {
      if (onGymChange) {
        console.log('[GymToggle] Calling onGymChange callback');
        await onGymChange(newGymId, newActiveGym);
      } else {
        console.log('[GymToggle] Using setActiveGym from context');
        await setActiveGym(userId, newGymId);
      }
    } catch (error) {
      console.error('[GymToggle] Error setting active gym:', error);
      // Revert state on error
      setActiveGymId(currentGymId);
    } finally {
      // Reset flag after a delay to allow prop updates and data refresh to sync
      // Use a longer delay (500ms) to ensure dashboard refresh completes before allowing useEffect to run
      setTimeout(() => {
        isChangingGymRef.current = false;
      }, 500);
    }
    console.log('[GymToggle] handlePrevious complete');
  }, [gyms, localGyms, userId, activeGym, activeGymId, onGymChange, setActiveGym]);

  const handleNext = useCallback(async () => {
    console.log('[GymToggle] handleNext called');
    const gymsToUse = gyms.length > 0 ? gyms : localGyms;
    console.log('[GymToggle] gymsToUse:', gymsToUse.length, gymsToUse.map(g => ({ id: g.id, name: g.name, is_active: g.is_active })));
    console.log('[GymToggle] activeGym prop:', activeGym?.id, activeGym?.name);
    console.log('[GymToggle] activeGymId state:', activeGymId);
    
    if (!userId || gymsToUse.length === 0) {
      console.log('[GymToggle] Early return - no userId or gyms');
      return;
    }
    
    // Use activeGym prop if available, otherwise use internal state
    const currentGymId = activeGym?.id || activeGymId || gymsToUse.find(g => g.is_active)?.id || gymsToUse[0]?.id;
    console.log('[GymToggle] currentGymId determined:', currentGymId);
    
    if (!currentGymId) {
      console.log('[GymToggle] Early return - no currentGymId');
      return;
    }
    
    // Sort gyms alphabetically for consistent cycling order (independent of active status)
    const sortedGyms = [...gymsToUse].sort((a, b) => a.name.localeCompare(b.name));
    const currentIndex = sortedGyms.findIndex(g => g.id === currentGymId);
    console.log('[GymToggle] currentIndex (alphabetical):', currentIndex, 'in sorted gyms:', sortedGyms.map(g => g.name));
    
    if (currentIndex === -1) {
      console.log('[GymToggle] Early return - currentIndex not found');
      return;
    }
    
    const nextIndex = currentIndex === sortedGyms.length - 1 ? 0 : currentIndex + 1;
    const newGymId = sortedGyms[nextIndex].id;
    const newActiveGym = sortedGyms[nextIndex];
    console.log('[GymToggle] Switching to gym:', newGymId, newActiveGym.name);
    
    // Set flag to prevent useEffect from resetting state during change
    isChangingGymRef.current = true;
    setActiveGymId(newGymId);
    
    try {
      if (onGymChange) {
        console.log('[GymToggle] Calling onGymChange callback');
        await onGymChange(newGymId, newActiveGym);
      } else {
        console.log('[GymToggle] Using setActiveGym from context');
        await setActiveGym(userId, newGymId);
      }
    } catch (error) {
      console.error('[GymToggle] Error setting active gym:', error);
      // Revert state on error
      setActiveGymId(currentGymId);
    } finally {
      // Reset flag after a delay to allow prop updates and data refresh to sync
      // Use a longer delay (500ms) to ensure dashboard refresh completes before allowing useEffect to run
      setTimeout(() => {
        isChangingGymRef.current = false;
      }, 500);
    }
    console.log('[GymToggle] handleNext complete');
  }, [gyms, localGyms, userId, activeGym, activeGymId, onGymChange, setActiveGym]);

  const gymsToUse = gyms.length > 0 ? gyms : localGyms;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cf89fb70-89f1-4c6a-b7b8-8d2defa2257c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GymToggle.tsx:213',message:'GymToggle render check',data:{gymsFromProps:gyms.length,localGymsCount:localGyms.length,gymsToUseCount:gymsToUse.length,loading,willRender:!(loading||gymsToUse.length<=1),gymsToUse:gymsToUse.map(g=>({id:g.id,name:g.name,is_active:g.is_active}))},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  if (loading || gymsToUse.length <= 1) {
    return null;
  }

  // Use activeGym prop if available, otherwise use internal state
  const currentGymId = activeGym?.id || activeGymId || gymsToUse.find(g => g.is_active)?.id || gymsToUse[0]?.id;
  const activeGymObj = activeGym || gymsToUse.find(g => g.id === currentGymId);
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
