/**
 * AppHeader Component
 * Global header for all pages with menu, rolling status badge (centered), notifications, and profile
 * Reference: MOBILE_SPEC_01_LAYOUT_NAVIGATION.md Section 1
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { X } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { TextStyles } from '../constants/Typography';
import { useAuth } from '../app/_contexts/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRollingStatus } from '../hooks/useRollingStatus';
import { StatusInfoModal } from './StatusInfoModal';
import { HamburgerMenuSheet } from './HamburgerMenuSheet';
import { AvatarDropdown } from './AvatarDropdown';
import { NotificationPopover } from './NotificationPopover';
import { HapticPressable } from './HapticPressable';
import { supabase } from '../app/_lib/supabase';

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { session, userId } = useAuth();
  const { status, config, loading } = useRollingStatus();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: globalNotifications } = await supabase
        .rpc('get_notifications_with_read_status');

      const { data: userAlerts } = await supabase
        .from('user_alerts')
        .select('id, is_read')
        .eq('user_id', userId);

      const allNotifications = [
        ...(globalNotifications || []),
        ...(userAlerts || []),
      ];

      const count = allNotifications.filter((n: any) => !n.is_read).length;
      setUnreadCount(count);
    } catch (error) {
      console.error('[AppHeader] Error fetching unread count:', error);
    }
  }, [userId]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const getInitials = () => {
    const name = session?.user?.user_metadata?.full_name ||
                 session?.user?.user_metadata?.first_name ||
                 session?.user?.email?.split('@')[0] ||
                 'A';

    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return parts[0][0].toUpperCase();
    }
    return name.slice(0, 1).toUpperCase();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.content}>
        {/* Left: Menu Icon */}
        <HapticPressable onPress={() => setShowMenuSheet(true)} style={styles.iconButton} hapticStyle="light">
          <Ionicons name="menu" size={24} color={Colors.foreground} />
        </HapticPressable>

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
            <HapticPressable onPress={() => setShowStatusModal(true)} hapticStyle="light">
              <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
                <Ionicons name={config.icon} size={18} color={config.color} />
                <Text style={[styles.badgeText, { color: config.color }]}>
                  {status}
                </Text>
              </View>
            </HapticPressable>
          )}

          <HapticPressable onPress={() => setShowNotifications(true)} style={styles.iconButton} hapticStyle="light">
            <View>
              <Ionicons name="notifications" size={24} color={Colors.foreground} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </HapticPressable>

          <AvatarDropdown initials={getInitials()} />
        </View>
      </View>

      <StatusInfoModal visible={showStatusModal} onClose={() => setShowStatusModal(false)} />
      <HamburgerMenuSheet visible={showMenuSheet} onClose={() => setShowMenuSheet(false)} />
      <NotificationPopover 
        visible={showNotifications} 
        onClose={() => setShowNotifications(false)}
        onUnreadCountChange={setUnreadCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10000,
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
