/**
 * GoalPhysiqueUploadModal component for uploading and analysing goal physique photos
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../app/_contexts/auth-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { compressImage, validateImageSize, saveGoalPhysiquePhoto } from '../../lib/imageUtils';

const { width } = Dimensions.get('window');

interface GoalPhysiqueUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUploadSuccess: (goalPhysiqueId: string) => void;
}

export const GoalPhysiqueUploadModal = ({
  visible,
  onClose,
  onUploadSuccess,
}: GoalPhysiqueUploadModalProps) => {
  const { supabase, userId } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compressedImageUri, setCompressedImageUri] = useState<string | null>(null);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Gallery access is required to select goal physique photos.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // Validate file size (10MB limit for goal physiques)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert(
            'File too large',
            'Please select an image smaller than 10MB.'
          );
          return;
        }

        setSelectedImage(asset.uri);
      }
    } catch (error) {
      console.error('[GoalPhysiqueUpload] Image picker error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadGoalPhysique = async () => {
    if (!selectedImage || !userId) return;

    setUploading(true);

    try {
      // Compress the image
      console.log('[GoalPhysiqueUpload] Compressing goal physique image...');
      const compressedUri = await compressImage(selectedImage, 1920, 1920, 0.9);
      setCompressedImageUri(compressedUri);

      // Validate compressed size
      await validateImageSize(compressedUri, 10);

      // Save compressed image locally for user reference
      console.log('[GoalPhysiqueUpload] Saving compressed image locally...');
      const goalPhysiqueId = `temp_${Date.now()}`; // Temporary ID until we create the record
      const localPhotoPath = await saveGoalPhysiquePhoto(compressedUri, goalPhysiqueId);

      // Create goal physique record with local photo path
      console.log('[GoalPhysiqueUpload] Creating goal physique record...');
      const { data: goalPhysique, error: dbError } = await supabase
        .from('goal_physiques')
        .insert({
          user_id: userId,
          local_photo_path: localPhotoPath,
          display_name: `Goal Physique ${new Date().toLocaleDateString()}`,
          is_active: true, // Make this the active goal
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      console.log('[GoalPhysiqueUpload] Goal physique created successfully');
      onUploadSuccess(goalPhysique.id);
      onClose();
      resetModal();

    } catch (error: any) {
      console.error('[GoalPhysiqueUpload] Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to save goal physique');
    } finally {
      setUploading(false);
    }
  };

  const resetModal = () => {
    setSelectedImage(null);
    setCompressedImageUri(null);
    setLoading(false);
    setUploading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, TextStyles.h3]}>Set Goal Physique</Text>
            <Text style={[styles.subtitle, TextStyles.bodySmall]}>
              Upload a photo of your target physique for AI analysis
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {!selectedImage ? (
              <View style={styles.uploadArea}>
                <View style={styles.uploadIcon}>
                  <Ionicons name="camera" size={48} color={Colors.primary} />
                </View>
                <Text style={styles.uploadTitle}>Choose Goal Photo</Text>
                <Text style={styles.uploadSubtitle}>
                  Select an image that represents your target physique
                </Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={pickImage}
                  disabled={loading}
                >
                  <Text style={styles.selectButtonText}>
                    {loading ? 'Loading...' : 'Select from Gallery'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.previewArea}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                <View style={styles.previewActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => setSelectedImage(null)}
                    disabled={uploading}
                  >
                    <Ionicons name="close" size={20} color={Colors.foreground} />
                    <Text style={styles.cancelButtonText}>Change</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.uploadButton, uploading && styles.disabledButton]}
                    onPress={uploadGoalPhysique}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                        <Text style={styles.uploadButtonText}>Upload & Analyse</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.disclaimer}>
              <Ionicons name="information-circle" size={20} color={Colors.mutedForeground} />
              <Text style={styles.disclaimerText}>
                Your photo will be compressed and stored locally for reference. Only the compressed image is sent to AI analysis for personalised training recommendations.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    position: 'relative',
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    color: Colors.mutedForeground,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
  },
  uploadArea: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  uploadIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  uploadTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  uploadSubtitle: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  selectButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  selectButtonText: {
    ...TextStyles.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  previewArea: {
    alignItems: 'center',
  },
  previewImage: {
    width: width - Spacing.lg * 2,
    height: 300,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  previewActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  cancelButton: {
    backgroundColor: Colors.muted,
  },
  cancelButtonText: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: Colors.primary,
  },
  uploadButtonText: {
    ...TextStyles.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  disclaimerText: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    flex: 1,
    lineHeight: 18,
  },
});