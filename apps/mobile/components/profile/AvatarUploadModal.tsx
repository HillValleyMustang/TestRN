import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { supabase } from '../../app/_lib/supabase';

interface AvatarUploadModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  currentAvatarUrl?: string;
  onSuccess: (avatarUrl: string) => void;
}

export function AvatarUploadModal({
  visible,
  onClose,
  userId,
  currentAvatarUrl,
  onSuccess,
}: AvatarUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant access to your photos to upload an avatar.');
      return false;
    }
    return true;
  };

  const pickImageFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera access to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const uploadAvatar = async () => {
    if (!selectedImage) return;

    setUploading(true);
    try {
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      
      const fileExt = 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onSuccess(publicUrl);
      setSelectedImage(null);
      onClose();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Upload Failed', 'Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    Alert.alert(
      'Remove Avatar',
      'Are you sure you want to remove your avatar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploading(true);
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', userId);

              if (error) throw error;

              onSuccess('');
              onClose();
            } catch (error) {
              console.error('Error removing avatar:', error);
              Alert.alert('Error', 'Failed to remove avatar. Please try again.');
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Change Avatar</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.gray700} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {selectedImage && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.preview} />
              </View>
            )}

            <TouchableOpacity
              style={styles.optionButton}
              onPress={takePhoto}
              disabled={uploading}
            >
              <Ionicons name="camera" size={24} color={Colors.blue600} />
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={pickImageFromLibrary}
              disabled={uploading}
            >
              <Ionicons name="images" size={24} color={Colors.blue600} />
              <Text style={styles.optionText}>Choose from Library</Text>
            </TouchableOpacity>

            {currentAvatarUrl && (
              <TouchableOpacity
                style={[styles.optionButton, styles.dangerButton]}
                onPress={removeAvatar}
                disabled={uploading}
              >
                <Ionicons name="trash" size={24} color={Colors.red600} />
                <Text style={[styles.optionText, styles.dangerText]}>Remove Avatar</Text>
              </TouchableOpacity>
            )}

            {selectedImage && (
              <TouchableOpacity
                style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={uploadAvatar}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color={Colors.white} />
                    <Text style={styles.uploadButtonText}>Upload</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  title: {
    ...TextStyles.h2,
    color: Colors.gray900,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.lg,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  preview: {
    width: 150,
    height: 150,
    borderRadius: BorderRadius.full,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  dangerButton: {
    borderColor: Colors.red200,
  },
  optionText: {
    ...TextStyles.bodyBold,
    color: Colors.gray900,
    marginLeft: Spacing.md,
  },
  dangerText: {
    color: Colors.red600,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.blue600,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    ...TextStyles.bodyBold,
    color: Colors.white,
  },
});
