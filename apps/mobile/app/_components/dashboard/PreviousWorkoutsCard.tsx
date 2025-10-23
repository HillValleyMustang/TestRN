import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Colors, Spacing } from '../../../constants/design-system';
import { Button } from '../ui/Button';

interface SessionSummary {
  id: string;
  name: string;
  completedAt?: string | null;
}

interface Props {
  sessions: SessionSummary[];
  onViewAll: () => void;
}

export const PreviousWorkoutsCard: React.FC<Props> = ({
  sessions,
  onViewAll,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Previous Workouts</CardTitle>
      </CardHeader>
      <CardContent style={styles.content}>
        {sessions.length === 0 ? (
          <Text style={styles.emptyText}>
            No workouts logged yet. Your history will appear here.
          </Text>
        ) : (
          sessions.map(session => (
            <View key={session.id} style={styles.sessionRow}>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionName}>{session.name}</Text>
                {session.completedAt ? (
                  <Text style={styles.sessionDate}>{session.completedAt}</Text>
                ) : null}
              </View>
            </View>
          ))
        )}
        <Button variant="outline" onPress={onViewAll}>
          View history
        </Button>
      </CardContent>
    </Card>
  );
};

export default PreviousWorkoutsCard;

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
  },
  emptyText: {
    color: Colors.gray400,
    fontSize: 14,
  },
  sessionRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.cardBorder,
    paddingBottom: Spacing.sm,
  },
  sessionInfo: {
    gap: Spacing.xs,
  },
  sessionName: {
    color: Colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  sessionDate: {
    color: Colors.gray500,
    fontSize: 14,
  },
});
