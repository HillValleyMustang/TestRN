import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from './contexts/auth-context';
import { useData } from './contexts/data-context';
import { EQUIPMENT_TYPES, EQUIPMENT_CATEGORIES } from '@data/constants/equipment';
import type { Gym } from '@data/storage/models';

export default function GymEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { userId } = useAuth();
  const { getGym, addGym, updateGym } = useData();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);

  const isEditing = !!id;

  useEffect(() => {
    if (id) {
      loadGym();
    }
  }, [id]);

  const loadGym = async () => {
    if (!id) return;
    try {
      const gym = await getGym(id);
      if (gym) {
        setName(gym.name);
        setDescription(gym.description || '');
        setSelectedEquipment(gym.equipment);
      }
    } catch (error) {
      console.error('Error loading gym:', error);
      Alert.alert('Error', 'Failed to load gym');
    } finally {
      setLoading(false);
    }
  };

  const toggleEquipment = (equipmentId: string) => {
    setSelectedEquipment(prev => 
      prev.includes(equipmentId)
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    const categoryEquipment = EQUIPMENT_TYPES
      .filter((eq: typeof EQUIPMENT_TYPES[number]) => eq.category === categoryId)
      .map((eq: typeof EQUIPMENT_TYPES[number]) => eq.id);
    
    const allSelected = categoryEquipment.every((id: string) => selectedEquipment.includes(id));
    
    if (allSelected) {
      setSelectedEquipment(prev => prev.filter((id: string) => !categoryEquipment.includes(id)));
    } else {
      setSelectedEquipment(prev => {
        const newSet = new Set([...prev, ...categoryEquipment]);
        return Array.from(newSet);
      });
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a gym name');
      return;
    }

    if (selectedEquipment.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one equipment item');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      
      if (isEditing && id) {
        await updateGym(id, {
          name: name.trim(),
          description: description.trim() || null,
          equipment: selectedEquipment,
          updated_at: now,
        });
      } else {
        const newGym: Gym = {
          id: `gym_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: userId,
          name: name.trim(),
          description: description.trim() || null,
          equipment: selectedEquipment,
          is_active: false,
          created_at: now,
          updated_at: now,
        };
        await addGym(newGym);
      }
      
      router.back();
    } catch (error) {
      console.error('Error saving gym:', error);
      Alert.alert('Error', 'Failed to save gym');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading gym...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: isEditing ? 'Edit Gym' : 'Add Gym' }} />
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Gym Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., LA Fitness, Home Gym"
            placeholderTextColor="#666"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add notes about this gym..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Equipment *</Text>
          <Text style={styles.hint}>
            Select all equipment available at this gym ({selectedEquipment.length} selected)
          </Text>

          {EQUIPMENT_CATEGORIES.map((category: typeof EQUIPMENT_CATEGORIES[number]) => {
            const categoryEquipment = EQUIPMENT_TYPES.filter((eq: typeof EQUIPMENT_TYPES[number]) => eq.category === category.id);
            const selectedCount = categoryEquipment.filter((eq: typeof EQUIPMENT_TYPES[number]) => selectedEquipment.includes(eq.id)).length;
            const allSelected = selectedCount === categoryEquipment.length;

            return (
              <View key={category.id} style={styles.categoryBlock}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category.id)}
                >
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryCount}>
                    {selectedCount}/{categoryEquipment.length}
                    {allSelected && ' ✓'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.equipmentGrid}>
                  {categoryEquipment.map((equipment: typeof EQUIPMENT_TYPES[number]) => {
                    const isSelected = selectedEquipment.includes(equipment.id);
                    return (
                      <TouchableOpacity
                        key={equipment.id}
                        style={[
                          styles.equipmentChip,
                          isSelected && styles.equipmentChipSelected,
                        ]}
                        onPress={() => toggleEquipment(equipment.id)}
                      >
                        <Text
                          style={[
                            styles.equipmentChipText,
                            isSelected && styles.equipmentChipTextSelected,
                          ]}
                        >
                          {equipment.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>
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
    padding: 16,
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryBlock: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  categoryCount: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentChip: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  equipmentChipSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  equipmentChipText: {
    fontSize: 14,
    color: '#888',
  },
  equipmentChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
