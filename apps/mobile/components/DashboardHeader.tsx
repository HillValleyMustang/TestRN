/**
 * DashboardHeader Component
 * Header for dashboard with menu, rolling status badge (centered), notifications, and profile
 * Reference: MOBILE_SPEC_01_LAYOUT_NAVIGATION.md Section 1.3
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { useAuth } from '../app/_contexts/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRollingStatus } from '../hooks/useRollingStatus';

export function DashboardHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { status, config, loading } = useRollingStatus();

  const getInitials = () => {
    const name = session?.user?.user_metadata?.full_name || 
                 session?.user?.user_metadata?.first_name || 
                 session?.user?.email?.split('@')[0] || 
                 'A';
    
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.content}>
        {/* Left: Menu Icon */}
        <Pressable onPress={() => console.log('Open menu')} style={styles.iconButton}>
          <Ionicons name="menu" size={24} color={Colors.foreground} />
        </Pressable>

        {/* Center: Rolling Status Badge */}
        <View style={styles.centerSection}>
          {loading ? (
            <View style={[styles.badge, { backgroundColor: Colors.muted }]}>
              <Ionicons name="ellipsis-horizontal" size={14} color={Colors.mutedForeground} />
              <Text style={[styles.badgeText, { color: Colors.mutedForeground }]}>Loading...</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
              <Ionicons name={config.icon} size={14} color={config.color} />
              <Text style={[styles.badgeText, { color: config.color }]}>{status}</Text>
            </View>
          )}
        </View>

        {/* Right: Notification + Profile */}
        <View style={styles.rightGroup}>
          <Pressable onPress={() => console.log('Notifications')} style={styles.iconButton}>
            <View>
              <Ionicons name="notifications" size={24} color={Colors.foreground} />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>4</Text>
              </View>
            </View>
          </Pressable>

          <Pressable onPress={() => router.push('/profile')} style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    minHeight: 56,
  },
  iconButton: {
    padding: Spacing.xs,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: BorderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.actionPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
