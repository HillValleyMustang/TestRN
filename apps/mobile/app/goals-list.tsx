import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from './contexts/auth-context';
import { useData, type Goal } from './contexts/data-context';
import { useUnitConversion } from './hooks/use-unit-conversion';

export default function GoalsListScreen() {
  const { userId } = useAuth();
  const { getGoals, deleteGoal } = useData();
  const { displayWeight, weightUnit } = useUnitConversion();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGoals = useCallback(async () => {
    if (!userId) return;
    try {
      const status = activeFilter === 'all' ? undefined : activeFilter;
      const data = await getGoals(userId, status);
      setGoals(data);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, getGoals, activeFilter]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGoals();
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteGoal(goalId);
            loadGoals();
          },
        },
      ]
    );
  };

  const getGoalTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      weight_loss: 'Weight Loss',
      weight_gain: 'Weight Gain',
      strength: 'Strength Goal',
      workout_frequency: 'Workout Frequency',
      body_fat: 'Body Fat %',
    };
    return labels[type] || type;
  };

  const calculateProgress = (goal: Goal): number => {
    if (!goal.current_value) return 0;
    const progress = (goal.current_value / goal.target_value) * 100;
    return Math.min(progress, 100);
  };

  const formatGoalValue = (goal: Goal, value: number): string => {
    switch (goal.goal_type) {
      case 'weight_loss':
      case 'weight_gain':
        return displayWeight(value);
      case 'strength':
        return `${displayWeight(value)}`;
      case 'workout_frequency':
        return `${value} workouts`;
      case 'body_fat':
        return `${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  const renderGoalCard = (goal: Goal) => {
    const progress = calculateProgress(goal);
    const isCompleted = goal.status === 'completed';
    const isActive = goal.status === 'active';

    return (
      <View key={goal.id} style={[styles.goalCard, isCompleted && styles.completedCard]}>
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleContainer}>
            <Text style={styles.goalType}>{getGoalTypeLabel(goal.goal_type)}</Text>
            {isCompleted && <Text style={styles.completedBadge}>✓ Completed</Text>}
            {isActive && <Text style={styles.activeBadge}>Active</Text>}
          </View>
          <TouchableOpacity onPress={() => handleDeleteGoal(goal.id)}>
            <Text style={styles.deleteButton}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.goalInfo}>
          <Text style={styles.goalTarget}>
            Target: {formatGoalValue(goal, goal.target_value)}
          </Text>
          {goal.current_value !== undefined && (
            <Text style={styles.goalCurrent}>
              Current: {formatGoalValue(goal, goal.current_value)}
            </Text>
          )}
        </View>

        {goal.current_value !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
          </View>
        )}

        {goal.target_date && (
          <Text style={styles.targetDate}>
            Target Date: {new Date(goal.target_date).toLocaleDateString()}
          </Text>
        )}

        {goal.notes && <Text style={styles.goalNotes}>{goal.notes}</Text>}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Goals</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading goals...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Goals</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'active' && styles.filterButtonActive]}
          onPress={() => setActiveFilter('active')}
        >
          <Text style={[styles.filterText, activeFilter === 'active' && styles.filterTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'completed' && styles.filterButtonActive]}
          onPress={() => setActiveFilter('completed')}
        >
          <Text style={[styles.filterText, activeFilter === 'completed' && styles.filterTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {goals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No goals yet</Text>
            <Text style={styles.emptySubtext}>
              Set goals to track your fitness progress
            </Text>
          </View>
        ) : (
          goals.map(renderGoalCard)
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/create-goal')}
      >
        <Text style={styles.addButtonText}>+ Create Goal</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    color: '#60a5fa',
    fontSize: 16,
    marginRight: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#60a5fa',
  },
  filterText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  goalCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#60a5fa',
  },
  completedCard: {
    borderColor: '#4ade80',
    opacity: 0.8,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalTitleContainer: {
    flex: 1,
  },
  goalType: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activeBadge: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadge: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    fontSize: 20,
    padding: 4,
  },
  goalInfo: {
    marginBottom: 12,
  },
  goalTarget: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  goalCurrent: {
    color: '#999',
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#60a5fa',
  },
  progressText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'right',
  },
  targetDate: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
  },
  goalNotes: {
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
  },
  addButton: {
    backgroundColor: '#60a5fa',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#999',
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
  },
});
