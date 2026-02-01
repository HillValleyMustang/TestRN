/**
 * Add Gym - Step 3b: Copy from Existing Gym
 * Select source gym to copy exercises from
 * Reference: profile s11 design
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../app/_contexts/auth-context';
import { useData } from '../../app/_contexts/data-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface Gym {
  id: string;
  name: string;
  created_at: string;
}

interface CopyGymSetupDialogProps {
  visible: boolean;
  gymId: string;
  gymName: string;
  sourceGyms?: Gym[]; // Made optional since we'll fetch directly
  onBack: () => void;
  onFinish: () => void;
}

export const CopyGymSetupDialog: React.FC<CopyGymSetupDialogProps> = ({
  visible,
  gymId,
  gymName,
  sourceGyms: propSourceGyms, // Renamed to avoid confusion
  onBack,
  onFinish,
}) => {
  const { supabase, userId } = useAuth();
  const { forceRefreshProfile, loadDashboardSnapshot } = useData();
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [isCopying, setIsCopying] = useState(false);
  const [availableGyms, setAvailableGyms] = useState<Gym[]>([]);
  const [isLoadingGyms, setIsLoadingGyms] = useState(false);

  // Fetch gyms directly from database when dialog opens
  useEffect(() => {
    console.log('[CopyGymSetupDialog] visibility check:', { visible, userId, gymId });
    if (visible && userId) {
      const fetchGyms = async () => {
        setIsLoadingGyms(true);
        try {
          console.log('[CopyGymSetupDialog] Fetching gyms from database for user:', userId);
          const { data, error } = await supabase
            .from('gyms')
            .select('id, name, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

          if (error) {
            console.error('[CopyGymSetupDialog] Error fetching gyms:', error);
            setAvailableGyms([]);
            return;
          }

          if (data && data.length > 0) {
            // Sort by created_at to identify the newest gym (the one just created)
            const sortedGyms = [...data].sort((a, b) => {
              const timeA = new Date(a.created_at).getTime();
              const timeB = new Date(b.created_at).getTime();
              return timeA - timeB;
            });

            // If only one gym exists, allow copying from it (user has no other choice)
            // Otherwise, exclude the newest gym to avoid copying from the one being set up.
            const filteredGyms =
              sortedGyms.length <= 1 ? sortedGyms : sortedGyms.slice(0, -1);

            console.log(
              '[CopyGymSetupDialog] Found',
              data.length,
              'total gyms,',
              filteredGyms.length,
              'available after filtering'
            );
            console.log('[CopyGymSetupDialog] Raw gyms (id/name/created_at):', data);
            console.log('[CopyGymSetupDialog] Sorted gyms (oldest->newest):', sortedGyms);
            console.log('[CopyGymSetupDialog] Available gym IDs:', filteredGyms.map(g => g.id));
            console.log('[CopyGymSetupDialog] Current gym ID (for reference):', gymId);
            setAvailableGyms(filteredGyms);
          } else {
            setAvailableGyms([]);
          }
        } catch (error) {
          console.error('[CopyGymSetupDialog] Exception fetching gyms:', error);
          setAvailableGyms([]);
        } finally {
          setIsLoadingGyms(false);
        }
      };

      fetchGyms();
    } else if (!visible) {
      // Reset state when dialog closes
      setSelectedSourceId('');
      setAvailableGyms([]);
    }
  }, [visible, userId, gymId, supabase]);

  // Use fetched gyms, fallback to prop if provided (for backwards compatibility)
  const sourceGyms = availableGyms.length > 0 ? availableGyms : (propSourceGyms || []);

  const handleCopySetup = async () => {
    if (!selectedSourceId) return;

    setIsCopying(true);
    try {
      console.log('[CopyGymSetupDialog] Starting copy from', selectedSourceId, 'to', gymId);
      
      let copiedEquipmentCount = 0;
      let copiedExercisePoolCount = 0;

      // 1. Copy equipment from source gym
      const { data: sourceEquipment } = await supabase
        .from('gym_equipment')
        .select('*')
        .eq('gym_id', selectedSourceId);

      if (sourceEquipment && sourceEquipment.length > 0) {
        console.log('[CopyGymSetupDialog] Copying', sourceEquipment.length, 'equipment items');
        const equipmentInserts = sourceEquipment.map((eq) => ({
          gym_id: gymId,
          equipment_type: eq.equipment_type,
          quantity: eq.quantity,
        }));
        await supabase.from('gym_equipment').insert(equipmentInserts);
        copiedEquipmentCount = sourceEquipment.length;
      }

      // 2. Copy gym-specific exercises list (pool of exercises)
      const { data: sourceGymExercises } = await supabase
        .from('gym_exercises')
        .select('*')
        .eq('gym_id', selectedSourceId);

      if (sourceGymExercises && sourceGymExercises.length > 0) {
        console.log('[CopyGymSetupDialog] Copying', sourceGymExercises.length, 'gym exercises');
        const exerciseInserts = sourceGymExercises.map((ex) => ({
          gym_id: gymId,
          exercise_id: ex.exercise_id,
        }));
        await supabase.from('gym_exercises').insert(exerciseInserts);
        copiedExercisePoolCount = sourceGymExercises.length;
      }

      // 3. Call edge function to handle T-path (workout plan) copying
      // This is much safer as it handles hierarchies and associations correctly
      console.log('[CopyGymSetupDialog] Calling copy-gym-setup edge function');
      let copiedWorkoutCount = 0;
      let workoutExerciseCount = 0;

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const response = await fetch(
          'https://mgbfevrzrbjjiajkqpti.supabase.co/functions/v1/copy-gym-setup',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionData.session?.access_token}`,
            },
            body: JSON.stringify({
              sourceGymId: selectedSourceId,
              targetGymId: gymId,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          // If the error is just that there are no workouts, we can ignore it as we've already copied equipment
          if (errorData.error && errorData.error.includes("does not have any workouts to copy")) {
            console.warn('[CopyGymSetupDialog] Source gym has no workouts to copy, but equipment/exercises were copied');
          } else {
            throw new Error(errorData.error || 'Edge function failed');
          }
        } else {
          const result = await response.json();
          copiedWorkoutCount = result.workoutCount || 0;
          workoutExerciseCount = result.exerciseCount || 0;
        }
      } catch (edgeError) {
        console.warn('[CopyGymSetupDialog] Edge function failed or timed out:', edgeError);
        // We don't want to fail the whole process if only T-paths failed to copy
        // but equipment/exercises were successful.
      }

      console.log('[CopyGymSetupDialog] Copy completed successfully');
      
      // CRITICAL: Sync local database with Supabase to ensure new gym data is available
      // loadDashboardSnapshot syncs gyms from Supabase to local SQLite, which workout page reads from
      console.log('[CopyGymSetupDialog] Syncing data from Supabase to local database...');
      // loadDashboardSnapshot pulls gyms from Supabase and writes them to local SQLite
      // This is what makes the gym switcher appear on the Workout page
      await loadDashboardSnapshot();
      
      // Also trigger forceRefresh to notify other components
      await forceRefreshProfile();
      console.log('[CopyGymSetupDialog] Data sync completed');
      
      // Show confirmation toast with the correct exercise count
      // workoutExerciseCount = total exercises across all workouts (e.g., 24 exercises in 4 workouts)
      // copiedExercisePoolCount = gym exercise pool size (e.g., 1 unique exercise definition)
      Toast.show({
        type: 'success',
        text1: 'Gym Setup Copied!',
        text2: `Copied ${copiedWorkoutCount} workout plans with ${workoutExerciseCount} total exercises.`,
        position: 'bottom',
        visibilityTime: 4000,
      });

      onFinish();
    } catch (error) {
      console.error('[CopyGymSetupDialog] Error:', error);
      alert('Failed to copy gym setup: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onBack}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onBack}
            disabled={isCopying}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.title}>Copy Setup to "{gymName}"</Text>
          <Text style={styles.description}>
            Select an existing gym to copy its exercise list from.
          </Text>
          {/* Source Gym Picker */}
          {isLoadingGyms ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading gyms...</Text>
            </View>
          ) : sourceGyms.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No other gyms available to copy from.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.gymList}
              contentContainerStyle={styles.gymListContent}
              showsVerticalScrollIndicator={false}
            >
              {sourceGyms.map((gym) => (
                <TouchableOpacity
                  key={gym.id}
                  style={[
                    styles.gymOption,
                    selectedSourceId === gym.id && styles.gymOptionSelected,
                  ]}
                  onPress={() => setSelectedSourceId(gym.id)}
                >
                  <View style={styles.gymOptionContent}>
                    <Text style={styles.gymOptionName}>{gym.name}</Text>
                    {gym.created_at && (
                      <Text style={styles.gymOptionDate}>
                        Added: {new Date(gym.created_at).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })}
                      </Text>
                    )}
                  </View>
                  {selectedSourceId === gym.id && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.blue600} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onBack}
              disabled={isCopying}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.copyButton,
                (!selectedSourceId || isCopying) && styles.copyButtonDisabled,
              ]}
              onPress={handleCopySetup}
              disabled={!selectedSourceId || isCopying}
            >
              {isCopying ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.copyButtonText}>Copy Setup</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.mutedForeground,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  gymList: {
    maxHeight: 240,
    minHeight: 72,
    marginBottom: Spacing.lg,
  },
  gymListContent: {
    paddingBottom: Spacing.sm,
  },
  gymOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  gymOptionSelected: {
    borderColor: Colors.blue600,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  gymOptionContent: {
    flex: 1,
  },
  gymOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 2,
  },
  gymOptionDate: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  loadingState: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: Colors.muted,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  copyButton: {
    backgroundColor: Colors.gray900,
  },
  copyButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
