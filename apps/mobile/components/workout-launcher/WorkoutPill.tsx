import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowUp, ArrowDown, ArrowUpRight, ArrowDownLeft, Footprints, Plus } from 'lucide-react-native';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

export type WorkoutType = 'push-pull-legs' | 'upper-lower';
export type WorkoutCategory = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'ad-hoc';

interface WorkoutPillProps {
  id: string;
  title: string;
  // workoutType: WorkoutType;
  category: WorkoutCategory;
  completedAt?: Date | null;
  isSelected?: boolean;
  onClick: (id: string) => void;
  // className?: string;
  hideLastCompleted?: boolean;
}

const getCategoryColor = (category: WorkoutCategory): string => {
  switch (category) {
    case 'push':
      return '#3B82F6'; // Blue
    case 'pull':
      return '#10B981'; // Green
    case 'legs':
      return '#F59E0B'; // Amber
    case 'upper':
      return '#8B5CF6'; // Purple
    case 'lower':
      return '#EF4444'; // Red
    case 'ad-hoc':
      return '#6B7280'; // Gray
    default:
      return Colors.primary;
  }
};

const getCategoryIcon = (category: WorkoutCategory) => {
  switch (category) {
    case 'push':
      return ArrowDownLeft;
    case 'pull':
      return ArrowUpRight;
    case 'legs':
      return Footprints;
    case 'upper':
      return ArrowUp;
    case 'lower':
      return ArrowDown;
    case 'ad-hoc':
      return Plus;
    default:
      return ArrowUp;
  }
};


const formatLastCompleted = (date: Date | null): string => {
  if (!date) return 'Never';
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

export const WorkoutPill: React.FC<WorkoutPillProps> = ({
  id,
  title,
  // workoutType,
  category,
  completedAt,
  isSelected = false,
  onClick,
  // className,
  hideLastCompleted = false,
}) => {
  const backgroundColor = getCategoryColor(category);
  const IconComponent = getCategoryIcon(category);
  const lastCompletedText = formatLastCompleted(completedAt || null);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: isSelected ? backgroundColor : Colors.card,
          borderColor: isSelected ? 'transparent' : backgroundColor,
          borderWidth: isSelected ? 0 : 2,
        },
        pressed && styles.pressed,
      ]}
      onPress={() => onClick(id)}
    >
      <View style={styles.content}>
        <IconComponent size={20} color={isSelected ? Colors.white : backgroundColor} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, isSelected && styles.selectedTitle]} numberOfLines={1}>
            {title}
          </Text>
          {!hideLastCompleted && lastCompletedText ? (
            <Text style={[styles.completed, isSelected && styles.selectedCompleted]} numberOfLines={1}>
              {lastCompletedText}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    margin: Spacing.xs,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
    maxWidth: 100,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TextStyles.button,
    color: Colors.foreground,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 12,
  },
  completed: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    opacity: 0.8,
    fontSize: 9,
    marginTop: 1,
  },
  selectedText: {
    color: Colors.white,
    fontWeight: '700',
  },
  selectedTitle: {
    color: Colors.white,
    fontWeight: '700',
  },
  selectedCompleted: {
    color: Colors.white,
    opacity: 0.8,
    fontWeight: '700',
  },
});