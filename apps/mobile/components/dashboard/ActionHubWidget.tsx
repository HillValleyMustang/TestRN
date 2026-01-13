/**
 * ActionHubWidget Component
 * 3+2 grid of quick action buttons with colored icons
 * Reference: MOBILE_SPEC_02_DASHBOARD.md Section 4
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { WorkoutPerformanceModal } from './WorkoutPerformanceModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ActionHubWidgetProps {
  onLogActivity?: (activity?: any) => void;
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
  const [moreButtonLayout, setMoreButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [workoutPerformanceVisible, setWorkoutPerformanceVisible] = useState(false);
  const moreButtonRef = useRef<View>(null);

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
      setWorkoutPerformanceVisible(true);
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
    moreButtonRef.current?.measureInWindow((x, y, width, height) => {
      setMoreButtonLayout({ x, y, width, height });
      setMoreMenuVisible(true);
    });
  };

  const handleMoreMenuClose = () => {
    setMoreMenuVisible(false);
  };

  const handleMoreMenuOption = (route: string) => {
    setMoreMenuVisible(false);
    router.push(route as any);
  };

  return (
    <>
      <Card style={styles.container}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Quick Links</Text>
        </View>

        <View style={styles.grid}>
          {/* Row 1: 3 buttons */}
          {/* Col 1: Log Activity */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleLogActivity}
          >
            <Ionicons name="fitness" size={22} color="#F97316" />
            <Text style={styles.buttonText}>Log Activity</Text>
          </Pressable>

          {/* Col 2: AI Coach */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleAICoach}
          >
            <Ionicons name="sparkles" size={22} color="#FBBF24" />
            <Text style={styles.buttonText}>AI Coach</Text>
          </Pressable>

          {/* Col 3: Workout Log */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleWorkoutLog}
          >
            <Ionicons name="time" size={22} color="#3B82F6" />
            <Text style={styles.buttonText}>Workout Log</Text>
          </Pressable>

          {/* Row 2: 2 buttons */}
          {/* Consistency Calendar (spans 2 columns) */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.buttonWide,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleConsistencyCalendar}
          >
            <Ionicons name="calendar" size={22} color="#8B5CF6" />
            <Text style={styles.buttonText}>Consistency Calendar</Text>
          </Pressable>

          {/* More - same width as Workout Log button to align right edges */}
          <View ref={moreButtonRef} collapsable={false} style={styles.buttonWrapper}>
            <Pressable
              style={({ pressed }) => [
                styles.buttonInner,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleMorePress}
            >
              <Ionicons
                name={moreMenuVisible ? "chevron-up" : "chevron-down"}
                size={22}
                color={Colors.foreground}
              />
              <Text style={styles.buttonText}>More</Text>
            </Pressable>
          </View>
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
          <View style={[
            styles.dropdown,
            {
              position: 'absolute',
              top: moreButtonLayout.y + moreButtonLayout.height + 8,
              right: SCREEN_WIDTH - (moreButtonLayout.x + moreButtonLayout.width),
            }
          ]}>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => handleMoreMenuOption('/exercises')}
            >
              <Ionicons name="barbell" size={16} color="#F97316" />
              <Text style={styles.dropdownText}>Manage Exercises</Text>
            </Pressable>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => handleMoreMenuOption('/t-paths')}
            >
              <Ionicons name="list" size={16} color="#8B5CF6" />
              <Text style={styles.dropdownText}>Manage T-Paths</Text>
            </Pressable>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => handleMoreMenuOption('/profile?tab=settings&edit=true')}
            >
              <Ionicons name="settings" size={16} color="#6B7280" />
              <Text style={styles.dropdownText}>Profile Settings</Text>
            </Pressable>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => handleMoreMenuOption('/achievements')}
            >
              <Ionicons name="trophy" size={16} color="#FBBF24" />
              <Text style={styles.dropdownText}>Achievements</Text>
            </Pressable>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => handleMoreMenuOption('/measurements')}
            >
              <Ionicons name="bar-chart" size={16} color="#3B82F6" />
              <Text style={styles.dropdownText}>Measurements</Text>
            </Pressable>
          </View>
        </TouchableOpacity>
      </Modal>

      <WorkoutPerformanceModal
        visible={workoutPerformanceVisible}
        onClose={() => setWorkoutPerformanceVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  titleRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  button: {
    height: 78,
    backgroundColor: Colors.card,
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    flexBasis: '30%',
    flexGrow: 0,
    flexShrink: 0,
  },
  buttonWide: {
    flexBasis: '63%',
    flexGrow: 0,
    flexShrink: 0,
  },
  buttonWrapper: {
    flexBasis: '30%',
    flexGrow: 0,
    flexShrink: 0,
  },
  buttonInner: {
    height: 78,
    backgroundColor: Colors.card,
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.02,
    elevation: 0,
  },
  buttonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.foreground,
  },
});
