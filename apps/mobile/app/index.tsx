import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { formatWeight, convertWeight } from '@data/utils/unit-conversions';
import { ACHIEVEMENT_IDS, achievementsList } from '@data/constants/achievements';
import { useAuth } from './contexts/auth-context';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  const { session, userId, loading, supabase } = useAuth();
  const router = useRouter();
  const weight = 100;
  const weightInLbs = convertWeight(weight, 'kg', 'lbs');

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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0a0" />
      </View>
    );
  }

  if (!session) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Fitness Trainer</Text>
      <Text style={styles.subtitle}>Mobile App</Text>
      <Text style={styles.info}>Expo SDK 54 • React Native 0.81</Text>
      
      <View style={styles.testSection}>
        <Text style={styles.testLabel}>Authentication Test:</Text>
        <Text style={styles.testValue}>User ID: {userId}</Text>
        <Text style={styles.testValue}>Email: {session?.user?.email}</Text>
      </View>

      <View style={styles.testSection}>
        <Text style={styles.testLabel}>Shared Package Test:</Text>
        <Text style={styles.testValue}>{formatWeight(weight, 'kg')} = {formatWeight(weightInLbs, 'lbs')}</Text>
        <Text style={styles.testValue}>Achievements loaded: {achievementsList.length}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/workout-session')}
        >
          <Text style={styles.primaryButtonText}>🎯 Start Workout</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/workout')}
        >
          <Text style={styles.primaryButtonText}>📝 Log Workout</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/progress')}
        >
          <Text style={styles.primaryButtonText}>📈 Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/templates')}
        >
          <Text style={styles.primaryButtonText}>📋 Templates</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/t-paths')}
        >
          <Text style={styles.primaryButtonText}>🎯 Workout Programs</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/history')}
        >
          <Text style={styles.primaryButtonText}>📊 History</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/exercise-picker')}
        >
          <Text style={styles.primaryButtonText}>💪 Exercises</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/measurements-history')}
        >
          <Text style={styles.primaryButtonText}>📏 Body Measurements</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/goals-list')}
        >
          <Text style={styles.primaryButtonText}>🎯 Goals</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/achievements')}
        >
          <Text style={styles.primaryButtonText}>🏆 Achievements</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/gyms')}
        >
          <Text style={styles.primaryButtonText}>🏋️ Gyms</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/ai-program-generator')}
        >
          <Text style={styles.primaryButtonText}>✨ AI Program Generator</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.primaryButtonText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#888',
    marginBottom: 24,
  },
  info: {
    fontSize: 14,
    color: '#555',
  },
  testSection: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  testLabel: {
    fontSize: 12,
    color: '#0a0',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  testValue: {
    fontSize: 14,
    color: '#0f0',
    marginBottom: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: '#0a0',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signOutButton: {
    marginTop: 16,
    backgroundColor: '#a00',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
