import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SelectorSession {
  id: string;
  name: string;
  completedAt: string | null;
}

interface WorkoutSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  workoutName: string;
  sessions: SelectorSession[];
  onSelect: (sessionId: string) => void;
}

export function WorkoutSelectorModal({
  visible,
  onClose,
  workoutName,
  sessions,
  onSelect,
}: WorkoutSelectorModalProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'Error formatting date';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.dialogContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.dialogTitle}>Select Workout</Text>
              <Text style={styles.dialogDescription}>{workoutName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={Colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={true}
            >
              {sessions.map((session, index) => (
                <TouchableOpacity
                  key={session.id}
                  style={[
                    styles.sessionItem,
                    index === sessions.length - 1 && styles.lastItem
                  ]}
                  onPress={() => {
                    onSelect(session.id);
                    onClose();
                  }}
                >
                  <View style={styles.sessionInfo}>
                    <Ionicons name="barbell-outline" size={20} color={Colors.actionPrimary} />
                    <Text style={styles.sessionDate}>{formatDate(session.completedAt)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialogContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  dialogTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
  dialogDescription: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
  },
  listContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginVertical: Spacing.md,
  },
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sessionDate: {
    ...TextStyles.bodyMedium,
    color: Colors.foreground,
    fontFamily: 'Poppins_400Regular',
  },
  cancelButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  cancelButtonText: {
    ...TextStyles.button,
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
});
