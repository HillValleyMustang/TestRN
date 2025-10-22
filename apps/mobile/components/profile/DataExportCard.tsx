/**
 * Data Export Card
 * Allows users to export all workout data as CSV
 * Reference: profile s5/s6 design
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '../../app/_contexts/auth-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

export const DataExportCard: React.FC = () => {
  const { userId, supabase } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    if (!userId) return;

    setIsExporting(true);
    try {
      // Fetch all workout data
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercise:exercises (name)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (workoutsError) throw workoutsError;

      // Generate CSV content
      let csvContent = 'Date,Workout Name,Exercise,Sets,Reps,Weight,Notes\n';

      workouts?.forEach((workout) => {
        const workoutDate = new Date(workout.created_at).toLocaleDateString();
        const workoutName = workout.name || 'Unnamed Workout';

        workout.workout_exercises?.forEach((we: any) => {
          const exerciseName = we.exercise?.name || 'Unknown Exercise';
          const sets = we.sets || '';
          const reps = we.reps || '';
          const weight = we.weight || '';
          const notes = (workout.notes || '').replace(/"/g, '""');

          csvContent += `"${workoutDate}","${workoutName}","${exerciseName}","${sets}","${reps}","${weight}","${notes}"\n`;
        });
      });

      // Save CSV file
      const fileName = `fitness_data_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the file
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Workout Data',
        });
      } else {
        Alert.alert('Success', `Data exported to: ${fileUri}`);
      }
    } catch (error) {
      console.error('[DataExportCard] Export error:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header with Icon */}
      <View style={styles.header}>
        <Ionicons name="document-text" size={24} color={Colors.foreground} />
        <Text style={styles.title}>Data Export</Text>
      </View>

      {/* Description */}
      <Text style={styles.description}>
        Download all your workout sessions, set logs, and activity logs as a CSV file. This allows you to keep a personal backup of your fitness journey.
      </Text>

      {/* Export Button */}
      <TouchableOpacity
        style={[styles.button, isExporting && styles.buttonDisabled]}
        onPress={handleExportData}
        disabled={isExporting}
      >
        {isExporting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="download" size={20} color="#fff" />
            <Text style={styles.buttonText}>Export My Data</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
  description: {
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gray900,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    backgroundColor: Colors.gray400,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Poppins_600SemiBold',
  },
});
