/**
 * PhotoViewDialog component for viewing progress photos in a popup modal
 * Simple, clean popup similar to PhotoComparisonDialog
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../app/_contexts/auth-context';
import { createSignedUrl } from '../../lib/imageUtils';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

const { width, height } = Dimensions.get('window');

type ProgressPhoto = {
  id: string;
  user_id: string;
  photo_path: string;
  notes?: string;
  workouts_since_last_photo?: number;
  created_at: string;
};

interface PhotoViewDialogProps {
  visible: boolean;
  onClose: () => void;
  photos: ProgressPhoto[];
  initialPhotoIndex: number;
  onDelete?: (photo: ProgressPhoto) => void;
}

export const PhotoViewDialog = ({
  visible,
  onClose,
  photos,
  initialPhotoIndex,
  onDelete,
}: PhotoViewDialogProps) => {
  const { supabase } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    if (visible && currentPhoto) {
      fetchPhotoUrl(currentPhoto);
    }
  }, [visible, currentPhoto]);

  useEffect(() => {
    setCurrentIndex(initialPhotoIndex);
  }, [initialPhotoIndex]);

  const fetchPhotoUrl = async (photo: ProgressPhoto) => {
    if (!photo) return;

    setLoading(true);
    try {
      const signedUrl = await createSignedUrl(supabase, 'user-photos', photo.photo_path, 3600);
      setImageUrl(signedUrl);
    } catch (error) {
      console.error('[PhotoViewDialog] Error fetching photo URL:', error);
      Alert.alert('Error', 'Failed to load photo');
    } finally {
      setLoading(false);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDelete = () => {
    if (currentPhoto && onDelete) {
      Alert.alert(
        'Delete Photo',
        'Are you sure you want to delete this photo? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              onDelete(currentPhoto);
              // Close dialog if this was the last photo
              if (photos.length === 1) {
                onClose();
              } else if (currentIndex === photos.length - 1) {
                // If deleting the last photo, go to previous
                setCurrentIndex(currentIndex - 1);
              }
              // If deleting a middle photo, stay at current index (photos array will update)
            },
          },
        ]
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!visible || !currentPhoto) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, TextStyles.h3]}>View Photo</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.content, styles.contentTight]}>
          <View style={styles.imageContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
            ) : (
              <View style={styles.errorContainer}>
                <Ionicons name="image-outline" size={64} color={Colors.mutedForeground} />
                <Text style={styles.errorText}>Failed to load photo</Text>
              </View>
            )}
          </View>

          {/* Navigation controls */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabels}>
              {currentIndex > 0 && (
                <TouchableOpacity style={styles.navButton} onPress={goToPrevious}>
                  <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                  <Text style={[styles.navButtonText, TextStyles.small]}>Previous</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.photoCounter, TextStyles.body]}>
                {currentIndex + 1} of {photos.length}
              </Text>
              {currentIndex < photos.length - 1 && (
                <TouchableOpacity style={styles.navButton} onPress={goToNext}>
                  <Text style={[styles.navButtonText, TextStyles.small]}>Next</Text>
                  <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Photo Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.dateText}>{formatDate(currentPhoto.created_at)}</Text>

            {currentPhoto.notes && (
              <Text style={styles.notesText}>{currentPhoto.notes}</Text>
            )}

            {/* Delete button */}
            {onDelete && (
              <TouchableOpacity style={styles.deleteButtonBottom} onPress={handleDelete}>
                <Ionicons name="trash" size={16} color="#EF4444" />
                <Text style={styles.deleteButtonText}>Delete Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    margin: Spacing.lg,
    width: '95%',
    maxHeight: '95%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  contentTight: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  sliderContainer: {
    marginTop: Spacing.lg,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoCounter: {
    textAlign: 'center',
    flex: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  navButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  infoContainer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dateText: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  notesText: {
    ...TextStyles.body,
    color: Colors.foreground,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  deleteButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deleteButtonText: {
    ...TextStyles.body,
    color: '#EF4444',
    fontWeight: '600',
  },
});