/**
 * Add Gym - Step 3b: Copy from Existing Gym
 * Select source gym to copy exercises from
 * Reference: profile s11 design
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../app/_contexts/auth-context';
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
  sourceGyms: Gym[];
  onBack: () => void;
  onFinish: () => void;
}

export const CopyGymSetupDialog: React.FC<CopyGymSetupDialogProps> = ({
  visible,
  gymId,
  gymName,
  sourceGyms,
  onBack,
  onFinish,
}) => {
  const { supabase } = useAuth();
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [isCopying, setIsCopying] = useState(false);

  const handleCopySetup = async () => {
    if (!selectedSourceId) return;

    setIsCopying(true);
    try {
      // Copy equipment from source gym
      const { data: sourceEquipment } = await supabase
        .from('gym_equipment')
        .select('*')
        .eq('gym_id', selectedSourceId);

      if (sourceEquipment && sourceEquipment.length > 0) {
        const equipmentInserts = sourceEquipment.map((eq) => ({
          gym_id: gymId,
          equipment_type: eq.equipment_type,
          quantity: eq.quantity,
        }));
        await supabase.from('gym_equipment').insert(equipmentInserts);
      }

      // Copy exercises from source gym
      const { data: sourceExercises } = await supabase
        .from('gym_exercises')
        .select('*')
        .eq('gym_id', selectedSourceId);

      if (sourceExercises && sourceExercises.length > 0) {
        const exerciseInserts = sourceExercises.map((ex) => ({
          gym_id: gymId,
          exercise_id: ex.exercise_id,
        }));
        await supabase.from('gym_exercises').insert(exerciseInserts);
      }

      // Copy T-paths (workout programs) from source gym
      const { data: sourceTpaths } = await supabase
        .from('t_paths')
        .select('*')
        .eq('gym_id', selectedSourceId);

      if (sourceTpaths && sourceTpaths.length > 0) {
        const tpathMapping: Record<string, string> = {}; // Old ID -> New ID

        for (const tpath of sourceTpaths) {
          const { data: newTpath } = await supabase
            .from('t_paths')
            .insert({
              user_id: tpath.user_id,
              gym_id: gymId,
              template_name: tpath.template_name,
              is_bonus: tpath.is_bonus,
              settings: tpath.settings,
              progression_settings: tpath.progression_settings,
              parent_t_path_id: null, // Will update after all are inserted
            })
            .select()
            .single();

          if (newTpath) {
            tpathMapping[tpath.id] = newTpath.id;

            // Copy T-path exercises
            const { data: tpathExercises } = await supabase
              .from('t_path_exercises')
              .select('*')
              .eq('template_id', tpath.id);

            if (tpathExercises && tpathExercises.length > 0) {
              const exerciseInserts = tpathExercises.map((ex) => ({
                template_id: newTpath.id,
                exercise_id: ex.exercise_id,
                order_index: ex.order_index,
                is_bonus_exercise: ex.is_bonus_exercise,
              }));
              await supabase.from('t_path_exercises').insert(exerciseInserts);
            }
          }
        }

        // Update parent_t_path_id relationships
        for (const tpath of sourceTpaths) {
          if (tpath.parent_t_path_id && tpathMapping[tpath.parent_t_path_id]) {
            await supabase
              .from('t_paths')
              .update({ parent_t_path_id: tpathMapping[tpath.parent_t_path_id] })
              .eq('id', tpathMapping[tpath.id]);
          }
        }
      }

      onFinish();
    } catch (error) {
      console.error('[CopyGymSetupDialog] Error:', error);
      alert('Failed to copy gym setup. Please try again.');
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
          {sourceGyms.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No other gyms available to copy from.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.gymList} showsVerticalScrollIndicator={false}>
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
                    <Text style={styles.gymOptionDate}>
                      Added: {new Date(gym.created_at).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })}
                    </Text>
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
    flex: 1,
    marginBottom: Spacing.lg,
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
