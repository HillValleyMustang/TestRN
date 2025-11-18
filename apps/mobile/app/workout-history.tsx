/**
 * Workout History Page
 * Shows detailed workout history with grid layout and calendar modal
 * Matches web version design and functionality
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useWorkoutHistory from './_hooks/useWorkoutHistory';
import { useAuth } from './_contexts/auth-context';
import { useData } from './_contexts/data-context';
import { WorkoutHistoryCard } from '../components/ui/WorkoutHistoryCard';
import { ConsistencyCalendarModal } from '../components/dashboard/ConsistencyCalendarModal';
import { AppHeader } from '../components/AppHeader';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';

export default function WorkoutHistoryPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { supabase } = useAuth();
  const { deleteWorkoutSession } = useData();
  const { sessions, isLoading, error, refresh, removeSession } = useWorkoutHistory();
  const [refreshing, setRefreshing] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleViewSummary = async (sessionId: string) => {
    try {
      // Check if the session still exists before navigating
      const { data: session, error } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (error || !session) {
        Alert.alert('Error', 'This workout session no longer exists.');
        // Refresh the data to remove the deleted workout from the list
        await refresh();
        return;
      }

      // Navigate to the workout summary page
      router.push(`/workout-summary?sessionId=${sessionId}`);
    } catch (err) {
      console.error('Error checking session existence:', err);
      Alert.alert('Error', 'Failed to load workout summary');
    }
  };

  const handleDeleteSession = async (sessionId: string, templateName: string | null) => {
    if (!userId) return;

    try {
      console.log('Deleting session:', sessionId);

      // Actually delete the workout session from the database
      const { error: sessionError } = await supabase.from('workout_sessions').delete().eq('id', sessionId).eq('user_id', userId);
      if (sessionError) throw sessionError;

      // Also delete associated set logs
      const { error: setsError } = await supabase.from('set_logs').delete().eq('session_id', sessionId);
      if (setsError) throw setsError;

      console.log('Successfully deleted from database');

      Alert.alert(
        'Success',
        `"${templateName || 'Ad Hoc Workout'}" has been deleted.`,
        [{ text: 'OK' }]
      );

      // Immediately remove from hook state to update UI
      removeSession(sessionId);

      console.log('Removed from UI state');

      // Also delete from local database to ensure consistency
      try {
        await deleteWorkoutSession(sessionId);
        console.log('Deleted from local database');
      } catch (localError) {
        console.warn('Failed to delete from local database:', localError);
        console.log('deleteWorkoutSession function:', typeof deleteWorkoutSession);
        // Don't fail the whole operation if local delete fails
      }

    } catch (err) {
      console.error('Failed to delete workout session:', err);
      Alert.alert('Error', 'Failed to delete workout session');
    }
  };

  const renderWorkoutCard = ({ item }: { item: any }) => (
    <WorkoutHistoryCard
      session={item}
      onViewSummary={handleViewSummary}
      onDelete={handleDeleteSession}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Workouts Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start logging your workouts to see your history here!
      </Text>
      <TouchableOpacity
        style={styles.startWorkoutButton}
        onPress={() => router.push('/workout-launcher')}
      >
        <Text style={styles.startWorkoutText}>Start Your First Workout</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={48} color={Colors.destructive} />
      <Text style={styles.errorTitle}>Failed to Load History</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={refresh}>
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading workout history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      {/* Page Title */}
      <View style={styles.pageTitle}>
        <Text style={styles.pageTitleText}>Workout History</Text>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          Total Workouts: <Text style={styles.statsNumber}>{sessions.length}</Text>
        </Text>
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={() => setIsCalendarOpen(true)}
        >
          <Ionicons name="calendar-outline" size={16} color={Colors.actionPrimary} />
          <Text style={styles.calendarButtonText}>Calendar</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {error ? (
        renderError()
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderWorkoutCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.actionPrimary}
            />
          }
          showsVerticalScrollIndicator={false}
          key={sessions.length} // Force re-render when data length changes
        />
      )}

      {/* Modals */}
      <ConsistencyCalendarModal
        open={isCalendarOpen}
        onOpenChange={setIsCalendarOpen}
      />

      <WorkoutSummaryModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statsText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
  },
  statsNumber: {
    fontWeight: '600',
    color: Colors.actionPrimary,
    fontFamily: 'Poppins_600SemiBold',
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarButtonText: {
    fontSize: 12,
    color: Colors.actionPrimary,
    fontFamily: 'Poppins_500Medium',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
  },
  listContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular',
  },
  startWorkoutButton: {
    backgroundColor: Colors.actionPrimary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  startWorkoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.destructive,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    fontFamily: 'Poppins_600SemiBold',
  },
  errorSubtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    fontFamily: 'Poppins_400Regular',
  },
  retryButton: {
    backgroundColor: Colors.actionPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  spacer: {
    width: 40,
  },
  pageTitle: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  pageTitleText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
});