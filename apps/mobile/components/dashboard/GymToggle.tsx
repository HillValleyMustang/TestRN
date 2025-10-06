/**
 * GymToggle Component
 * Allows switching between multiple gyms on dashboard
 * Reference: apps/web/src/components/dashboard/gym-toggle.tsx
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { useAuth } from '../../app/_contexts/auth-context';
import { useData } from '../../app/_contexts/data-context';

interface Gym {
  id: string;
  name: string;
  user_id: string;
}

export function GymToggle() {
  const { userId } = useAuth();
  const { getGyms, getActiveGym, setActiveGym } = useData();
  
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [activeGymId, setActiveGymId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGyms();
  }, [userId]);

  const loadGyms = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      const userGyms = await getGyms(userId);
      setGyms(userGyms);
      
      const activeGym = await getActiveGym(userId);
      if (activeGym?.id) {
        setActiveGymId(activeGym.id);
      } else if (userGyms.length > 0) {
        const firstGymId = userGyms[0].id;
        setActiveGymId(firstGymId);
        await setActiveGym(userId, firstGymId);
      }
    } catch (error) {
      console.error('Error loading gyms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = async () => {
    if (!userId || gyms.length === 0 || !activeGymId) return;
    
    const currentIndex = gyms.findIndex(g => g.id === activeGymId);
    if (currentIndex === -1) return;
    
    const previousIndex = currentIndex === 0 ? gyms.length - 1 : currentIndex - 1;
    const newGymId = gyms[previousIndex].id;
    
    try {
      await setActiveGym(userId, newGymId);
      setActiveGymId(newGymId);
    } catch (error) {
      console.error('Error setting active gym:', error);
    }
  };

  const handleNext = async () => {
    if (!userId || gyms.length === 0 || !activeGymId) return;
    
    const currentIndex = gyms.findIndex(g => g.id === activeGymId);
    if (currentIndex === -1) return;
    
    const nextIndex = currentIndex === gyms.length - 1 ? 0 : currentIndex + 1;
    const newGymId = gyms[nextIndex].id;
    
    try {
      await setActiveGym(userId, newGymId);
      setActiveGymId(newGymId);
    } catch (error) {
      console.error('Error setting active gym:', error);
    }
  };

  if (loading || gyms.length <= 1) {
    return null;
  }

  const activeGym = gyms.find(g => g.id === activeGymId);
  const gymName = activeGym?.name || 'No gym selected';

  return (
    <Card style={styles.container}>
      <View style={styles.content}>
        <Pressable 
          onPress={handlePrevious}
          style={styles.chevronButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
        </Pressable>

        <View style={styles.gymInfo}>
          <View style={styles.labelRow}>
            <Ionicons name="home" size={16} color={Colors.mutedForeground} />
            <Text style={styles.label}>Active Gym</Text>
          </View>
          <Text style={styles.gymName} numberOfLines={1}>
            {gymName}
          </Text>
        </View>

        <Pressable 
          onPress={handleNext}
          style={styles.chevronButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={24} color={Colors.foreground} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  chevronButton: {
    padding: Spacing.xs,
  },
  gymInfo: {
    flex: 1,
    alignItems: 'center',
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
  },
});
