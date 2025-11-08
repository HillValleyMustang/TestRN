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
  accountCreatedAt?: Date | string | undefined;
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

  const formatDisplayName = (name: string): string => {
    if (!name || name === 'Athlete') return 'Athlete';

    let namePart = name.trim();

    if (namePart.includes('@')) {
      namePart = namePart.split('@')[0];
    }

    const parts = namePart.split(/[\s._-]+/).filter(p => p.length > 0);

    if (parts.length === 0) {
      return 'Athlete';
    } else if (parts.length === 1) {
      const initial = parts[0][0]?.toUpperCase() || '';
      return initial ? `Athlete ${initial}!` : 'Athlete';
    } else if (parts.length === 2) {
      const firstInitial = parts[0][0]?.toUpperCase() || '';
      const secondInitial = parts[1][0]?.toUpperCase() || '';
      return `Athlete ${firstInitial}${secondInitial}!`;
    } else {
      const firstInitial = parts[0][0]?.toUpperCase() || '';
      const secondInitial = parts[1][0]?.toUpperCase() || '';
      return `Athlete ${firstInitial}${secondInitial}!`;
    }
  };

  const greeting = isNewUser() ? 'Welcome' : 'Welcome Back,';
  const displayName = formatDisplayName(userName);

  return (
    <View style={styles.container}>
      <View style={styles.headingContainer}>
        <Text style={styles.greetingText}>{greeting}</Text>
        <Text style={styles.displayNameText}>{displayName}</Text>
      </View>
      <Text style={styles.subtitle}>
        Ready to Train? Let's get Started...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  headingContainer: {
    marginBottom: Spacing.xs,
  },
  greetingText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.9,
    color: Colors.foreground,
    lineHeight: 42,
  },
  displayNameText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.9,
    color: Colors.foreground,
    lineHeight: 42,
  },
  heading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.9,
    color: Colors.foreground,
    lineHeight: 42,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 22,
    color: Colors.mutedForeground,
    marginTop: Spacing.sm,
    lineHeight: 26,
  },
});
