/**
 * NotificationPopover Component
 * Modal showing list of notifications (global + user alerts)
 * Fetches from Supabase: get_notifications_with_read_status RPC + user_alerts table
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { TextStyles } from '../constants/Typography';
import { useAuth } from '../app/_contexts/auth-context';
import { supabase } from '../app/_lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: string;
}

interface NotificationPopoverProps {
  visible: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function NotificationPopover({ visible, onClose, onUnreadCountChange }: NotificationPopoverProps) {
  const { userId } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data: globalNotifications, error: globalError } = await supabase
        .rpc('get_notifications_with_read_status');
      
      if (globalError) {
        console.error('[NotificationPopover] Error fetching global notifications:', globalError);
      }

      const { data: userAlerts, error: userAlertsError } = await supabase
        .from('user_alerts')
        .select('id, title, message, created_at, is_read, type')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (userAlertsError) {
        console.error('[NotificationPopover] Error fetching user alerts:', userAlertsError);
      }

      const allNotifications: Notification[] = [
        ...(globalNotifications || []),
        ...(userAlerts || []),
      ];

      allNotifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(allNotifications);
      const newUnreadCount = allNotifications.filter(n => !n.is_read).length;
      setUnreadCount(newUnreadCount);
      onUnreadCountChange?.(newUnreadCount);
    } catch (error) {
      console.error('[NotificationPopover] Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId, fetchNotifications]);

  useEffect(() => {
    if (visible && userId) {
      fetchNotifications();
    }
  }, [visible, userId, fetchNotifications]);

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      if (unreadNotifications.length === 0) {
        return;
      }

      const unreadUserAlerts = unreadNotifications.filter(n => 
        n.type === 'system_error' || n.type === 'achievement_error'
      );
      const unreadGlobalNotifications = unreadNotifications.filter(n => 
        n.type !== 'system_error' && n.type !== 'achievement_error'
      );

      if (unreadGlobalNotifications.length > 0) {
        const recordsToInsert = unreadGlobalNotifications.map(n => ({
          user_id: userId,
          notification_id: n.id,
          read_at: new Date().toISOString(),
        }));
        
        const { error } = await supabase
          .from('user_notifications')
          .insert(recordsToInsert);

        if (error) {
          console.error('[NotificationPopover] Error marking global notifications as read:', error);
        }
      }

      if (unreadUserAlerts.length > 0) {
        const alertIds = unreadUserAlerts.map(a => a.id);
        const { error } = await supabase
          .from('user_alerts')
          .update({ is_read: true })
          .in('id', alertIds);

        if (error) {
          console.error('[NotificationPopover] Error marking user alerts as read:', error);
        }
      }

      await fetchNotifications();
    } catch (error) {
      console.error('[NotificationPopover] Unexpected error in markAllAsRead:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'achievement':
        return 'trophy';
      case 'pr':
        return 'flame';
      case 'workout':
        return 'fitness';
      case 'reminder':
        return 'alarm';
      default:
        return 'notifications';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.popover} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Mark All as Read */}
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
              <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
              <Text style={styles.markAllText}>Mark all as read ({unreadCount})</Text>
            </TouchableOpacity>
          )}

          {/* Notifications List */}
          <ScrollView style={styles.scrollView}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading notifications...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off" size={48} color={Colors.mutedForeground} />
                <Text style={styles.emptyText}>No notifications yet</Text>
                <Text style={styles.emptySubtext}>
                  You'll see updates about your workouts, achievements, and more here
                </Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <View
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.is_read && styles.unreadItem,
                  ]}
                >
                  <View style={styles.notificationIcon}>
                    <Ionicons
                      name={getTypeIcon(notification.type)}
                      size={20}
                      color={notification.is_read ? Colors.mutedForeground : Colors.primary}
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={[
                      styles.notificationTitle,
                      !notification.is_read && styles.unreadTitle,
                    ]}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationMessage}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationDate}>
                      {formatDate(notification.created_at)}
                    </Text>
                  </View>
                  {!notification.is_read && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: Spacing.md,
  },
  popover: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    width: 360,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    ...TextStyles.h3,
    color: Colors.foreground,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  markAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    maxHeight: 500,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  unreadItem: {
    backgroundColor: Colors.muted + '20',
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    ...TextStyles.body,
    fontWeight: '600',
    color: Colors.foreground,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationMessage: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  notificationDate: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
});
