import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../app/_contexts/auth-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { FetchedExerciseDefinition } from '../../../../packages/data/src/types/exercise';
import { Button } from '../../app/_components/ui/Button';

interface ManageGymsModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: FetchedExerciseDefinition | null;
  userGyms: any[]; // TODO: Define proper type
  initialSelectedGymIds: Set<string>;
  onSaveSuccess: () => void;
}

export const ManageGymsModal: React.FC<ManageGymsModalProps> = ({
  visible,
  onClose,
  exercise,
  userGyms,
  initialSelectedGymIds,
  onSaveSuccess,
}) => {
  const { userId, supabase } = useAuth();
  const [selectedGymIds, setSelectedGymIds] = useState<Set<string>>(initialSelectedGymIds);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedGymIds(initialSelectedGymIds);
  }, [initialSelectedGymIds, visible]);

  const handleToggleGym = (gymId: string) => {
    setSelectedGymIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gymId)) {
        newSet.delete(gymId);
      } else {
        newSet.add(gymId);
      }
      return newSet;
    });
  };

  const handleSaveChanges = async () => {
    if (!userId || !exercise?.id) {
      Alert.alert('Error', 'Unable to save changes. Please try again.');
      return;
    }

    setIsSaving(true);

    const gymsToAdd = [...selectedGymIds].filter(id => !initialSelectedGymIds.has(id));
    const gymsToRemove = [...initialSelectedGymIds].filter(id => !selectedGymIds.has(id));

    try {
      if (gymsToRemove.length > 0) {
        const { error } = await supabase
          .from('gym_exercises')
          .delete()
          .eq('exercise_id', exercise.id)
          .in('gym_id', gymsToRemove);
        if (error) throw error;
      }

      if (gymsToAdd.length > 0) {
        const linksToAdd = gymsToAdd.map(gymId => ({
          gym_id: gymId,
          exercise_id: exercise.id,
        }));
        const { error } = await supabase.from('gym_exercises').insert(linksToAdd);
        if (error) throw error;
      }

      Alert.alert('Success', 'Gym associations updated successfully!');
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update gym associations:', err);
      Alert.alert('Error', 'Failed to update gym associations. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedGymIds(initialSelectedGymIds);
    onClose();
  };

  if (!exercise) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>Manage Gyms for "{exercise.name}"</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.description}>
              Select the gyms where this exercise is available.
            </Text>

            {userGyms.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={48} color={Colors.mutedForeground} />
                <Text style={styles.emptyTitle}>No gyms found</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't created any gyms yet. Go to your profile settings to add one.
                </Text>
              </View>
            ) : (
              <View style={styles.gymList}>
                {userGyms.map(gym => (
                  <TouchableOpacity
                    key={gym.id}
                    style={styles.gymItem}
                    onPress={() => handleToggleGym(gym.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.checkboxContainer}>
                      <View style={[
                        styles.checkbox,
                        selectedGymIds.has(gym.id) && styles.checkboxSelected
                      ]}>
                        {selectedGymIds.has(gym.id) && (
                          <Ionicons name="checkmark" size={16} color={Colors.white} />
                        )}
                      </View>
                    </View>
                    <Text style={styles.gymName}>{gym.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            variant="outline"
            size="lg"
            onPress={handleCancel}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            onPress={handleSaveChanges}
            loading={isSaving}
            disabled={userGyms.length === 0}
            style={styles.saveButton}
          >
            Save Changes
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  title: {
    ...TextStyles.h3,
    color: Colors.foreground,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32, // Same width as close button for centering
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  description: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    ...TextStyles.h3,
    color: Colors.foreground,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  gymList: {
    gap: Spacing.sm,
  },
  gymItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkboxContainer: {
    marginRight: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.actionPrimary,
    borderColor: Colors.actionPrimary,
  },
  gymName: {
    ...TextStyles.body,
    color: Colors.foreground,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});

export default ManageGymsModal;