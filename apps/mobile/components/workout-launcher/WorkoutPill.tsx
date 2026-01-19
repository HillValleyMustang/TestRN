import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowUp, ArrowDown, ArrowUpRight, ArrowDownLeft, Footprints, Plus } from 'lucide-react-native';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { getWorkoutColor } from '../../lib/workout-colors';

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

const getCategoryColor = (category: WorkoutCategory, workoutName?: string): string => {
  // If we have a workout name, use getWorkoutColor to get the exact color
  // This ensures ULUL workouts (Upper Body A, Upper Body B, Lower Body A, Lower Body B) get correct colors
  if (workoutName) {
    const colors = getWorkoutColor(workoutName);
    return colors.main;
  }
  
  // Fallback to category-based colors for backwards compatibility
  switch (category) {
    case 'push':
      return '#3B82F6'; // Blue
    case 'pull':
      return '#10B981'; // Green
    case 'legs':
      return '#F59E0B'; // Amber
    case 'upper':
      return '#8B5CF6'; // Purple (fallback for generic upper)
    case 'lower':
      return '#EF4444'; // Red (fallback for generic lower)
    case 'ad-hoc':
      return '#64748B'; // Slate (matches Ad Hoc Workout color)
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

const WorkoutPillComponent: React.FC<WorkoutPillProps> = ({
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
  // Use workout name to get the exact color (important for ULUL workouts)
  const backgroundColor = getCategoryColor(category, title);
  const IconComponent = getCategoryIcon(category);
  const lastCompletedText = formatLastCompleted(completedAt || null);

  // Memoize style objects to prevent unnecessary re-renders and layout recalculations
  const dynamicStyle = useMemo(() => ({
    backgroundColor: isSelected ? backgroundColor : Colors.card,
    borderColor: isSelected ? 'transparent' : backgroundColor,
    borderWidth: isSelected ? 0 : 2,
  }), [isSelected, backgroundColor]);

  const iconColor = useMemo(() => 
    isSelected ? Colors.white : backgroundColor,
    [isSelected, backgroundColor]
  );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        dynamicStyle,
        pressed && styles.pressed,
      ]}
      onPress={() => {
        onClick(id);
      }}
    >
      <View style={styles.content}>
        <IconComponent size={20} color={iconColor} />
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

// Memoize WorkoutPill to prevent re-renders when props haven't changed
export const WorkoutPill = React.memo(WorkoutPillComponent, (prevProps, nextProps) => {
  // Return true if props are equal (should skip re-render), false if different (should re-render)
  // Only re-render if these props actually change - onClick is compared by reference (should be stable via useCallback)
  return (
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.category === nextProps.category &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.completedAt?.getTime() === nextProps.completedAt?.getTime() &&
    prevProps.hideLastCompleted === nextProps.hideLastCompleted &&
    prevProps.onClick === nextProps.onClick
  );
});

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