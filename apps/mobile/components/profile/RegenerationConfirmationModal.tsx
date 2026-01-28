import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { useSettingsStrings } from '../../localization/useSettingsStrings';

interface RegenerationConfirmationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RegenerationConfirmationModal({
  visible,
  onConfirm,
  onCancel,
}: RegenerationConfirmationModalProps) {
  const strings = useSettingsStrings();
  const t = strings.workout_preferences.regeneration_confirm;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Ionicons name="help-circle" size={48} color={Colors.blue600} />
          </View>
          
          <Text style={styles.title}>{t.title}</Text>
          
          <Text style={styles.message}>{t.message}</Text>

          <View style={styles.logicContainer}>
            <View style={styles.logicItem}>
              <Ionicons name="flash" size={18} color={Colors.blue600} />
              <Text style={styles.logicText}>{t.dynamic_selection}</Text>
            </View>
            <View style={styles.logicItem}>
              <Ionicons name="medical" size={18} color={Colors.blue600} />
              <Text style={styles.logicText}>{t.injury_analysis}</Text>
            </View>
            <View style={styles.logicItem}>
              <Ionicons name="star" size={18} color={Colors.blue600} />
              <Text style={styles.logicText}>{t.custom_library}</Text>
            </View>
            <View style={styles.logicItem}>
              <Ionicons name="fitness" size={18} color={Colors.blue600} />
              <Text style={styles.logicText}>{t.gym_matching}</Text>
            </View>
          </View>
          
          <Text style={styles.subtitle}>{t.subtitle}</Text>
          
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>{t.cancel}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
              <Text style={styles.confirmText}>{t.confirm}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modal: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: Math.min(width - Spacing.xl * 2, 400),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontFamily: 'Poppins_700Bold',
  },
  message: {
    fontSize: 15,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    fontFamily: 'Poppins_600SemiBold',
  },
  logicContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  logicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logicText: {
    fontSize: 13,
    color: Colors.foreground,
    fontFamily: 'Poppins_500Medium',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.blue600,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    fontFamily: 'Poppins_600SemiBold',
  },
});
