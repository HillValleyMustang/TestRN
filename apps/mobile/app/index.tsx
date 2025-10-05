import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from './contexts/auth-context';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

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
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    fontWeight: '400',
  },
  infoCard: {
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  infoLabel: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#d1d5db',
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  onboardingButton: {
    backgroundColor: '#14B8A6',
    shadowColor: '#14B8A6',
  },
  photoButton: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
  },
  buttonEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
