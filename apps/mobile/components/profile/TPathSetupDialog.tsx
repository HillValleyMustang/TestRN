/**
 * T-Path Setup Dialog
 * Collects missing profile data needed for t-path generation
 * (programme type, session length, experience)
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface TPathSetupDialogProps {
  visible: boolean;
  gymName: string;
  missingFields: {
    programmeType?: boolean;
    sessionLength?: boolean;
  };
  onBack: () => void;
  onComplete: (data: {
    programmeType?: 'ulul' | 'ppl';
    sessionLength?: string;
  }) => void;
}

export const TPathSetupDialog: React.FC<TPathSetupDialogProps> = ({
  visible,
  gymName,
  missingFields,
  onBack,
  onComplete,
}) => {
  const [programmeType, setProgrammeType] = useState<'ulul' | 'ppl' | null>(null);
  const [sessionLength, setSessionLength] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (visible) {
      setProgrammeType(null);
      setSessionLength(null);
    }
  }, [visible]);

  const handleComplete = () => {
    const data: { programmeType?: 'ulul' | 'ppl'; sessionLength?: string } = {};
    
    if (missingFields.programmeType && programmeType) {
      data.programmeType = programmeType;
    }
    
    if (missingFields.sessionLength && sessionLength) {
      data.sessionLength = sessionLength;
    }

    onComplete(data);
  };

  const isComplete = (
    (!missingFields.programmeType || programmeType !== null) &&
    (!missingFields.sessionLength || sessionLength !== null)
  );

  const sessionLengthOptions = [
    { value: '15-30', label: '15-30 mins', description: 'Quick workouts' },
    { value: '30-45', label: '30-45 mins', description: 'Standard sessions' },
    { value: '45-60', label: '45-60 mins', description: 'Full workouts' },
    { value: '60-90', label: '60-90 mins', description: 'Extended sessions' },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onBack}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Complete Your Setup</Text>
              <Text style={styles.subtitle}>
                We need a bit more information to generate your workout plan for "{gymName}".
              </Text>
            </View>

            {/* Programme Type Selection */}
            {missingFields.programmeType && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Programme Type</Text>
                <Text style={styles.sectionSubtitle}>
                  Choose your preferred training split
                </Text>

                <View style={styles.optionsGrid}>
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      programmeType === 'ulul' && styles.optionCardSelected,
                    ]}
                    onPress={() => setProgrammeType('ulul')}
                  >
                    <View style={styles.optionHeader}>
                      <Text style={styles.optionTitle}>Upper/Lower</Text>
                      {programmeType === 'ulul' && (
                        <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                      )}
                    </View>
                    <Text style={styles.optionDescription}>
                      4-day split alternating between upper and lower body
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      programmeType === 'ppl' && styles.optionCardSelected,
                    ]}
                    onPress={() => setProgrammeType('ppl')}
                  >
                    <View style={styles.optionHeader}>
                      <Text style={styles.optionTitle}>Push/Pull/Legs</Text>
                      {programmeType === 'ppl' && (
                        <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                      )}
                    </View>
                    <Text style={styles.optionDescription}>
                      3-day split focusing on movement patterns
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Session Length Selection */}
            {missingFields.sessionLength && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferred Session Length</Text>
                <Text style={styles.sectionSubtitle}>
                  How long do you typically have for workouts?
                </Text>

                <View style={styles.optionsColumn}>
                  {sessionLengthOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.lengthOption,
                        sessionLength === option.value && styles.lengthOptionSelected,
                      ]}
                      onPress={() => setSessionLength(option.value)}
                    >
                      <View style={styles.lengthContent}>
                        <Text style={styles.lengthLabel}>{option.label}</Text>
                        <Text style={styles.lengthDescription}>{option.description}</Text>
                      </View>
                      {sessionLength === option.value && (
                        <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={20} color={Colors.foreground} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                !isComplete && styles.confirmButtonDisabled,
              ]}
              onPress={handleComplete}
              disabled={!isComplete}
            >
              <Text style={styles.confirmButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
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
  },
  container: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginBottom: Spacing.md,
  },
  optionsGrid: {
    gap: Spacing.md,
  },
  optionCard: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  optionCardSelected: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  optionDescription: {
    fontSize: 13,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  optionsColumn: {
    gap: Spacing.sm,
  },
  lengthOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  lengthOptionSelected: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  lengthContent: {
    flex: 1,
  },
  lengthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  lengthDescription: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.muted,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gray900,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.muted,
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
