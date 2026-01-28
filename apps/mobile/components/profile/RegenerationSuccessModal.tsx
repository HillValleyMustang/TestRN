import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { useSettingsStrings } from '../../localization/useSettingsStrings';

interface RegenerationSummary {
  logicApplied: string[];
  workouts: {
    workoutName: string;
    exercises: string[];
  }[];
  injuryNotes: string | null;
}

interface RegenerationSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  summary: RegenerationSummary | null;
}

export function RegenerationSuccessModal({
  visible,
  onClose,
  summary,
}: RegenerationSuccessModalProps) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cf89fb70-89f1-4c6a-b7b8-8d2defa2257c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RegenerationSuccessModal.tsx:28',message:'Modal received summary',data:{hasSummary:!!summary,workoutCount:summary?.workouts?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'4'})}).catch(()=>{});
  // #endregion
  const strings = useSettingsStrings();
  const t = strings.workout_preferences.regeneration_success;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
              </View>
              <Text style={styles.title}>{t.title}</Text>
              <Text style={styles.message}>
                {t.message}
              </Text>
            </View>

            {summary && (
              <View style={styles.summaryContainer}>
                {summary.logicApplied && summary.logicApplied.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t.intelligence_applied}</Text>
                    {summary.logicApplied.map((logic, index) => (
                      <View key={index} style={styles.itemRow}>
                        <Ionicons name="bulb" size={16} color={Colors.blue600} />
                        <Text style={styles.itemText}>{logic}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {summary.injuryNotes && (
                  <View style={[styles.section, styles.injurySection]}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="medical" size={18} color={Colors.destructive} />
                      <Text style={[styles.sectionTitle, { marginBottom: 0, color: Colors.destructive }]}>
                        {t.injury_management}
                      </Text>
                    </View>
                    <Text style={styles.injuryNote}>{summary.injuryNotes}</Text>
                  </View>
                )}

                {summary.workouts && summary.workouts.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t.included_exercises}</Text>
                    {summary.workouts.map((workout, index) => (
                      <View key={index} style={styles.workoutItem}>
                        <Text style={styles.workoutName}>{workout.workoutName}</Text>
                        <Text style={styles.exerciseList}>
                          {workout.exercises.join(', ')}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>{t.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modal: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    maxHeight: height * 0.85,
    width: Math.min(width - Spacing.xl * 2, 450),
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    fontFamily: 'Poppins_700Bold',
  },
  message: {
    fontSize: 15,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
  },
  summaryContainer: {
    gap: Spacing.xl,
  },
  section: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    fontFamily: 'Poppins_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  itemText: {
    fontSize: 14,
    color: Colors.foreground,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  injurySection: {
    backgroundColor: Colors.destructive + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.destructive + '30',
  },
  injuryNote: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
    fontStyle: 'italic',
  },
  workoutItem: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workoutName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.blue600,
    marginBottom: 4,
    fontFamily: 'Poppins_700Bold',
  },
  exerciseList: {
    fontSize: 13,
    color: Colors.mutedForeground,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  closeButton: {
    backgroundColor: Colors.blue600,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: Colors.blue600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    fontFamily: 'Poppins_600SemiBold',
  },
});
