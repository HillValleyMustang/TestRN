/**
 * My Gyms Card - Settings Tab
 * Manage user gyms with Add/Rename/Delete functionality
 * Reference: Profile_Settings_v1 playbook
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { useSettingsStrings } from '../../localization/useSettingsStrings';
import { AddGymDialog } from './AddGymDialog';
import { ManageGymModal } from './ManageGymModal';
import { analyzeGymEquipment } from '../../lib/openai';
import { imageUriToBase64, uploadImageToSupabase } from '../../lib/imageUtils';

interface Gym {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

interface MyGymsCardProps {
  userId: string;
  gyms: Gym[];
  activeGymId: string | null;
  onRefresh: () => Promise<void>;
  supabase: any;
}

export function MyGymsCard({ 
  userId,
  gyms, 
  activeGymId,
  onRefresh,
  supabase 
}: MyGymsCardProps) {
  const strings = useSettingsStrings();

  const [isEditing, setIsEditing] = useState(false);
  const [rollingStatus, setRollingStatus] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  
  // Add Gym Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGymName, setNewGymName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Rename Modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameGymId, setRenameGymId] = useState<string | null>(null);
  const [renameGymName, setRenameGymName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteGymId, setDeleteGymId] = useState<string | null>(null);
  const [deleteGymName, setDeleteGymName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Manage Gym Modal
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedGymForManage, setSelectedGymForManage] = useState<Gym | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${strings.my_gyms.added_meta_prefix}${formattedDate}`;
  };

  const handleAddGym = async (gymData: {
    name: string;
    imageUri?: string;
    useAI: boolean;
    source: 'app_defaults' | 'copy_from_existing' | 'start_empty';
    copyFromGymId?: string;
    setAsActive: boolean;
  }) => {
    setIsAdding(true);
    try {
      let detectedEquipment: any[] = [];
      let imageUrl: string | undefined;

      // Step 1: AI Analysis (if requested and image provided)
      if (gymData.useAI && gymData.imageUri) {
        const base64 = await imageUriToBase64(gymData.imageUri);
        const analysis = await analyzeGymEquipment(base64);
        detectedEquipment = analysis.equipment;
      }

      // Step 2: Upload image to Supabase Storage (if provided)
      if (gymData.imageUri) {
        const imagePath = `gym-images/${userId}/${Date.now()}.jpg`;
        imageUrl = await uploadImageToSupabase(
          supabase,
          'user-uploads',
          imagePath,
          gymData.imageUri
        );
      }

      // Step 3: Create gym record
      const { data: newGym, error: gymError } = await supabase
        .from('gyms')
        .insert({
          user_id: userId,
          name: gymData.name,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (gymError) throw gymError;

      // Step 4: Seed equipment/exercises based on source
      if (gymData.source === 'app_defaults') {
        // Seed with default equipment types
        const defaultEquipment = [
          { gym_id: newGym.id, equipment_type: 'Dumbbells', quantity: 1 },
          { gym_id: newGym.id, equipment_type: 'Barbells', quantity: 1 },
          { gym_id: newGym.id, equipment_type: 'Flat Bench', quantity: 1 },
          { gym_id: newGym.id, equipment_type: 'Squat Rack', quantity: 1 },
          { gym_id: newGym.id, equipment_type: 'Pull-up Bar', quantity: 1 },
          { gym_id: newGym.id, equipment_type: 'Cable Machine', quantity: 1 },
        ];
        
        await supabase.from('gym_equipment').insert(defaultEquipment);

        // Query common gym exercises (those not gym-specific)
        const { data: commonExercises } = await supabase
          .from('exercises')
          .select('id')
          .eq('is_common', true)
          .limit(50);

        if (commonExercises && commonExercises.length > 0) {
          const gymExercises = commonExercises.map((ex: any) => ({
            gym_id: newGym.id,
            exercise_id: ex.id,
          }));
          
          await supabase.from('gym_exercises').insert(gymExercises);
        }
      } else if (gymData.source === 'copy_from_existing' && gymData.copyFromGymId) {
        // Copy equipment from existing gym
        const { data: sourceEquipment } = await supabase
          .from('gym_equipment')
          .select('*')
          .eq('gym_id', gymData.copyFromGymId);

        if (sourceEquipment && sourceEquipment.length > 0) {
          const newEquipment = sourceEquipment.map((eq: any) => ({
            gym_id: newGym.id,
            equipment_type: eq.equipment_type,
            quantity: eq.quantity,
          }));
          
          await supabase.from('gym_equipment').insert(newEquipment);
        }

        // Copy exercises from existing gym
        const { data: sourceExercises } = await supabase
          .from('gym_exercises')
          .select('*')
          .eq('gym_id', gymData.copyFromGymId);

        if (sourceExercises && sourceExercises.length > 0) {
          const newExercises = sourceExercises.map((ex: any) => ({
            gym_id: newGym.id,
            exercise_id: ex.exercise_id,
          }));
          
          await supabase.from('gym_exercises').insert(newExercises);
        }
      } else if (gymData.useAI && detectedEquipment.length > 0) {
        // Seed with AI-detected equipment
        const equipmentToInsert = detectedEquipment.flatMap(cat =>
          cat.items.map((item: string) => ({
            gym_id: newGym.id,
            equipment_type: item,
            quantity: 1,
          }))
        );

        if (equipmentToInsert.length > 0) {
          await supabase.from('gym_equipment').insert(equipmentToInsert);
        }
      }
      // 'Start Empty' requires no additional setup

      // Step 5: Set as active gym (if requested)
      if (gymData.setAsActive) {
        await supabase
          .from('profiles')
          .update({ active_gym_id: newGym.id })
          .eq('id', userId);
      }

      setShowAddModal(false);
      setNewGymName('');
      await onRefresh();
      setRollingStatus(strings.my_gyms.status_added);
      setHasError(false);
      setTimeout(() => setRollingStatus(null), 2500);
    } catch (error) {
      console.error('[MyGymsCard] Add error:', error);
      setRollingStatus(strings.my_gyms.status_error);
      setHasError(true);
      setTimeout(() => {
        setRollingStatus(null);
        setHasError(false);
      }, 2500);
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const handleRenameGym = async () => {
    if (!renameGymId || !renameGymName.trim()) return;

    setIsRenaming(true);
    try {
      const { error } = await supabase
        .from('gyms')
        .update({ name: renameGymName.trim() })
        .eq('id', renameGymId);

      if (error) throw error;

      setShowRenameModal(false);
      setRenameGymId(null);
      setRenameGymName('');
      await onRefresh();
      setRollingStatus(strings.my_gyms.status_renamed);
      setHasError(false);
      setTimeout(() => setRollingStatus(null), 2500);
    } catch (error) {
      console.error('[MyGymsCard] Rename error:', error);
      setRollingStatus(strings.my_gyms.status_error);
      setHasError(true);
      setTimeout(() => {
        setRollingStatus(null);
        setHasError(false);
      }, 2500);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteGym = async () => {
    if (!deleteGymId) return;

    setIsDeleting(true);
    try {
      if (deleteGymId === activeGymId && gyms.length > 1) {
        const newActiveGym = gyms.find(g => g.id !== deleteGymId);
        if (newActiveGym) {
          await supabase
            .from('profiles')
            .update({ active_gym_id: newActiveGym.id })
            .eq('id', userId);
        }
      }

      if (gyms.length === 1) {
        await supabase
          .from('profiles')
          .update({ active_gym_id: null })
          .eq('id', userId);
      }

      const { error } = await supabase
        .from('gyms')
        .delete()
        .eq('id', deleteGymId);

      if (error) throw error;

      setShowDeleteModal(false);
      setDeleteGymId(null);
      setDeleteGymName('');
      await onRefresh();
      setRollingStatus(strings.my_gyms.status_removed);
      setHasError(false);
      setTimeout(() => setRollingStatus(null), 2500);
    } catch (error) {
      console.error('[MyGymsCard] Delete error:', error);
      setRollingStatus(strings.my_gyms.status_error);
      setHasError(true);
      setTimeout(() => {
        setRollingStatus(null);
        setHasError(false);
      }, 2500);
    } finally {
      setIsDeleting(false);
    }
  };

  const openRenameModal = (gym: Gym) => {
    setRenameGymId(gym.id);
    setRenameGymName(gym.name);
    setShowRenameModal(true);
  };

  const openDeleteModal = (gym: Gym) => {
    setDeleteGymId(gym.id);
    setDeleteGymName(gym.name);
    setShowDeleteModal(true);
  };

  const openManageModal = (gym: Gym) => {
    setSelectedGymForManage(gym);
    setShowManageModal(true);
  };

  const isLastGym = gyms.length === 1;

  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="business" size={20} color={Colors.foreground} />
            <Text style={styles.title}>{strings.my_gyms.title}</Text>
          </View>
          <View style={styles.headerActions}>
            {rollingStatus && (
              <Text style={[
                styles.rollingStatus,
                hasError && styles.rollingStatusError
              ]}>
                {rollingStatus}
              </Text>
            )}
            <TouchableOpacity 
              onPress={() => setIsEditing(!isEditing)}
              style={styles.actionButton}
            >
              <Ionicons 
                name={isEditing ? "checkmark" : "create-outline"} 
                size={18} 
                color={Colors.blue600} 
              />
              <Text style={styles.actionButtonText}>
                {isEditing ? strings.my_gyms.done : strings.my_gyms.edit}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {gyms.map(gym => (
            <View key={gym.id} style={styles.gymRow}>
              <View style={styles.gymInfo}>
                <Text style={styles.gymName}>{gym.name}</Text>
                <Text style={styles.gymMeta}>{formatDate(gym.created_at)}</Text>
              </View>
              
              {isEditing && (
                <View style={styles.gymActions}>
                  <TouchableOpacity
                    onPress={() => openManageModal(gym)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="barbell" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => openRenameModal(gym)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="pencil" size={18} color={Colors.blue600} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => openDeleteModal(gym)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="trash" size={18} color={Colors.destructive} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {isEditing && gyms.length < 3 && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={Colors.blue600} />
              <Text style={styles.addButtonText}>{strings.my_gyms.add_new}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <AddGymDialog
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        existingGyms={gyms}
        onCreateGym={handleAddGym}
      />

      <Modal
        visible={showRenameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>{strings.my_gyms.rename_title}</Text>
            <TextInput
              style={styles.formInput}
              value={renameGymName}
              onChangeText={setRenameGymName}
              placeholder={strings.my_gyms.rename_placeholder}
              placeholderTextColor={Colors.mutedForeground}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowRenameModal(false)}
                disabled={isRenaming}
              >
                <Text style={styles.cancelButtonText}>{strings.my_gyms.rename_cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleRenameGym}
                disabled={isRenaming || !renameGymName.trim()}
              >
                {isRenaming ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>{strings.my_gyms.rename_save}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>
              {isLastGym ? strings.my_gyms.warning_last_title : strings.my_gyms.confirm_delete_title}
            </Text>
            <Text style={styles.dialogDescription}>
              {isLastGym 
                ? strings.my_gyms.warning_last_desc
                : `${strings.my_gyms.confirm_delete_desc_prefix}${deleteGymName}${strings.my_gyms.confirm_delete_desc_suffix}`
              }
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>
                  {isLastGym ? strings.my_gyms.warning_last_cancel : strings.my_gyms.confirm_delete_cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.deleteButton]}
                onPress={handleDeleteGym}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {isLastGym ? strings.my_gyms.warning_last_continue : strings.my_gyms.confirm_delete_delete}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ManageGymModal
        visible={showManageModal}
        onClose={() => {
          setShowManageModal(false);
          setSelectedGymForManage(null);
        }}
        gym={selectedGymForManage}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rollingStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.success,
  },
  rollingStatusError: {
    color: Colors.destructive,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.blue600,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  gymRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gymInfo: {
    flex: 1,
  },
  gymName: {
    fontSize: 15,
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
    gap: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.blue600,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.blue600,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dialogContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  dialogDescription: {
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  formField: {
    marginBottom: Spacing.md,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.foreground,
    backgroundColor: Colors.background,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
  },
  confirmButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.blue600,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: Colors.destructive,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
});
