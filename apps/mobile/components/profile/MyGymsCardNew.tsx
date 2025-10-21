/**
 * My Gyms Card - Settings Tab (Multi-Step Flow)
 * Manage user gyms with multi-step Add flow matching designs
 * Reference: profile s7, s9, s10, s11 designs
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { useSettingsStrings } from '../../localization/useSettingsStrings';
import { AddGymNameDialog } from './AddGymNameDialog';
import { SetupGymOptionsDialog } from './SetupGymOptionsDialog';
import { AnalyseGymPhotoDialog } from './AnalyseGymPhotoDialog';
import { CopyGymSetupDialog } from './CopyGymSetupDialog';
import { DeleteGymDialog } from './DeleteGymDialog';
import { RenameGymDialog } from './RenameGymDialog';

interface Gym {
  id: string;
  name: string;
  created_at: string;
}

interface MyGymsCardProps {
  userId: string;
  gyms: Gym[];
  activeGymId: string | null;
  onRefresh: () => Promise<void>;
  onManageGym: (gymId: string) => void;
  supabase: any;
}

type FlowStep = 'name' | 'setup' | 'ai-upload' | 'copy';

export function MyGymsCardNew({ 
  userId,
  gyms, 
  activeGymId,
  onRefresh,
  onManageGym,
  supabase 
}: MyGymsCardProps) {
  const strings = useSettingsStrings();

  const [isEditing, setIsEditing] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep | null>(null);
  const [currentGymId, setCurrentGymId] = useState<string>('');
  const [currentGymName, setCurrentGymName] = useState<string>('');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedGymId, setSelectedGymId] = useState<string>('');
  const [selectedGymName, setSelectedGymName] = useState<string>('');

  const handleStartAddGym = () => {
    setFlowStep('name');
  };

  const handleNameComplete = (gymId: string, gymName: string) => {
    setCurrentGymId(gymId);
    setCurrentGymName(gymName);
    setFlowStep('setup');
  };

  const handleSetupOption = async (option: 'ai' | 'copy' | 'defaults' | 'empty') => {
    switch (option) {
      case 'ai':
        setFlowStep('ai-upload');
        break;
      case 'copy':
        setFlowStep('copy');
        break;
      case 'defaults':
        await setupWithDefaults();
        break;
      case 'empty':
        await finishSetup();
        break;
    }
  };

  const setupWithDefaults = async () => {
    try {
      // Seed default equipment
      const defaultEquipment = [
        { gym_id: currentGymId, equipment_type: 'Dumbbells', quantity: 1 },
        { gym_id: currentGymId, equipment_type: 'Barbells', quantity: 1 },
        { gym_id: currentGymId, equipment_type: 'Flat Bench', quantity: 1 },
        { gym_id: currentGymId, equipment_type: 'Squat Rack', quantity: 1 },
        { gym_id: currentGymId, equipment_type: 'Pull-up Bar', quantity: 1 },
        { gym_id: currentGymId, equipment_type: 'Cable Machine', quantity: 1 },
      ];

      await supabase.from('gym_equipment').insert(defaultEquipment);

      // Get common exercises
      const { data: commonExercises } = await supabase
        .from('exercises')
        .select('id')
        .eq('is_common', true)
        .limit(50);

      if (commonExercises) {
        const gymExercises = commonExercises.map((ex: { id: string }) => ({
          gym_id: currentGymId,
          exercise_id: ex.id,
        }));
        await supabase.from('gym_exercises').insert(gymExercises);
      }

      await finishSetup();
    } catch (error) {
      console.error('[MyGymsCard] Error setting up defaults:', error);
      Alert.alert('Error', 'Failed to set up default equipment');
    }
  };

  const finishSetup = async () => {
    setFlowStep(null);
    setCurrentGymId('');
    setCurrentGymName('');
    await onRefresh();
  };

  const handleDeleteGym = async () => {
    // If deleting active gym, switch to another gym first
    if (selectedGymId === activeGymId && gyms.length > 1) {
      const newActiveGym = gyms.find(g => g.id !== selectedGymId);
      if (newActiveGym) {
        await supabase
          .from('profiles')
          .update({ active_gym_id: newActiveGym.id })
          .eq('id', userId);
      }
    }
    
    await onRefresh();
    setSelectedGymId('');
    setSelectedGymName('');
  };

  const handleRenameGym = async () => {
    await onRefresh();
    setSelectedGymId('');
    setSelectedGymName('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${strings.my_gyms.added_meta_prefix}${formattedDate}`;
  };

  return (
    <>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="business" size={20} color={Colors.foreground} />
            <Text style={styles.title}>{strings.my_gyms.title}</Text>
          </View>
          {isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.doneButton}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
              <Ionicons name="create-outline" size={18} color={Colors.foreground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Gym List */}
        {gyms.map((gym) => (
          <View key={gym.id} style={styles.gymRow}>
            <View style={styles.gymInfo}>
              <Text style={styles.gymName}>{gym.name}</Text>
              <Text style={styles.gymMeta}>{formatDate(gym.created_at)}</Text>
            </View>
            {isEditing ? (
              <View style={styles.gymActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    setSelectedGymId(gym.id);
                    setSelectedGymName(gym.name);
                    setShowRenameDialog(true);
                  }}
                >
                  <Ionicons name="create-outline" size={20} color={Colors.gray600} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    setSelectedGymId(gym.id);
                    setSelectedGymName(gym.name);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.red500} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.manageButton}
                onPress={() => onManageGym(gym.id)}
              >
                <Ionicons name="barbell-outline" size={20} color={Colors.gray600} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Add Gym Button */}
        {isEditing && gyms.length < 3 && (
          <TouchableOpacity style={styles.addButton} onPress={handleStartAddGym}>
            <Ionicons name="add-circle" size={20} color={Colors.gray900} />
            <Text style={styles.addButtonText}>Add New Gym</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Multi-Step Dialogs */}
      <AddGymNameDialog
        visible={flowStep === 'name'}
        onClose={() => setFlowStep(null)}
        onContinue={handleNameComplete}
        existingGymCount={gyms.length}
      />

      <SetupGymOptionsDialog
        visible={flowStep === 'setup'}
        gymName={currentGymName}
        onClose={() => setFlowStep(null)}
        onSelectOption={handleSetupOption}
      />

      <AnalyseGymPhotoDialog
        visible={flowStep === 'ai-upload'}
        gymId={currentGymId}
        gymName={currentGymName}
        onBack={() => setFlowStep('setup')}
        onFinish={finishSetup}
      />

      <CopyGymSetupDialog
        visible={flowStep === 'copy'}
        gymId={currentGymId}
        gymName={currentGymName}
        sourceGyms={gyms.filter(g => g.id !== currentGymId)}
        onBack={() => setFlowStep('setup')}
        onFinish={finishSetup}
      />

      <DeleteGymDialog
        visible={showDeleteDialog}
        gymId={selectedGymId}
        gymName={selectedGymName}
        isActiveGym={selectedGymId === activeGymId}
        isLastGym={gyms.length === 1}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedGymId('');
          setSelectedGymName('');
        }}
        onDelete={handleDeleteGym}
        supabase={supabase}
      />

      <RenameGymDialog
        visible={showRenameDialog}
        gymId={selectedGymId}
        currentName={selectedGymName}
        onClose={() => {
          setShowRenameDialog(false);
          setSelectedGymId('');
          setSelectedGymName('');
        }}
        onRename={handleRenameGym}
        supabase={supabase}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.gray900,
    fontFamily: 'Poppins_700Bold',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.xs,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.foreground,
  },
  doneButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.blue600,
  },
  gymRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  gymInfo: {
    flex: 1,
  },
  gymName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 2,
  },
  gymMeta: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  gymActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  manageButton: {
    padding: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray900,
  },
});
