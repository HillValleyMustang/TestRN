/**
 * Add Gym - Step 3a: AI Photo Analysis
 * Upload gym photos for AI equipment detection
 * Reference: profile s10 design
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../app/_contexts/auth-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { analyzeGymEquipment } from '../../lib/openai';
import { imageUriToBase64, uploadImageToSupabase } from '../../lib/imageUtils';

interface AnalyseGymPhotoDialogProps {
  visible: boolean;
  gymId: string;
  gymName: string;
  onBack: () => void;
  onFinish: () => void;
}

export const AnalyseGymPhotoDialog: React.FC<AnalyseGymPhotoDialogProps> = ({
  visible,
  gymId,
  gymName,
  onBack,
  onFinish,
}) => {
  const { userId, supabase } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access photos is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleUploadAndAnalyse = async () => {
    if (!imageUri || !userId) return;

    setIsAnalyzing(true);
    try {
      // Upload image to Supabase Storage
      const imagePath = `${userId}/${Date.now()}.jpg`;
      const imageUrl = await uploadImageToSupabase(supabase, 'user-uploads', imagePath, imageUri);

      // Convert image to base64 for AI analysis
      const base64Image = await imageUriToBase64(imageUri);

      // Update gym with image URL
      await supabase
        .from('gyms')
        .update({ image_url: imageUrl })
        .eq('id', gymId);

      // Analyze gym equipment with OpenAI
      const analysisResult = await analyzeGymEquipment(base64Image);

      // Insert detected equipment
      const equipmentInserts = analysisResult.equipment.flatMap((category) =>
        category.items.map((item) => ({
          gym_id: gymId,
          equipment_type: item,
          quantity: 1,
        }))
      );

      if (equipmentInserts.length > 0) {
        await supabase.from('gym_equipment').insert(equipmentInserts);
      }

      onFinish();
    } catch (error) {
      console.error('[AnalyseGymPhotoDialog] Error:', error);
      alert('Failed to analyze gym photo. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onBack}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onBack}
            disabled={isAnalyzing}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.title}>Analyse "{gymName}" with AI</Text>
          <Text style={styles.description}>
            Upload photos of your equipment. The AI will identify exercises and build a plan.
          </Text>

          {/* Upload Area */}
          <View style={styles.uploadContainer}>
            <View style={styles.dashedBorder}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={40} color={Colors.mutedForeground} />
                  <Text style={styles.uploadText}>
                    Upload photos of your gym equipment. Our AI will identify exercises you can do. You can upload multiple photos.
                  </Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handlePickImage}
              disabled={isAnalyzing}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.uploadButtonText}>
                {imageUri ? 'Change Photo' : 'Upload & Analyse'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.backButton]}
              onPress={onBack}
              disabled={isAnalyzing}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.finishButton,
                (isAnalyzing || !imageUri) && styles.finishButtonDisabled,
              ]}
              onPress={handleUploadAndAnalyse}
              disabled={isAnalyzing || !imageUri}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.finishButtonText}>Finish Setup</Text>
                </>
              )}
            </TouchableOpacity>
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
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  uploadContainer: {
    marginBottom: Spacing.lg,
  },
  dashedBorder: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    marginBottom: Spacing.md,
  },
  uploadText: {
    fontSize: 13,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: BorderRadius.md,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gray900,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  backButton: {
    backgroundColor: Colors.muted,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  finishButton: {
    flexDirection: 'row',
    gap: Spacing.xs,
    backgroundColor: Colors.gray900,
  },
  finishButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
