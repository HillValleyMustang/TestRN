/**
 * PhotoSourceSelectionModal component for choosing photo source
 * Styled to match the app's design system
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

const { width } = Dimensions.get('window');

interface PhotoSourceSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromGallery: () => void;
}

export const PhotoSourceSelectionModal = ({
  visible,
  onClose,
  onTakePhoto,
  onChooseFromGallery,
}: PhotoSourceSelectionModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={[styles.title, TextStyles.h3]}>Add Progress Photo</Text>
            <Text style={[styles.subtitle, TextStyles.bodySmall]}>
              Choose how to add your photo
            </Text>
          </View>

          <View style={styles.options}>
            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onTakePhoto();
                onClose();
              }}
            >
              <View style={styles.optionContent}>
                <View style={[styles.optionIcon, styles.cameraIcon]}>
                  <Ionicons name="camera" size={24} color="white" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.optionText}>Take Photo</Text>
                  <Text style={styles.optionSubtext}>Use camera to capture</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onChooseFromGallery();
                onClose();
              }}
            >
              <View style={styles.optionContent}>
                <View style={[styles.optionIcon, styles.galleryIcon]}>
                  <Ionicons name="images" size={24} color="white" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.optionText}>Choose from Gallery</Text>
                  <Text style={styles.optionSubtext}>Select existing photo</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
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
    padding: Spacing.xl,
  },
  modal: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: width - Spacing.xl * 2,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    color: Colors.mutedForeground,
  },
  options: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  option: {
    padding: Spacing.lg,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  cameraIcon: {
    backgroundColor: Colors.primary,
  },
  galleryIcon: {
    backgroundColor: '#06B6D4', // Cyan color to match photo tab
  },
  textContainer: {
    flex: 1,
  },
  optionText: {
    ...TextStyles.body,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  optionSubtext: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  cancelButton: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    fontWeight: '600',
  },
});