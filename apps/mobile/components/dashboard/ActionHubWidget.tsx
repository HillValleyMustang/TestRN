/**
 * ActionHubWidget Component
 * 3x2 grid of quick action buttons
 * Reference: MOBILE_SPEC_02_DASHBOARD.md Section 4
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface ActionHubWidgetProps {
  onLogActivity?: () => void;
  onAICoach?: () => void;
  onWorkoutLog?: () => void;
  onConsistencyCalendar?: () => void;
}

export function ActionHubWidget({
  onLogActivity,
  onAICoach,
  onWorkoutLog,
  onConsistencyCalendar,
}: ActionHubWidgetProps) {
  const router = useRouter();
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);

  const handleLogActivity = () => {
    if (onLogActivity) {
      onLogActivity();
    } else {
      console.log('Log Activity pressed');
    }
  };

  const handleAICoach = () => {
    if (onAICoach) {
      onAICoach();
    } else {
      console.log('AI Coach pressed');
    }
  };

  const handleWorkoutLog = () => {
    if (onWorkoutLog) {
      onWorkoutLog();
    } else {
      console.log('Workout Log pressed');
    }
  };

  const handleConsistencyCalendar = () => {
    if (onConsistencyCalendar) {
      onConsistencyCalendar();
    } else {
      console.log('Consistency Calendar pressed');
    }
  };

  const handleMorePress = () => {
    setMoreMenuVisible(true);
  };

  const handleMoreMenuClose = () => {
    setMoreMenuVisible(false);
  };

  const handleMoreMenuOption = (route: string) => {
    setMoreMenuVisible(false);
    if (route === '/workout') {
      router.push('/(tabs)/workout');
    } else {
      router.push(route as any);
    }
  };

  return (
    <>
      <Card style={styles.container}>
        <Text style={styles.title}>Quick Links</Text>

        <View style={styles.grid}>
          {/* Row 1, Col 1: Log Activity */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleLogActivity}
          >
            <Ionicons name="fitness" size={20} color="#F97316" />
            <Text style={styles.buttonText}>Log Activity</Text>
          </Pressable>

          {/* Row 1, Col 2: AI Coach */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleAICoach}
          >
            <Ionicons name="sparkles" size={20} color="#FBBF24" />
            <Text style={styles.buttonText}>AI Coach</Text>
          </Pressable>

          {/* Row 1, Col 3: Workout Log */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleWorkoutLog}
          >
            <Ionicons name="time" size={20} color="#3B82F6" />
            <Text style={styles.buttonText}>Workout Log</Text>
          </Pressable>

          {/* Row 2, Col 1-2: Consistency Calendar (spans 2 columns) */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.buttonWide,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleConsistencyCalendar}
          >
            <Ionicons name="calendar" size={20} color="#8B5CF6" />
            <Text style={styles.buttonText}>Consistency Calendar</Text>
          </Pressable>

          {/* Row 2, Col 3: More */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleMorePress}
          >
            <Ionicons
              name={moreMenuVisible ? "chevron-up" : "chevron-down"}
              size={20}
              color={Colors.foreground}
            />
            <Text style={styles.buttonText}>More</Text>
          </Pressable>
        </View>
      </Card>

      <Modal
        visible={moreMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={handleMoreMenuClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleMoreMenuClose}
        >
          <View style={styles.dropdown}>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => handleMoreMenuOption('/workout')}
            >
              <Ionicons name="barbell" size={16} color={Colors.foreground} />
              <Text style={styles.dropdownText}>Start Workout</Text>
            </Pressable>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => handleMoreMenuOption('/exercises')}
            >
              <Ionicons name="barbell" size={16} color={Colors.foreground} />
              <Text style={styles.dropdownText}>Manage Exercises</Text>
            </Pressable>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => handleMoreMenuOption('/t-paths')}
            >
              <Ionicons name="list" size={16} color={Colors.foreground} />
              <Text style={styles.dropdownText}>Manage T-Paths</Text>
            </Pressable>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => handleMoreMenuOption('/profile?tab=settings&edit=true')}
            >
              <Ionicons name="settings" size={16} color={Colors.foreground} />
              <Text style={styles.dropdownText}>Profile Settings</Text>
            </Pressable>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  button: {
    flex: 1,
    minWidth: '30%',
    height: 80,
    backgroundColor: Colors.card,
    borderWidth: 0,
    borderRadius: 12,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonWide: {
    minWidth: '63%',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.02,
    elevation: 0,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.foreground,
  },
});
