/**
 * PhotoCard component for displaying individual progress photos with lazy loading
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../app/_contexts/auth-context';
import { createSignedUrl } from '../../lib/imageUtils';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

type ProgressPhoto = {
  id: string;
  user_id: string;
  photo_path: string;
  notes?: string;
  workouts_since_last_photo?: number;
  created_at: string;
};

interface PhotoCardProps {
  photo: ProgressPhoto;
  onPress?: () => void;
  onDelete?: ((photo: ProgressPhoto) => void) | undefined;
  isSelected?: boolean;
  showSelectionIndicator?: boolean;
  isVisible?: boolean; // For lazy loading
  isLeftSide?: boolean; // For timeline positioning
  index?: number; // For lightbox navigation
}

export const PhotoCard = ({ photo, onPress, onDelete, isSelected = false, showSelectionIndicator = false, isVisible = true, isLeftSide = true, index }: PhotoCardProps) => {
  const { supabase } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Start with false, only load when visible
  const hasLoadedRef = useRef(false);

  console.log('[PhotoCard] Rendered for photo:', photo.id, 'isVisible:', isVisible, 'hasLoaded:', hasLoadedRef.current);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (hasLoadedRef.current || !isVisible) return;

      setLoading(true);
      try {
        console.log('[PhotoCard] Fetching signed URL for:', photo.photo_path);
        // Use 1 hour expiration for progress photos since users may view them for extended periods
        const signedUrl = await createSignedUrl(supabase, 'user-photos', photo.photo_path, 3600);
        console.log('[PhotoCard] Signed URL created:', signedUrl ? 'success' : 'failed');
        setImageUrl(signedUrl);
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('[PhotoCard] Error fetching signed URL:', error);
        console.error('[PhotoCard] Photo path:', photo.photo_path);
        console.error('[PhotoCard] Supabase available:', !!supabase);
      } finally {
        setLoading(false);
      }
    };

    if (supabase && isVisible && !hasLoadedRef.current) {
      fetchSignedUrl();
    }
  }, [photo.photo_path, supabase, isVisible]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.imageContainer} onPress={onPress} activeOpacity={0.8}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="image-outline" size={32} color={Colors.mutedForeground} />
            <Text style={styles.errorText}>Image not available</Text>
          </View>
        )}

        {/* Selection indicator */}
        {showSelectionIndicator && (
          <View style={[styles.selectionIndicator, isSelected && styles.selectionIndicatorSelected]}>
            <Ionicons
              name={isSelected ? "checkmark-circle" : "ellipse-outline"}
              size={24}
              color={isSelected ? Colors.primary : Colors.mutedForeground}
            />
          </View>
        )}
      </TouchableOpacity>

      {/* Delete button positioned based on timeline side */}
      {!showSelectionIndicator && onDelete && (
        <TouchableOpacity
          style={[styles.deleteButton, isLeftSide ? styles.deleteButtonLeft : styles.deleteButtonRight]}
          onPress={() => onDelete(photo)}
          activeOpacity={0.8}
        >
          <Ionicons name="trash" size={16} color="white" />
        </TouchableOpacity>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.dateText}>{formatDate(photo.created_at)}</Text>
        <Text style={styles.notesText} numberOfLines={2}>
          {photo.notes || 'No notes'}
        </Text>
        {photo.workouts_since_last_photo != null && photo.workouts_since_last_photo > 0 && (
          <View style={styles.workoutsBadge}>
            <Ionicons name="fitness" size={12} color="#FFFFFF" />
            <Text style={styles.workoutsText}>
              {photo.workouts_since_last_photo} workout{photo.workouts_since_last_photo !== 1 ? 's' : ''} since last photo
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    aspectRatio: 1,
    width: '100%',
    backgroundColor: Colors.muted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  errorText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  infoContainer: {
    padding: Spacing.sm,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 2,
  },
  notesText: {
    fontSize: 11,
    color: Colors.mutedForeground,
    lineHeight: 14,
    marginBottom: Spacing.xs,
  },
  workoutsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    gap: 4,
  },
  workoutsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectionIndicator: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  selectionIndicatorSelected: {
    backgroundColor: Colors.primary,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteButtonLeft: {
    left: 8, // Position inside the photo, top-left corner
  },
  deleteButtonRight: {
    right: 8, // Position inside the photo, top-right corner
  },
});