import React from 'react';
import { View, Text, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWorkoutColor } from '../../lib/workout-colors';
import { Card } from '../ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface WorkoutSession {
  id: string;
  sessionId?: string;
  template_name: string;
  completed_at?: string | null;
  exercise_count?: number;
  duration_string?: string;
  total_volume?: number;
  sync_status?: 'local_only' | 'syncing' | 'synced' | 'sync_failed';
}

interface RecentSessionsListProps {
  sessions: WorkoutSession[];
  onDeleteSession: (sessionId: string, templateName: string) => void;
  loading?: boolean;
  maxItems?: number;
}

export const RecentSessionsList: React.FC<RecentSessionsListProps> = ({
  sessions,
  onDeleteSession,
  loading = false,
  maxItems = 10
}) => {
  const formatTimeAgo = (dateString?: string | null): string => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };


  const handleDelete = (sessionId: string, templateName: string) => {
    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete "${templateName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteSession(sessionId, templateName)
        }
      ]
    );
  };

  const renderSessionItem = ({ item: session }: { item: WorkoutSession }) => {
    const colors = getWorkoutColor(session.template_name);
    const timeAgo = formatTimeAgo(session.completed_at);

    return (
      <Card style={styles.sessionCard}>
        <View style={[styles.sessionBorder, { borderColor: colors.main }]}>
          <View style={styles.sessionContent}>
            <View style={styles.sessionLeft}>
              <View style={styles.sessionHeader}>
                <Text
                  style={[styles.sessionName, { color: colors.main }]}
                  numberOfLines={1}
                >
                  {session.template_name}
                </Text>
              </View>
              <Text style={styles.timeAgo}>{timeAgo}</Text>
              <View style={styles.sessionStats}>
                {session.exercise_count && (
                  <Text style={styles.statText}>
                    {session.exercise_count} exercises
                  </Text>
                )}
                {session.total_volume && (
                  <Text style={styles.statText}>
                    {session.total_volume.toFixed(0)}kg total
                  </Text>
                )}
                {session.duration_string && (
                  <Text style={styles.statText}>
                    {session.duration_string}
                  </Text>
                )}
              </View>

              {/* Mini volume indicator */}
              {session.total_volume && (
                <View style={styles.volumeIndicator}>
                  <View style={styles.volumeBar}>
                    <View
                      style={[
                        styles.volumeFill,
                        {
                          width: `${Math.min((session.total_volume / 1000) * 100, 100)}%`, // Scale relative to 1000kg
                          backgroundColor: colors.main
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.volumeLabel, { color: colors.main }]}>
                    Volume
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(session.sessionId || session.id, session.template_name)}
              accessibilityLabel={`Delete ${session.template_name} workout`}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="time" size={20} color={Colors.foreground} />
          <Text style={styles.title}>Recent Sessions</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      </Card>
    );
  }

  const displaySessions = sessions.slice(0, maxItems);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time" size={20} color={Colors.foreground} />
        <Text style={styles.title}>Recent Sessions</Text>
      </View>

      {displaySessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No recent workouts found. Complete a workout to see it here!
          </Text>
        </View>
      ) : (
        <FlatList
          data={displaySessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSessionItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </Card>
  );
};

const styles = {
  container: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  title: {
    ...TextStyles.h5,
    color: Colors.foreground,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center' as const,
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center' as const,
  },
  emptyText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center' as const,
  },
  listContainer: {
    paddingBottom: Spacing.sm,
  },
  separator: {
    height: Spacing.sm,
  },
  sessionCard: {
    paddingHorizontal: 0,
    paddingVertical: Spacing.xs,
  },
  sessionBorder: {
    borderLeftWidth: 3,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.card,
  },
  sessionContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: Spacing.md,
  },
  sessionLeft: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: Spacing.xs,
  },
  sessionName: {
    ...TextStyles.bodyMedium,
    fontWeight: '600' as const,
    flex: 1,
  },
  timeAgo: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    marginBottom: Spacing.xs,
  },
  sessionStats: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Spacing.sm,
  },
  statText: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  volumeIndicator: {
    marginTop: Spacing.xs,
    alignItems: 'center' as const,
  },
  volumeBar: {
    width: 60,
    height: 4,
    backgroundColor: Colors.secondary,
    borderRadius: 2,
    marginBottom: 2,
  },
  volumeFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 4,
  },
  volumeLabel: {
    ...TextStyles.small,
    fontWeight: '500' as const,
  },
  deleteButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
};