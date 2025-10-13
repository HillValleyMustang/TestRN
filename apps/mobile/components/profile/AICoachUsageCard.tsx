/**
 * AI Coach Usage Card
 * Shows daily usage stats and opens AI coach dialog
 * Reference: profile s5/s6 design
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface AICoachUsageCardProps {
  dailyUses: number;
  maxDailyUses: number;
  onOpenCoach: () => void;
}

export const AICoachUsageCard: React.FC<AICoachUsageCardProps> = ({
  dailyUses,
  maxDailyUses,
  onOpenCoach,
}) => {
  return (
    <View style={styles.card}>
      {/* Header with Icon */}
      <View style={styles.header}>
        <Ionicons name="flask" size={24} color={Colors.foreground} />
        <Text style={styles.title}>AI Coach Usage</Text>
      </View>

      {/* Daily Uses Counter */}
      <View style={styles.usageRow}>
        <Text style={styles.usageLabel}>Daily Uses</Text>
        <Text style={styles.usageValue}>
          {dailyUses} / {maxDailyUses}
        </Text>
      </View>

      {/* Info Message */}
      <Text style={styles.infoText}>
        The AI Coach needs at least 3 workouts in the last 30 days to provide advice.
      </Text>

      {/* Open AI Coach Button */}
      <TouchableOpacity style={styles.button} onPress={onOpenCoach}>
        <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
        <Text style={styles.buttonText}>Open AI Coach</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.foreground,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageLabel: {
    fontSize: 16,
    color: Colors.foreground,
  },
  usageValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.foreground,
  },
  infoText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gray900,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
