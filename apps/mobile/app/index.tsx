import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from './contexts/auth-context';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Colors, Spacing, BorderRadius, Typography, Shadows, ButtonStyles } from '../constants/design-system';

export default function Index() {
  const { session, userId, loading, supabase } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!session) {
    return null;
  }
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>My Fitness Trainer</Text>
        <Text style={styles.subtitle}>Your Personal Workout Companion</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Signed in as</Text>
        <Text style={styles.infoValue}>{session?.user?.email}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.primaryButton, styles.onboardingButton]} 
          onPress={() => router.push('/onboarding')}
        >
          <Text style={styles.buttonEmoji}>🚀</Text>
          <Text style={styles.primaryButtonText}>Start Onboarding</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/workout-session')}
        >
          <Text style={styles.buttonEmoji}>🎯</Text>
          <Text style={styles.primaryButtonText}>Start Workout</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/workout')}
        >
          <Text style={styles.buttonEmoji}>📝</Text>
          <Text style={styles.primaryButtonText}>Log Workout</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/progress')}
        >
          <Text style={styles.buttonEmoji}>📈</Text>
          <Text style={styles.primaryButtonText}>Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/templates')}
        >
          <Text style={styles.buttonEmoji}>📋</Text>
          <Text style={styles.primaryButtonText}>Templates</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/t-paths')}
        >
          <Text style={styles.buttonEmoji}>🎯</Text>
          <Text style={styles.primaryButtonText}>Workout Programs</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/history')}
        >
          <Text style={styles.buttonEmoji}>📊</Text>
          <Text style={styles.primaryButtonText}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/exercise-picker')}
        >
          <Text style={styles.buttonEmoji}>💪</Text>
          <Text style={styles.primaryButtonText}>Exercises</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.primaryButton, styles.photoButton]} 
          onPress={() => router.push('/gym-photo-analyzer')}
        >
          <Text style={styles.buttonEmoji}>📸</Text>
          <Text style={styles.primaryButtonText}>Analyze Gym</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/measurements-history')}
        >
          <Text style={styles.buttonEmoji}>📏</Text>
          <Text style={styles.primaryButtonText}>Body Measurements</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/goals-list')}
        >
          <Text style={styles.buttonEmoji}>🎯</Text>
          <Text style={styles.primaryButtonText}>Goals</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/achievements')}
        >
          <Text style={styles.buttonEmoji}>🏆</Text>
          <Text style={styles.primaryButtonText}>Achievements</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/gyms')}
        >
          <Text style={styles.buttonEmoji}>🏋️</Text>
          <Text style={styles.primaryButtonText}>Gyms</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/ai-program-generator')}
        >
          <Text style={styles.buttonEmoji}>✨</Text>
          <Text style={styles.primaryButtonText}>AI Program Generator</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.buttonEmoji}>⚙️</Text>
          <Text style={styles.primaryButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingTop: Spacing['6xl'],
    paddingBottom: Spacing['4xl'],
  },
  header: {
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontSize: Typography['4xl'],
    fontWeight: Typography.extrabold,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.base,
    color: Colors.gray400,
    fontWeight: Typography.regular,
  },
  infoCard: {
    marginBottom: Spacing['3xl'],
    padding: Spacing.lg,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  infoLabel: {
    fontSize: Typography.xs,
    color: Colors.success,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: Typography.sm,
    color: Colors.gray300,
  },
  buttonContainer: {
    gap: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...ButtonStyles.success,
  },
  onboardingButton: {
    backgroundColor: Colors.onboardingPrimary,
    shadowColor: Colors.onboardingPrimary,
  },
  photoButton: {
    backgroundColor: Colors.photoPrimary,
    shadowColor: Colors.photoPrimary,
  },
  buttonEmoji: {
    fontSize: Typography.xl,
    marginRight: Spacing.md,
  },
  primaryButtonText: {
    color: Colors.foreground,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    letterSpacing: 0.3,
  },
});
