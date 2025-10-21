/**
 * ScreenContainer Component
 * Consistent container for all screens with safe areas and padding
 */

import React from 'react';
import { ScrollView, View, StyleSheet, StyleProp, ViewStyle, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants/Theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

export function ScreenContainer({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  edges = ['bottom', 'left', 'right'],
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  const paddingStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  if (scroll) {
    return (
      <ScrollView
        style={[styles.scrollContainer, style]}
        contentContainerStyle={[styles.contentContainer, paddingStyle, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.actionPrimary}
              colors={[Colors.actionPrimary]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, paddingStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
