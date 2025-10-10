/**
 * HamburgerMenuSheet Component
 * Side drawer navigation menu that slides in from the left
 * Reference: MOBILE_SPEC_01_LAYOUT_NAVIGATION.md Section 2
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HamburgerMenuSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface NavLink {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Dashboard', icon: 'home', route: '/dashboard' },
  { label: 'History', icon: 'time', route: '/workout-history' },
  { label: 'Activities', icon: 'bar-chart', route: '/progress' },
  { label: 'Exercises', icon: 'barbell', route: '/exercises' },
  { label: 'Management', icon: 'grid', route: '/manage-t-paths' },
  { label: 'Profile', icon: 'person', route: '/profile' },
  { label: 'Workout', icon: 'barbell', route: '/workout' },
];

export function HamburgerMenuSheet({ visible, onClose }: HamburgerMenuSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const slideAnim = React.useRef(new Animated.Value(-Dimensions.get('window').width)).current;
  const overlayAnim = React.useRef(new Animated.Value(0)).current;
  const [isRendered, setIsRendered] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setIsRendered(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isRendered) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -Dimensions.get('window').width,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsRendered(false);
      });
    }
  }, [visible]);

  const handleNavigation = (route: string) => {
    onClose();
    router.push(route as any);
  };

  const handleLogActivity = () => {
    onClose();
    console.log('Log Activity - TODO: Open Activity Dialog');
  };

  if (!isRendered && !visible) return null;

  return (
    <Modal
      transparent
      visible={isRendered}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.modalContainer}>
        {/* Overlay */}
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayAnim },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingTop: insets.top + Spacing.md,
              paddingBottom: insets.bottom + Spacing.md,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Navigation Links */}
          <View style={styles.navContainer}>
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.route || 
                             (link.route === '/dashboard' && pathname === '/');
              
              return (
                <Pressable
                  key={link.route}
                  onPress={() => handleNavigation(link.route)}
                  style={[
                    styles.navLink,
                    isActive && styles.navLinkActive,
                  ]}
                >
                  <Ionicons
                    name={link.icon}
                    size={16}
                    color={isActive ? Colors.actionPrimaryForeground : Colors.actionPrimary}
                  />
                  <Text
                    style={[
                      styles.navLinkText,
                      isActive && styles.navLinkTextActive,
                    ]}
                  >
                    {link.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Separator */}
          <View style={styles.separator} />

          {/* Log Activity Button */}
          <Pressable onPress={handleLogActivity} style={styles.logActivityButton}>
            <Ionicons name="add" size={16} color={Colors.actionPrimaryForeground} />
            <Text style={styles.logActivityText}>Log Activity</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: Dimensions.get('window').width > 360 ? 360 : Dimensions.get('window').width,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
  },
  navContainer: {
    gap: 4,
    paddingVertical: 4,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'transparent',
  },
  navLinkActive: {
    backgroundColor: Colors.actionPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  navLinkText: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.foreground,
  },
  navLinkTextActive: {
    color: Colors.actionPrimaryForeground,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  logActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.actionPrimary,
    borderRadius: BorderRadius.lg,
  },
  logActivityText: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.actionPrimaryForeground,
  },
});
