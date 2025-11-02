/**
 * ScreenHeader Component
 * Consistent header for all screens with title, back button, and actions
 * Matches web app header patterns
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  transparent?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  rightAction,
  style,
  transparent = false,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }, transparent && styles.transparent, style]}>
      <View style={styles.content}>
        {showBack && (
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
          </Pressable>
        )}
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        
        {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginTop: -Spacing.xl, // Move header up
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    minHeight: 56,
    justifyContent: 'center',
  },
  backButton: {
    marginRight: Spacing.md,
    padding: Spacing.xs,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    ...TextStyles.h3,
    color: Colors.foreground,
  },
  subtitle: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginTop: Spacing.xs / 2,
  },
  rightAction: {
    marginLeft: Spacing.md,
  },
});
