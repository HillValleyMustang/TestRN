import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from './contexts/auth-context';
import { useData } from './contexts/data-context';
import { useUnitConversion } from './hooks/use-unit-conversion';

interface BodyMeasurement {
  id: string;
  user_id: string;
  measurement_date: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  left_arm_cm?: number;
  right_arm_cm?: number;
  left_thigh_cm?: number;
  right_thigh_cm?: number;
  notes?: string;
  created_at: string;
}

export default function MeasurementsHistoryScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { getBodyMeasurements, deleteBodyMeasurement, getWeightHistory } = useData();
  const { displayWeight, weightUnit } = useUnitConversion();

  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMeasurements = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getBodyMeasurements(userId);
      setMeasurements(data);
    } catch (error) {
      console.error('Error loading measurements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, getBodyMeasurements]);

  useEffect(() => {
    loadMeasurements();
  }, [loadMeasurements]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMeasurements();
  }, [loadMeasurements]);

  const handleDelete = (measurementId: string) => {
    Alert.alert(
      'Delete Measurement',
      'Are you sure you want to delete this measurement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBodyMeasurement(measurementId);
              await loadMeasurements();
            } catch (error) {
              console.error('Error deleting measurement:', error);
              Alert.alert('Error', 'Failed to delete measurement');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderMeasurement = (measurement: BodyMeasurement) => {
    const hasMeasurements = 
      measurement.weight_kg ||
      measurement.body_fat_percentage ||
      measurement.chest_cm ||
      measurement.waist_cm ||
      measurement.hips_cm ||
      measurement.left_arm_cm ||
      measurement.right_arm_cm ||
      measurement.left_thigh_cm ||
      measurement.right_thigh_cm;

    return (
      <View key={measurement.id} style={styles.measurementCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{formatDate(measurement.measurement_date)}</Text>
          <TouchableOpacity onPress={() => handleDelete(measurement.id)}>
            <Text style={styles.deleteButton}>🗑️</Text>
          </TouchableOpacity>
        </View>

        {hasMeasurements ? (
          <View style={styles.measurementsGrid}>
            {measurement.weight_kg && (
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Weight</Text>
                <Text style={styles.measurementValue}>{displayWeight(measurement.weight_kg)} {weightUnit}</Text>
              </View>
            )}
            {measurement.body_fat_percentage && (
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Body Fat</Text>
                <Text style={styles.measurementValue}>{measurement.body_fat_percentage.toFixed(1)}%</Text>
              </View>
            )}
            {measurement.chest_cm && (
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Chest</Text>
                <Text style={styles.measurementValue}>{measurement.chest_cm.toFixed(1)} cm</Text>
              </View>
            )}
            {measurement.waist_cm && (
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Waist</Text>
                <Text style={styles.measurementValue}>{measurement.waist_cm.toFixed(1)} cm</Text>
              </View>
            )}
            {measurement.hips_cm && (
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Hips</Text>
                <Text style={styles.measurementValue}>{measurement.hips_cm.toFixed(1)} cm</Text>
              </View>
            )}
            {measurement.left_arm_cm && (
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>L Arm</Text>
                <Text style={styles.measurementValue}>{measurement.left_arm_cm.toFixed(1)} cm</Text>
              </View>
            )}
            {measurement.right_arm_cm && (
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>R Arm</Text>
                <Text style={styles.measurementValue}>{measurement.right_arm_cm.toFixed(1)} cm</Text>
              </View>
            )}
            {measurement.left_thigh_cm && (
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>L Thigh</Text>
                <Text style={styles.measurementValue}>{measurement.left_thigh_cm.toFixed(1)} cm</Text>
              </View>
            )}
            {measurement.right_thigh_cm && (
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>R Thigh</Text>
                <Text style={styles.measurementValue}>{measurement.right_thigh_cm.toFixed(1)} cm</Text>
              </View>
            )}
          </View>
        ) : null}

        {measurement.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesText}>{measurement.notes}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Measurements History</Text>
        <TouchableOpacity onPress={() => router.push('/measurements')} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a0" />
        }
      >
        {loading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : measurements.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No measurements yet</Text>
            <Text style={styles.emptySubtext}>Tap + Add to record your first measurement</Text>
          </View>
        ) : (
          measurements.map(renderMeasurement)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#0a0',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    padding: 8,
  },
  addButtonText: {
    color: '#0a0',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  measurementCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  deleteButton: {
    fontSize: 20,
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  measurementItem: {
    width: '48%',
    marginBottom: 12,
    marginRight: '4%',
  },
  measurementLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  measurementValue: {
    fontSize: 16,
    color: '#0a0',
    fontWeight: 'bold',
  },
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  notesText: {
    fontSize: 14,
    color: '#ccc',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
});
