/**
 * WelcomeHeader Component
 * Displays personalized welcome message
 * Reference: MOBILE_SPEC_02_DASHBOARD.md Section 2
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface WelcomeHeaderProps {
  userName: string;
  accountCreatedAt?: Date | string;
}

export function WelcomeHeader({ userName, accountCreatedAt }: WelcomeHeaderProps) {
  const isNewUser = () => {
    if (!accountCreatedAt) return false;
    
    const createdDate = typeof accountCreatedAt === 'string' 
      ? new Date(accountCreatedAt) 
      : accountCreatedAt;
    
    const now = new Date();
    const diffMinutes = (now.getTime() - createdDate.getTime()) / (1000 * 60);
    
    return diffMinutes < 5;
  };

  const greeting = isNewUser() ? 'Welcome' : 'Welcome Back,';
  const displayName = userName || 'Athlete';

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        {greeting} {displayName}
      </Text>
      <Text style={styles.subtitle}>
        Ready to Train? Let's get Started!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  heading: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.9,
    color: Colors.foreground,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
});
