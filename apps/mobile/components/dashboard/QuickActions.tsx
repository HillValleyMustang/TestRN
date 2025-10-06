/**
 * QuickActions Component
 * Grid of quick action buttons matching web ActionHub
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface ActionButton {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress: () => void;
}

interface QuickActionsProps {
  actions?: ActionButton[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  const router = useRouter();

  const defaultActions: ActionButton[] = [
    {
      id: 'workout',
      title: 'Start Workout',
      icon: 'barbell',
      iconColor: Colors.actionPrimary,
      onPress: () => router.push('/(tabs)/workout'),
    },
    {
      id: 'ai-coach',
      title: 'AI Coach',
      icon: 'sparkles',
      iconColor: Colors.chart4,
      onPress: () => router.push('/ai-coach'),
    },
    {
      id: 'history',
      title: 'Workout Log',
      icon: 'time',
      iconColor: Colors.chart1,
      onPress: () => router.push('/history'),
    },
    {
      id: 'measurements',
      title: 'Log Activity',
      icon: 'fitness',
      iconColor: Colors.chart2,
      onPress: () => router.push('/measurements'),
    },
  ];

  const actionList = actions || defaultActions;

  return (
    <Card style={styles.container}>
      <Text style={styles.title}>Quick Links</Text>
      <View style={styles.grid}>
        {actionList.map((action) => (
          <Pressable
            key={action.id}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Ionicons name={action.icon} size={20} color={action.iconColor || Colors.foreground} />
            <Text style={styles.actionTitle}>{action.title}</Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  title: {
    ...TextStyles.h3,
    color: Colors.foreground,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.98 }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.02,
    elevation: 0,
  },
  actionTitle: {
    ...TextStyles.caption,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
  },
});
