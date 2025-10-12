import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
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

interface BodyMetricsModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  currentMetrics: {
    height_cm?: number;
    weight_kg?: number;
    body_fat_pct?: number;
  };
  onSuccess: (metrics: any) => void;
}

export function BodyMetricsModal({
  visible,
  onClose,
  userId,
  currentMetrics,
  onSuccess,
}: BodyMetricsModalProps) {
  const [heightCm, setHeightCm] = useState(currentMetrics.height_cm?.toString() || '');
  const [weightKg, setWeightKg] = useState(currentMetrics.weight_kg?.toString() || '');
  const [bodyFat, setBodyFat] = useState(currentMetrics.body_fat_pct?.toString() || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setHeightCm(currentMetrics.height_cm?.toString() || '');
      setWeightKg(currentMetrics.weight_kg?.toString() || '');
      setBodyFat(currentMetrics.body_fat_pct?.toString() || '');
    }
  }, [visible, currentMetrics.height_cm, currentMetrics.weight_kg, currentMetrics.body_fat_pct]);

  const handleSave = async () => {
    const height = heightCm ? parseFloat(heightCm) : null;
    const weight = weightKg ? parseFloat(weightKg) : null;
    const fat = bodyFat ? parseFloat(bodyFat) : null;

    if (height && (height < 100 || height > 250)) {
      Alert.alert('Error', 'Please enter a valid height (100-250 cm)');
      return;
    }

    if (weight && (weight < 30 || weight > 300)) {
      Alert.alert('Error', 'Please enter a valid weight (30-300 kg)');
      return;
    }

    if (fat && (fat < 3 || fat > 60)) {
      Alert.alert('Error', 'Please enter a valid body fat percentage (3-60%)');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          height_cm: height,
          weight_kg: weight,
          body_fat_pct: fat,
        })
        .eq('id', userId);

      if (error) throw error;

      onSuccess({ height_cm: height, weight_kg: weight, body_fat_pct: fat });
      onClose();
    } catch (error) {
      console.error('Error updating body metrics:', error);
      Alert.alert('Error', 'Failed to update body metrics. Please try again.');
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
            <Text style={styles.title}>Edit Body Metrics</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.gray700} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="170"
                keyboardType="decimal-pad"
                maxLength={6}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder="70"
                keyboardType="decimal-pad"
                maxLength={6}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Body Fat (%)</Text>
              <TextInput
                style={styles.input}
                value={bodyFat}
                onChangeText={setBodyFat}
                placeholder="15"
                keyboardType="decimal-pad"
                maxLength={5}
              />
            </View>

            <View style={styles.helpBox}>
              <Ionicons name="information-circle" size={20} color={Colors.blue600} />
              <Text style={styles.helpText}>
                These metrics are used to calculate your BMI and track your progress over time.
              </Text>
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
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...TextStyles.bodyBold,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  input: {
    ...TextStyles.body,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.gray900,
  },
  helpBox: {
    flexDirection: 'row',
    backgroundColor: Colors.blue50,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  helpText: {
    ...TextStyles.small,
    color: Colors.blue900,
    marginLeft: Spacing.sm,
    flex: 1,
    lineHeight: 18,
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
