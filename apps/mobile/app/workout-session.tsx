import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from './contexts/auth-context';
import { useData } from './contexts/data-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { TPath } from '@data/storage/models';

// Color mapping for different workout types
function getWorkoutColors(workoutName: string, splitType: 'ppl' | 'ulul' | null) {
  const name = workoutName.toLowerCase();
  
  // PPL Colors - match variations
  if (name.includes('push')) {
    return { bg: '#10B981', text: '#FFFFFF', border: '#059669' };
  }
  if (name.includes('pull')) {
    return { bg: '#F59E0B', text: '#FFFFFF', border: '#D97706' };
  }
  if (name.includes('leg')) {
    return { bg: '#8B5CF6', text: '#FFFFFF', border: '#7C3AED' };
  }
  
  // ULUL Colors - match variations
  if (name.includes('upper') && (name.includes('a') || name.includes('1') || !name.includes('b'))) {
    return { bg: '#EF4444', text: '#FFFFFF', border: '#DC2626' };
  }
  if (name.includes('upper') && (name.includes('b') || name.includes('2'))) {
    return { bg: '#EC4899', text: '#FFFFFF', border: '#DB2777' };
  }
  if (name.includes('lower') && (name.includes('a') || name.includes('1') || !name.includes('b'))) {
    return { bg: '#06B6D4', text: '#FFFFFF', border: '#0891B2' };
  }
  if (name.includes('lower') && (name.includes('b') || name.includes('2'))) {
    return { bg: '#14B8A6', text: '#FFFFFF', border: '#0D9488' };
  }
  
  // Default
  return { bg: '#6366F1', text: '#FFFFFF', border: '#4F46E5' };
}

function getSplitTypeFromTPath(tPath: TPath | null): 'ppl' | 'ulul' | null {
  if (!tPath) return null;
  
  // First, check settings for explicit split type
  const settings = tPath.settings as any;
  if (settings?.tPathType === 'ppl' || settings?.tPathType === 'ulul') {
    return settings.tPathType;
  }
  
  // Fallback to template name detection
  if (tPath.template_name.toLowerCase().includes('push') || 
      tPath.template_name.toLowerCase().includes('pull') || 
      tPath.template_name.toLowerCase().includes('ppl')) {
    return 'ppl';
  }
  if (tPath.template_name.toLowerCase().includes('upper') || 
      tPath.template_name.toLowerCase().includes('lower') || 
      tPath.template_name.toLowerCase().includes('ulul')) {
    return 'ulul';
  }
  
  return null;
}

