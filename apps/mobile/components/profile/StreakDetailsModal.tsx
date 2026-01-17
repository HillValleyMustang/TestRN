import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface StreakDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  streakDays: number;
  streakStartDate: string | null;
}

export function StreakDetailsModal({ 
  visible, 
  onClose, 
  streakDays,
  streakStartDate 
}: StreakDetailsModalProps) {
  // Format date for display
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Today';
    
    try {
      const date = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if it's today
      if (dateStr === today.toISOString().split('T')[0]) {
        return 'Today';
      }
      
      // Format as "10th Jan 2026"
      const day = date.getDate();
      const daySuffix = 
        day === 1 || day === 21 || day === 31 ? 'st' :
        day === 2 || day === 22 ? 'nd' :
        day === 3 || day === 23 ? 'rd' : 'th';
      
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      return `${day}${daySuffix} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    } catch (error) {
      return dateStr;
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const startDateStr = streakStartDate || todayStr;
  
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
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="flame" size={24} color="#FB923C" />
              </View>
              <Text style={styles.title}>Current Streak</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.gray700} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {streakDays > 0 ? (
              <>
                <View style={styles.streakInfo}>
                  <Text style={styles.streakNumber}>{streakDays}</Text>
                  <Text style={styles.streakLabel}>
                    {streakDays === 1 ? 'Day' : 'Days'}
                  </Text>
                </View>

                <View style={styles.dateRangeContainer}>
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar" size={20} color={Colors.gray600} />
                    <View style={styles.dateInfo}>
                      <Text style={styles.dateLabel}>Start Date</Text>
                      <Text style={styles.dateValue}>
                        {formatDate(startDateStr)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.dateRow}>
                    <Ionicons name="today" size={20} color={Colors.gray600} />
                    <View style={styles.dateInfo}>
                      <Text style={styles.dateLabel}>End Date</Text>
                      <Text style={styles.dateValue}>Today</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color={Colors.blue600} />
                  <Text style={styles.infoText}>
                    Your streak counts consecutive days with at least one completed workout. Keep it going!
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="flame-outline" size={48} color={Colors.gray400} />
                <Text style={styles.emptyTitle}>No Active Streak</Text>
                <Text style={styles.emptyText}>
                  Complete a workout today to start your streak!
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FB923C20',
    justifyContent: 'center',
    alignItems: 'center',
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
  streakInfo: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  streakNumber: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FB923C',
    marginBottom: Spacing.xs,
  },
  streakLabel: {
    ...TextStyles.h4,
    color: Colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dateRangeContainer: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    ...TextStyles.caption,
    color: Colors.gray500,
    marginBottom: Spacing.xs,
  },
  dateValue: {
    ...TextStyles.h4,
    color: Colors.gray900,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.md,
    marginLeft: 36, // Align with icon width + gap
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.blue50,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  infoText: {
    ...TextStyles.body,
    color: Colors.blue900,
    flex: 1,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyTitle: {
    ...TextStyles.h3,
    color: Colors.gray900,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...TextStyles.body,
    color: Colors.gray600,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
