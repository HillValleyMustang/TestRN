/**
 * Add Gym - Step 2: Setup Options
 * Shows 4 ways to add exercises to gym
 * Reference: profile s9 design
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles, FontFamily } from '../../constants/Typography';

interface SetupOption {
  id: 'ai' | 'copy' | 'defaults' | 'empty';
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  recommended?: boolean;
}

interface SetupGymOptionsDialogProps {
  visible: boolean;
  gymName: string;
  onClose: () => void;
  onSelectOption: (optionId: 'ai' | 'copy' | 'defaults' | 'empty') => void;
}

export const SetupGymOptionsDialog: React.FC<SetupGymOptionsDialogProps> = ({
  visible,
  gymName,
  onClose,
  onSelectOption,
}) => {
  const options: SetupOption[] = [
    {
      id: 'ai',
      title: 'Analyse Gym Photos',
      description: 'Upload photos to automatically create your equipment list',
      icon: 'camera',
      badge: 'AI',
      recommended: true,
    },
    {
      id: 'copy',
      title: 'Copy from Existing Gym',
      description: "Duplicate the setup from another gym you've created",
      icon: 'copy',
    },
    {
      id: 'defaults',
      title: 'Use App Defaults',
      description: 'Start with a standard set of common gym equipment',
      icon: 'sparkles',
    },
    {
      id: 'empty',
      title: 'Start from Empty',
      description: 'Manually add exercises to this gym from scratch',
      icon: 'add-circle',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.title}>Setup "{gymName}"</Text>
          <Text style={styles.description}>
            How would you like to add exercises to your new gym?
          </Text>

          {/* Options */}
          <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  option.recommended && styles.optionCardRecommended,
                  index === 2 && styles.optionCardWithDivider,
                ]}
                onPress={() => onSelectOption(option.id)}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={Colors.gray900}
                  />
                </View>

                <View style={styles.optionContent}>
                  <View style={styles.optionHeader}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    {option.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{option.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.mutedForeground,
    fontFamily: FontFamily.regular,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  description: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
  },
  optionsContainer: {
    marginTop: Spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    backgroundColor: '#fff',
  },
  optionCardRecommended: {
    borderColor: Colors.gray900,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  optionCardWithDivider: {
    marginTop: Spacing.sm,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: Colors.gray900,
    marginRight: Spacing.xs,
  },
  badge: {
    backgroundColor: Colors.gray900,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  optionDescription: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
});