export default function WorkoutSessionScreen() {
  const { userId } = useAuth();
  const { getTPaths, getTPathProgress } = useData();
  const router = useRouter();
  const params = useLocalSearchParams();
  const tPathId = params.tPathId as string | undefined;

  const [mainTPath, setMainTPath] = useState<TPath | null>(null);
  const [childWorkouts, setChildWorkouts] = useState<TPath[]>([]);
  const [workoutProgress, setWorkoutProgress] = useState<Record<string, { last_accessed: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [activeGymName, setActiveGymName] = useState<string>('My Gym');

  const loadWorkouts = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const allTPaths = await getTPaths(userId, true);
      
      // Find the main T-Path (either from params or the first main program)
      let selectedMainTPath: TPath | null = null;
      if (tPathId) {
        selectedMainTPath = allTPaths.find(tp => tp.id === tPathId) || null;
      } else {
        // Find first main program (PPL or ULUL)
        selectedMainTPath = allTPaths.find(tp => 
          tp.is_main_program && (
            tp.template_name.includes('Push/Pull/Legs') || 
            tp.template_name.includes('Upper/Lower')
          )
        ) || null;
      }

      if (!selectedMainTPath) {
        setLoading(false);
        return;
      }

      setMainTPath(selectedMainTPath);

      // Get child workouts
      const children = allTPaths.filter(tp => tp.parent_t_path_id === selectedMainTPath.id);
      setChildWorkouts(children);

      // Load progress for each child workout
      const progressData: Record<string, { last_accessed: string | null }> = {};
      for (const child of children) {
        const progress = await getTPathProgress(child.id, userId);
        if (progress) {
          progressData[child.id] = { last_accessed: progress.last_accessed };
        }
      }
      setWorkoutProgress(progressData);

      // Extract gym name from settings if available
      const settings = selectedMainTPath.settings as any;
      if (settings?.gymName) {
        setActiveGymName(settings.gymName);
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
      Alert.alert('Error', 'Failed to load workouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkouts();
  }, [userId, tPathId]);

  const handleStartWorkout = (workout: TPath) => {
    router.push({
      pathname: '/workout',
      params: { workoutId: workout.id },
    });
  };

  const handleStartAdHoc = () => {
    router.push('/workout');
  };

  const getLastTrainedText = (workoutId: string): string => {
    const progress = workoutProgress[workoutId];
    if (!progress?.last_accessed) return 'Never';
    
    const lastDate = new Date(progress.last_accessed);
    const now = new Date();
    const diffMs = now.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading workouts...</Text>
      </View>
    );
  }

  if (!mainTPath) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Workout Session</Text>
          <Text style={styles.subtitle}>No workout program found</Text>
        </View>

        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>You don't have a workout program yet</Text>
          <Text style={styles.emptySubtext}>Create one using the AI Program Generator</Text>
          
          <TouchableOpacity 
            style={styles.generateButton}
            onPress={() => router.push('/ai-program-generator')}
          >
            <Text style={styles.generateButtonText}>✨ Generate Program</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.adHocSection}>
          <Text style={styles.adHocTitle}>⚡ Start Ad-Hoc Workout</Text>
          <Text style={styles.adHocSubtitle}>Start a workout without a T-Path. Add exercises as you go.</Text>
          <TouchableOpacity 
            style={styles.adHocButton}
            onPress={handleStartAdHoc}
          >
            <Text style={styles.adHocButtonText}>Start Empty</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const splitType = getSplitTypeFromTPath(mainTPath);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout Session</Text>
        <Text style={styles.subtitle}>Select a workout or start an ad-hoc session.</Text>
      </View>

      {/* Active Gym */}
      <View style={styles.gymSelector}>
        <Text style={styles.gymLabel}>Active Gym</Text>
        <View style={styles.gymBadge}>
          <Text style={styles.gymBadgeIcon}>🏋️</Text>
          <Text style={styles.gymBadgeText}>{activeGymName}</Text>
        </View>
      </View>

      {/* Main Program Header */}
      <View style={styles.programHeader}>
        <Text style={styles.programIcon}>🎯</Text>
        <Text style={styles.programName}>{mainTPath.template_name}</Text>
      </View>

      {/* Workout Buttons */}
      <View style={styles.workoutsContainer}>
        {childWorkouts.length === 0 ? (
          <View style={styles.noWorkoutsState}>
            <Text style={styles.noWorkoutsText}>No workouts in this program</Text>
          </View>
        ) : (
          childWorkouts.map((workout) => {
            const colors = getWorkoutColors(workout.template_name, splitType);
            const lastTrained = getLastTrainedText(workout.id);
            
            return (
              <TouchableOpacity
                key={workout.id}
                style={[styles.workoutButton, { backgroundColor: colors.bg, borderColor: colors.border }]}
                onPress={() => handleStartWorkout(workout)}
              >
                <View style={styles.workoutButtonContent}>
                  <View style={styles.workoutButtonLeft}>
                    <Text style={[styles.workoutButtonIcon, { color: colors.text }]}>
                      {workout.template_name.includes('Push') && '↗️'}
                      {workout.template_name.includes('Pull') && '↙️'}
                      {workout.template_name.includes('Legs') && '🦵'}
                      {workout.template_name.includes('Upper') && '💪'}
                      {workout.template_name.includes('Lower') && '🏃'}
                    </Text>
                    <View>
                      <Text style={[styles.workoutButtonTitle, { color: colors.text }]}>
                        {workout.template_name}
                      </Text>
                      <Text style={[styles.workoutButtonStatus, { color: colors.text, opacity: 0.8 }]}>
                        {lastTrained}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Ad-Hoc Workout Section */}
      <View style={styles.adHocSection}>
        <Text style={styles.adHocTitle}>⚡ Start Ad-Hoc Workout</Text>
        <Text style={styles.adHocSubtitle}>Start a workout without a T-Path. Add exercises as you go.</Text>
        
        <View style={styles.adHocButtons}>
          <TouchableOpacity 
            style={styles.adHocButton}
            onPress={handleStartAdHoc}
          >
            <Text style={styles.adHocButtonText}>Start Empty</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.generateButton}
            onPress={() => router.push('/ai-program-generator')}
          >
            <Text style={styles.generateButtonText}>✨ Generate</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  gymSelector: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gymLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  gymBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  gymBadgeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  gymBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  programIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  programName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  workoutsContainer: {
    padding: 20,
  },
  workoutButton: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 12,
  },
  workoutButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  workoutButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  workoutButtonStatus: {
    fontSize: 14,
    marginTop: 4,
  },
  adHocSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  adHocTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  adHocSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  adHocButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  adHocButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  adHocButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  generateButton: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  noWorkoutsState: {
    padding: 32,
    alignItems: 'center',
  },
  noWorkoutsText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  backButton: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366F1',
  },
});
