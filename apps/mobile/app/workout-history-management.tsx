/**
 * Workout History Management Screen
 * Full-screen component for managing workout data clearing
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { BackgroundRoot } from '../components/BackgroundRoot';
import { WorkoutHistoryManagement } from '../components/profile/WorkoutHistoryManagement';

export default function WorkoutHistoryManagementScreen() {
  return (
    <View style={styles.container}>
      <BackgroundRoot />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenContainer>
          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <WorkoutHistoryManagement />
          </ScrollView>
        </ScreenContainer>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});