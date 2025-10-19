/**
 * Simple Pressable Component
 * Basic pressable with ripple effect (Android)
 */

import React from 'react';
import { Pressable } from 'react-native';

interface SimplePressableProps {
  children?: React.ReactNode;
  onPress?: () => void;
  style?: any;
}

export function HapticPressable({
  onPress,
  style,
  children,
  ...props
}: SimplePressableProps) {
  return (
    <Pressable
      onPress={onPress}
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
