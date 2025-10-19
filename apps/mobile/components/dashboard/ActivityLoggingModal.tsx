import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface ActivityLoggingModalProps {
  visible: boolean;
  onClose: () => void;
  onLogActivity: (activity: {
    type: 'cardio' | 'strength' | 'flexibility' | 'sports';
    duration: number;
    notes?: string;
  }) => void;
}

export function ActivityLoggingModal({
  visible,
  onClose,
  onLogActivity
}: ActivityLoggingModalProps) {
  const [selectedType, setSelectedType] = useState<'cardio' | 'strength' | 'flexibility' | 'sports'>('cardio');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const activityTypes = [
    {
      id: 'cardio' as const,
      name: 'Cardio',
      icon: 'heart',
      description: 'Running, cycling, swimming, etc.',
      color: '#EF4444'
    },
    {
      id: 'strength' as const,
      name: 'Strength',
      icon: 'barbell',
      description: 'Weight training, resistance exercises',
      color: '#3B82F6'
    },
    {
      id: 'flexibility' as const,
      name: 'Flexibility',
      icon: 'body',
      description: 'Yoga, stretching, mobility work',
      color: '#10B981'
    },
    {
      id: 'sports' as const,
      name: 'Sports',
      icon: 'trophy',
      description: 'Team sports, recreational activities',
      color: '#F59E0B'
    }
  ];

  const handleLogActivity = async () => {
    if (!duration || parseInt(duration) <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid duration in minutes');
      return;
    }

    setIsLogging(true);
    try {
      await onLogActivity({
        type: selectedType,
        duration: parseInt(duration),
        notes: notes.trim() || undefined
      });

      // Reset form
      setDuration('');
      setNotes('');
      setSelectedType('cardio');
      onClose();

      Alert.alert('Success', 'Activity logged successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to log activity');
    } finally {
      setIsLogging(false);
    }
  };

  const renderActivityType = (type: typeof activityTypes[0]) => {
    const isSelected = selectedType === type.id;

    return (
      <Pressable
        key={type.id}
        style={[
          styles.activityType,
          { borderColor: isSelected ? type.color : Colors.border }
        ]}
        onPress={() => setSelectedType(type.id)}
      >
        <View style={[styles.typeIcon, { backgroundColor: type.color }]}>
          <Ionicons
            name={type.icon as any}
            size={24}
            color="white"
          />
        </View>
        <View style={styles.typeContent}>
          <Text style={[styles.typeName, { color: isSelected ? type.color : Colors.foreground }]}>
            {type.name}
          </Text>
          <Text style={styles.typeDescription}>{type.description}</Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={type.color} />
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modalContainer}>
          <Pressable onPress={(e: any) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>Log Activity</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </Pressable>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Activity Type Selection */}
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Activity Type</Text>
                <View style={styles.activityTypes}>
                  {activityTypes.map(renderActivityType)}
                </View>
              </Card>

              {/* Duration Input */}
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Duration (minutes)</Text>
                <TextInput
                  style={styles.durationInput}
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="Enter duration in minutes"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.mutedForeground}
                />
              </Card>

              {/* Notes Input */}
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes about your activity..."
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={Colors.mutedForeground}
                  textAlignVertical="top"
                />
              </Card>

              {/* Quick Duration Buttons */}
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Select</Text>
                <View style={styles.quickButtons}>
                  {[15, 30, 45, 60, 90].map((mins) => (
                    <Pressable
                      key={mins}
                      style={[
                        styles.quickButton,
                        duration === mins.toString() && styles.quickButtonSelected
                      ]}
                      onPress={() => setDuration(mins.toString())}
                    >
                      <Text style={[
                        styles.quickButtonText,
                        duration === mins.toString() && styles.quickButtonTextSelected
                      ]}>
                        {mins}m
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Card>

              {/* Action Button */}
              <View style={styles.actionContainer}>
                <Button
                  onPress={handleLogActivity}
                  disabled={isLogging || !duration}
                  style={styles.logButton}
                >
                  {isLogging ? "Logging..." : "Log Activity"}
                </Button>
              </View>
            </ScrollView>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.foreground,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  activityTypes: {
    gap: Spacing.sm,
  },
  activityType: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  typeContent: {
    flex: 1,
  },
  typeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  durationInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.foreground,
    backgroundColor: Colors.card,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.foreground,
    backgroundColor: Colors.card,
    minHeight: 80,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  quickButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quickButtonText: {
    fontSize: 14,
    color: Colors.foreground,
    fontWeight: '600',
  },
  quickButtonTextSelected: {
    color: Colors.primaryForeground,
  },
  actionContainer: {
    marginBottom: Spacing.xl,
  },
  logButton: {
    width: '100%',
  },
});