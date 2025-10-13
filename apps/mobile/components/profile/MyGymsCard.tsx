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
  supabase: any;
}

export function MyGymsCard({ 
  userId,
  gyms, 
  activeGymId,
  onRefresh,
  supabase 
}: MyGymsCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [rollingStatus, setRollingStatus] = useState<string | null>(null);
  
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleAddGym = async () => {
    if (!newGymName.trim()) return;

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('gyms')
        .insert({
          user_id: userId,
          name: newGymName.trim(),
        });

      if (error) throw error;

      setShowAddModal(false);
      setNewGymName('');
      await onRefresh();
      setRollingStatus('Added!');
      setTimeout(() => setRollingStatus(null), 2500);
    } catch (error) {
      console.error('[MyGymsCard] Add error:', error);
      Alert.alert('Error', 'Failed to add gym');
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
      setRollingStatus('Renamed!');
      setTimeout(() => setRollingStatus(null), 2500);
    } catch (error) {
      console.error('[MyGymsCard] Rename error:', error);
      Alert.alert('Error', 'Failed to rename gym');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteGym = async () => {
    if (!deleteGymId) return;

    setIsDeleting(true);
    try {
      // If deleting active gym and others remain, set another as active
      if (deleteGymId === activeGymId && gyms.length > 1) {
        const newActiveGym = gyms.find(g => g.id !== deleteGymId);
        if (newActiveGym) {
          await supabase
            .from('profiles')
            .update({ active_gym_id: newActiveGym.id })
            .eq('id', userId);
        }
      }

      // If this is the last gym, clear active_gym_id
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
      setRollingStatus('Removed!');
      setTimeout(() => setRollingStatus(null), 2500);
    } catch (error) {
      console.error('[MyGymsCard] Delete error:', error);
      Alert.alert('Error', 'Failed to delete gym');
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

  const isLastGym = gyms.length === 1;

  return (
    <>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="business" size={20} color={Colors.foreground} />
            <Text style={styles.title}>My Gyms</Text>
          </View>
          <View style={styles.headerActions}>
            {rollingStatus && (
              <Text style={[
                styles.rollingStatus,
                rollingStatus.includes('Error') && styles.rollingStatusError
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
                {isEditing ? 'Done' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {gyms.map(gym => (
            <View key={gym.id} style={styles.gymRow}>
              <View style={styles.gymInfo}>
                <Text style={styles.gymName}>{gym.name}</Text>
                <Text style={styles.gymMeta}>Added: {formatDate(gym.created_at)}</Text>
              </View>
              
              {isEditing && (
                <View style={styles.gymActions}>
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
              <Text style={styles.addButtonText}>Add New Gym</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Add Gym Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>Add New Gym</Text>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput
                style={styles.formInput}
                value={newGymName}
                onChangeText={setNewGymName}
                placeholder="e.g., Home Gym, Fitness First"
                placeholderTextColor={Colors.mutedForeground}
              />
            </View>
            <View style={styles.dialogActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
                disabled={isAdding}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleAddGym}
                disabled={isAdding || !newGymName.trim()}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rename Gym Modal */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>Rename Gym</Text>
            <TextInput
              style={styles.formInput}
              value={renameGymName}
              onChangeText={setRenameGymName}
              placeholder="e.g., Home Gym, Fitness First"
              placeholderTextColor={Colors.mutedForeground}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowRenameModal(false)}
                disabled={isRenaming}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleRenameGym}
                disabled={isRenaming || !renameGymName.trim()}
              >
                {isRenaming ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Gym Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>
              {isLastGym ? 'Warning: Deleting Last Gym' : 'Confirm Deletion'}
            </Text>
            <Text style={styles.dialogDescription}>
              {isLastGym 
                ? 'This is your last gym. Deleting it will reset your current workout plan to use default "common gym" exercises. Your T-Path and session preferences will be kept. Are you sure you want to continue?'
                : `Are you sure you want to delete the gym "${deleteGymName}"? This action cannot be undone.`
              }
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
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
                    {isLastGym ? 'Continue and Reset Plan' : 'Delete'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
