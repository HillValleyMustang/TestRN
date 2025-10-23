import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from './_contexts/auth-context';
import { useData } from './_contexts/data-context';
import type { Gym } from '@data/storage/models';

export default function GymsScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { getGyms, setActiveGym, deleteGym } = useData();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGyms = useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      const data = await getGyms(userId);
      setGyms(data);
    } catch (error) {
      console.error('Error loading gyms:', error);
    } finally {
      setLoading(false);
    }
  }, [getGyms, userId]);

  useEffect(() => {
    loadGyms();
  }, [loadGyms]);

  const handleSetActive = async (gymId: string) => {
    if (!userId) {
      return;
    }
    try {
      await setActiveGym(userId, gymId);
      await loadGyms();
    } catch (error) {
      console.error('Error setting active gym:', error);
      Alert.alert('Error', 'Failed to set active gym');
    }
  };

  const handleDelete = (gym: Gym) => {
    Alert.alert(
      'Delete Gym',
      `Are you sure you want to delete "${gym.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGym(gym.id);
              await loadGyms();
            } catch (error) {
              console.error('Error deleting gym:', error);
              Alert.alert('Error', 'Failed to delete gym');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'My Gyms' }} />
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading gyms...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'My Gyms' }} />

      <ScrollView style={styles.content}>
        {gyms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Gyms Yet</Text>
            <Text style={styles.emptyText}>
              Create a gym profile to track what equipment you have access to.
              This helps filter exercises based on your available equipment.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {gyms.map(gym => (
              <View key={gym.id} style={styles.gymCard}>
                <View style={styles.gymHeader}>
                  <View style={styles.gymInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.gymName}>{gym.name}</Text>
                      {gym.is_active && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                      )}
                    </View>
                    {gym.description && (
                      <Text style={styles.gymDescription}>
                        {gym.description}
                      </Text>
                    )}
                    <Text style={styles.equipmentCount}>
                      {gym.equipment.length} equipment{' '}
                      {gym.equipment.length === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  {!gym.is_active && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetActive(gym.id)}
                    >
                      <Text style={styles.actionButtonText}>Set Active</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => router.push(`/gym-editor?id=${gym.id}`)}
                  >
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(gym)}
                  >
                    <Text
                      style={[styles.actionButtonText, styles.deleteButtonText]}
                    >
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/gym-editor')}
      >
        <Text style={styles.fabText}>+ Add Gym</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  gymCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  gymHeader: {
    marginBottom: 12,
  },
  gymInfo: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gymName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  activeBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  gymDescription: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  equipmentCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
