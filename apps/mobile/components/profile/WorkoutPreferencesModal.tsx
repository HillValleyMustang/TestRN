import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { supabase } from '../../app/_lib/supabase';

interface WorkoutPreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  currentPreferences: {
    unit_system?: 'metric' | 'imperial';
    t_path_type?: 'ppl' | 'ulul';
    default_session_length?: number;
  };
  onSuccess: (prefs: any) => void;
  onTPathTypeChange?: (newType: 'ppl' | 'ulul') => void;
}

export function WorkoutPreferencesModal({
  visible,
  onClose,
  userId,
  currentPreferences,
  onSuccess,
  onTPathTypeChange,
}: WorkoutPreferencesModalProps) {
  const [unitSystem, setUnitSystem] = useState(currentPreferences.unit_system || 'metric');
  const [tPathType, setTPathType] = useState(currentPreferences.t_path_type || 'ppl');
  const [sessionLength, setSessionLength] = useState(currentPreferences.default_session_length || 60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setUnitSystem(currentPreferences.unit_system || 'metric');
      setTPathType(currentPreferences.t_path_type || 'ppl');
      setSessionLength(currentPreferences.default_session_length || 60);
    }
  }, [visible, currentPreferences.unit_system, currentPreferences.t_path_type, currentPreferences.default_session_length]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          unit_system: unitSystem,
          t_path_type: tPathType,
          default_session_length: sessionLength,
        })
        .eq('id', userId);

      if (error) throw error;

      const tPathTypeChanged = tPathType !== currentPreferences.t_path_type;
      
      onSuccess({
        unit_system: unitSystem,
        t_path_type: tPathType,
        default_session_length: sessionLength,
      });

      if (tPathTypeChanged && onTPathTypeChange) {
        onTPathTypeChange(tPathType);
      }

      onClose();
    } catch (error) {
      console.error('Error updating preferences:', error);
      Alert.alert('Error', 'Failed to update preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Workout Preferences</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.gray700} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.label}>Unit System</Text>
              <View style={styles.optionGroup}>
                <TouchableOpacity
                  style={[styles.option, unitSystem === 'metric' && styles.optionActive]}
                  onPress={() => setUnitSystem('metric')}
                >
                  <Text style={[styles.optionText, unitSystem === 'metric' && styles.optionTextActive]}>
                    Metric (kg, cm)
                  </Text>
                  {unitSystem === 'metric' && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.blue600} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.option, unitSystem === 'imperial' && styles.optionActive]}
                  onPress={() => setUnitSystem('imperial')}
                >
                  <Text style={[styles.optionText, unitSystem === 'imperial' && styles.optionTextActive]}>
                    Imperial (lbs, ft)
                  </Text>
                  {unitSystem === 'imperial' && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.blue600} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Programme Type</Text>
              <View style={styles.optionGroup}>
                <TouchableOpacity
                  style={[styles.option, tPathType === 'ppl' && styles.optionActive]}
                  onPress={() => setTPathType('ppl')}
                >
                  <View>
                    <Text style={[styles.optionText, tPathType === 'ppl' && styles.optionTextActive]}>
                      Push/Pull/Legs
                    </Text>
                    <Text style={styles.optionSubtext}>3-day split</Text>
                  </View>
                  {tPathType === 'ppl' && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.blue600} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.option, tPathType === 'ulul' && styles.optionActive]}
                  onPress={() => setTPathType('ulul')}
                >
                  <View>
                    <Text style={[styles.optionText, tPathType === 'ulul' && styles.optionTextActive]}>
                      Upper/Lower
                    </Text>
                    <Text style={styles.optionSubtext}>4-day split</Text>
                  </View>
                  {tPathType === 'ulul' && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.blue600} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Default Session Length</Text>
              <View style={styles.optionGroup}>
                {[45, 60, 75, 90].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[styles.option, sessionLength === minutes && styles.optionActive]}
                    onPress={() => setSessionLength(minutes)}
                  >
                    <Text style={[styles.optionText, sessionLength === minutes && styles.optionTextActive]}>
                      {minutes} minutes
                    </Text>
                    {sessionLength === minutes && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.blue600} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.saveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  title: {
    ...TextStyles.h2,
    color: Colors.gray900,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  label: {
    ...TextStyles.bodyBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  optionGroup: {
    gap: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
  },
  optionActive: {
    borderColor: Colors.blue600,
    backgroundColor: Colors.blue50,
  },
  optionText: {
    ...TextStyles.body,
    color: Colors.gray900,
  },
  optionTextActive: {
    color: Colors.blue600,
    fontWeight: '600',
  },
  optionSubtext: {
    ...TextStyles.small,
    color: Colors.gray500,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray300,
    alignItems: 'center',
  },
  cancelText: {
    ...TextStyles.bodyBold,
    color: Colors.gray700,
  },
  saveButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.blue600,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    ...TextStyles.bodyBold,
    color: Colors.white,
  },
});
