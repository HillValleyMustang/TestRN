/**
 * DashboardHeader Component
 * Header for dashboard with menu, rolling status badge (centered), notifications, and profile
 * Reference: MOBILE_SPEC_01_LAYOUT_NAVIGATION.md Section 1.3
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { useAuth } from '../app/_contexts/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRollingStatus } from '../hooks/useRollingStatus';
import { StatusInfoModal } from './StatusInfoModal';
import { HamburgerMenuSheet } from './HamburgerMenuSheet';
import { AvatarDropdown } from './AvatarDropdown';

export function DashboardHeader() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { status, config, loading } = useRollingStatus();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMenuSheet, setShowMenuSheet] = useState(false);

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
        <Pressable onPress={() => setShowMenuSheet(true)} style={styles.iconButton}>
          <Ionicons name="menu" size={24} color={Colors.foreground} />
        </Pressable>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Right: Rolling Status Badge + Notification + Profile */}
        <View style={styles.rightGroup}>
          {/* Rolling Status Badge */}
          {loading ? (
            <View style={[styles.badge, { backgroundColor: Colors.muted }]}>
              <Ionicons name="ellipsis-horizontal" size={18} color={Colors.mutedForeground} />
              <Text style={[styles.badgeText, { color: Colors.mutedForeground }]}>Loading...</Text>
            </View>
          ) : (
            <Pressable onPress={() => setShowStatusModal(true)}>
              <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
                <Ionicons name={config.icon} size={18} color={config.color} />
                <Text style={[styles.badgeText, { color: config.color }]}>{status}</Text>
              </View>
            </Pressable>
          )}

          <Pressable onPress={() => console.log('Notifications')} style={styles.iconButton}>
            <View>
              <Ionicons name="notifications" size={24} color={Colors.foreground} />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>4</Text>
              </View>
            </View>
          </Pressable>

          <AvatarDropdown initials={getInitials()} />
        </View>
      </View>

      <StatusInfoModal visible={showStatusModal} onClose={() => setShowStatusModal(false)} />
      <HamburgerMenuSheet visible={showMenuSheet} onClose={() => setShowMenuSheet(false)} />
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '700',
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
});
