/**
 * HapticPressable Component
 * Platform-aware Pressable with haptic feedback (iOS) and ripple effect (Android)
 */

import React from 'react';
import { Pressable, PressableProps, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface HapticPressableProps extends PressableProps {
  hapticStyle?: 'light' | 'medium' | 'heavy' | 'selection';
}

export function HapticPressable({ 
  onPress, 
  hapticStyle = 'light',
  style,
  children,
  ...props 
}: HapticPressableProps) {
  const handlePress = async (event: any) => {
    if (Platform.OS === 'ios') {
      switch (hapticStyle) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'selection':
          await Haptics.selectionAsync();
          break;
      }
    }
    
    onPress?.(event);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={style}
      android_ripple={{
        color: 'rgba(0, 0, 0, 0.1)',
        borderless: true,
      }}
      {...props}
    >
      {children}
    </Pressable>
  );
}
