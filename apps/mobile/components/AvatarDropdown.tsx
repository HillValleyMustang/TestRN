/**
 * AvatarDropdown Component
 * Avatar with dropdown menu (Profile link + Log out)
 * Reference: MOBILE_SPEC_01_LAYOUT_NAVIGATION.md Section 1.4.2
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { useAuth } from '../app/_contexts/auth-context';
import { HapticPressable } from './HapticPressable';

interface AvatarDropdownProps {
  initials: string;
}

export function AvatarDropdown({ initials }: AvatarDropdownProps) {
  const router = useRouter();
  const { session, supabase } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleProfilePress = () => {
    setShowMenu(false);
    router.push('/profile');
  };

  const handleLogout = async () => {
    setShowMenu(false);
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const userName = session?.user?.user_metadata?.full_name || 
                   session?.user?.user_metadata?.first_name || 
                   'Athlete';
  const userEmail = session?.user?.email || '';

  return (
    <View>
      <HapticPressable onPress={() => setShowMenu(true)} style={styles.avatar} hapticStyle="light">
        <Text style={styles.avatarText}>{initials}</Text>
      </HapticPressable>

      <Modal
        transparent
        visible={showMenu}
        onRequestClose={() => setShowMenu(false)}
        animationType="fade"
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContainer}>
            {/* Header */}
            <View style={styles.menuHeader}>
              <Text style={styles.menuHeaderName}>{userName}</Text>
              <Text style={styles.menuHeaderEmail}>{userEmail}</Text>
            </View>

            <View style={styles.separator} />

            {/* Profile Link */}
            <HapticPressable onPress={handleProfilePress} style={styles.menuItem} hapticStyle="light">
              <Ionicons name="person" size={16} color={Colors.foreground} />
              <Text style={styles.menuItemText}>Profile</Text>
            </HapticPressable>

            <View style={styles.separator} />

            {/* Log out */}
            <HapticPressable onPress={handleLogout} style={styles.menuItem} hapticStyle="medium">
              <Ionicons name="log-out" size={16} color={Colors.foreground} />
              <Text style={styles.menuItemText}>Log out</Text>
            </HapticPressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.actionPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.actionPrimaryForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: Spacing.md,
  },
  menuContainer: {
    width: 224,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  menuHeader: {
    paddingVertical: Spacing.xs,
  },
  menuHeaderName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.foreground,
  },
  menuHeaderEmail: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  menuItemText: {
    fontSize: 14,
    color: Colors.foreground,
  },
});
