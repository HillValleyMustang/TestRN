import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from './contexts/auth-context';
import { usePreferences } from './contexts/preferences-context';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { session, supabase } = useAuth();
  const { unitSystem, setUnitSystem, loading } = usePreferences();
  const router = useRouter();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/login');
          }
        }
      ]
    );
  };

  const toggleUnitSystem = async () => {
    await setUnitSystem(unitSystem === 'metric' ? 'imperial' : 'metric');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{session?.user?.email || 'Not available'}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>User ID</Text>
          <Text style={styles.infoValue}>{session?.user?.id?.slice(0, 8) || 'Not available'}...</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <TouchableOpacity 
          style={styles.settingRow}
          onPress={toggleUnitSystem}
          disabled={loading}
        >
          <View>
            <Text style={styles.settingLabel}>Unit System</Text>
            <Text style={styles.settingDescription}>
              {unitSystem === 'metric' ? 'Metric (kg, km)' : 'Imperial (lbs, miles)'}
            </Text>
          </View>
          <View style={[styles.toggle, unitSystem === 'imperial' && styles.toggleActive]}>
            <View style={[styles.toggleCircle, unitSystem === 'imperial' && styles.toggleCircleActive]} />
          </View>
        </TouchableOpacity>

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Theme</Text>
            <Text style={styles.settingDescription}>Dark mode</Text>
          </View>
          <View style={[styles.toggle, styles.toggleActive]}>
            <View style={[styles.toggleCircle, styles.toggleCircleActive]} />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>App Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Build</Text>
          <Text style={styles.infoValue}>Mobile (Expo)</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#0a0',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 1,
  },
  infoCard: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  infoLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  settingRow: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    color: '#888',
    fontSize: 14,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#0a0',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#666',
  },
  toggleCircleActive: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },
  signOutButton: {
    backgroundColor: '#a00',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
