import { View, Text, StyleSheet } from 'react-native';
import { formatWeight, convertWeight } from '@data/utils/unit-conversions';
import { ACHIEVEMENT_IDS, achievementsList } from '@data/constants/achievements';

export default function Index() {
  const weight = 100;
  const weightInLbs = convertWeight(weight, 'kg', 'lbs');
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Fitness Trainer</Text>
      <Text style={styles.subtitle}>Mobile App - Coming Soon</Text>
      <Text style={styles.info}>Expo SDK 54 • React Native 0.81</Text>
      
      <View style={styles.testSection}>
        <Text style={styles.testLabel}>Shared Package Test:</Text>
        <Text style={styles.testValue}>{formatWeight(weight, 'kg')} = {formatWeight(weightInLbs, 'lbs')}</Text>
        <Text style={styles.testValue}>Achievements loaded: {achievementsList.length}</Text>
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
});
