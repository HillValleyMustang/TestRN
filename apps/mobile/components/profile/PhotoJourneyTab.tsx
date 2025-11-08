/**
 * PhotoJourneyTab component for displaying progress photos grid
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Dimensions, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../app/_contexts/auth-context';
import { PhotoCard } from './PhotoCard';
import { PhotoComparisonDialog } from './PhotoComparisonDialog';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

const { width } = Dimensions.get('window');

type ProgressPhoto = {
  id: string;
  user_id: string;
  photo_path: string;
  notes?: string;
  workouts_since_last_photo?: number;
  created_at: string;
};

interface PhotoJourneyTabProps {
  photos: ProgressPhoto[];
  loading: boolean;
  onPhotoPress?: (photo: ProgressPhoto, index: number) => void;
  onPhotoDelete?: (photo: ProgressPhoto) => void;
  onComparisonOpen?: () => void;
  onComparisonClose?: () => void;
  onPhotosSelected?: (photos: ProgressPhoto[]) => void;
  onGoalPhysiquePress?: () => void;
}

export const PhotoJourneyTab = ({ photos, loading, onPhotoPress, onPhotoDelete, onComparisonOpen, onComparisonClose, onPhotosSelected, onGoalPhysiquePress }: PhotoJourneyTabProps) => {
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonSourcePhoto, setComparisonSourcePhoto] = useState<ProgressPhoto | null>(null);
  const [comparisonComparisonPhoto, setComparisonComparisonPhoto] = useState<ProgressPhoto | null>(null);

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<ProgressPhoto[]>([]);


  // Lazy loading state - start with all photos visible for now
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50, // Item must be 50% visible
    minimumViewTime: 300, // Must be visible for 300ms
  });

  // Initialize all photos as visible when photos change
  useEffect(() => {
    if (photos.length > 0) {
      const allPhotoIds = new Set(photos.map(p => p.id));
      setVisibleItems(allPhotoIds);
    }
  }, [photos]);

  const handlePhotoPress = (photo: ProgressPhoto, index?: number) => {
    if (isSelectionMode) {
      // Handle selection mode
      if (selectedPhotos.find(p => p.id === photo.id)) {
        // Deselect photo
        setSelectedPhotos(selectedPhotos.filter(p => p.id !== photo.id));
      } else {
        // Select photo (max 2)
        if (selectedPhotos.length < 2) {
          setSelectedPhotos([...selectedPhotos, photo]);
        }
      }
    } else {
      // Normal mode - open lightbox
      if (onPhotoPress && index !== undefined) {
        onPhotoPress(photo, index);
      }
    }
  };

  const handleCompareLatest = () => {
    if (photos.length >= 2) {
      // Get the 2 most recent photos (photos are already sorted desc by created_at)
      const mostRecent = photos[0];
      const secondMostRecent = photos[1];
      onPhotosSelected?.([mostRecent, secondMostRecent]);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    const newVisibleItems = new Set(viewableItems.map((item: any) => item.item.id as string));
    setVisibleItems(newVisibleItems);
  });

  const handleSelectPhotos = () => {
    setIsSelectionMode(true);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedPhotos([]);
  };

  const handleCompareSelected = () => {
    if (selectedPhotos.length === 2) {
      onPhotosSelected?.(selectedPhotos);
      setIsSelectionMode(false);
      setSelectedPhotos([]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your progress photos...</Text>
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="camera" size={64} color={Colors.mutedForeground} />
        <Text style={styles.emptyTitle}>No progress photos yet</Text>
        <Text style={styles.emptySubtitle}>
          Start your progress journey by capturing your first photo using the camera button above
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, TextStyles.h3]}>
            {isSelectionMode ? 'Select 2 Photos to Compare Them!' : 'Progress Journey'}
          </Text>
          <Text style={[styles.subtitle, TextStyles.bodySmall]}>
            {isSelectionMode
              ? `Selected ${selectedPhotos.length} of 2 photos`
              : 'Track your transformation visually'
            }
          </Text>
        </View>
      </View>

      {!isSelectionMode ? (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.goalPhysiqueButton]}
            onPress={onGoalPhysiquePress}
          >
            <Ionicons name="trophy" size={20} color={Colors.primary} />
            <Text style={styles.goalPhysiqueButtonText}>
              Goal Physique
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.compareButton, photos.length < 2 && styles.disabledButton]}
            onPress={handleSelectPhotos}
            disabled={photos.length < 2}
          >
            <Ionicons name="git-compare" size={20} color={photos.length >= 2 ? Colors.primary : Colors.mutedForeground} />
            <Text style={[styles.compareButtonText, photos.length < 2 && styles.disabledText]}>
              Compare
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.selectionModeContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.mostRecentButton]}
            onPress={handleCompareLatest}
          >
            <Ionicons name="time" size={20} color="white" />
            <Text style={styles.mostRecentButtonText}>Most Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelSelection}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.compareSelectedButton, selectedPhotos.length !== 2 && styles.disabledButton]}
            onPress={handleCompareSelected}
            disabled={selectedPhotos.length !== 2}
          >
            <Ionicons name="git-compare" size={16} color="white" />
            <Text style={styles.compareSelectedButtonText}>Compare</Text>
          </TouchableOpacity>

        </View>
      )}

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          // Simple scroll handler for lazy loading
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

          // Load all visible items when scrolling - for now, load all photos since lazy loading logic is complex
          if (photos.length > 0) {
            const allPhotoIds = new Set(photos.map(p => p.id));
            setVisibleItems(allPhotoIds);
          }
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.timelineContainer}>
          <View style={styles.timelineLine} />
          {photos.map((photo, index) => {
            const isLeft = index % 2 === 0;
            return (
              <View key={photo.id} style={styles.timelineItem}>
                <View style={[styles.photoContainer, isLeft ? styles.photoLeft : styles.photoRight]}>
                  <PhotoCard
                    photo={photo}
                    onPress={() => handlePhotoPress(photo, index)}
                    onDelete={onPhotoDelete}
                    isSelected={selectedPhotos.some(p => p.id === photo.id)}
                    showSelectionIndicator={isSelectionMode}
                    isVisible={visibleItems.has(photo.id)}
                    isLeftSide={isLeft}
                    index={index}
                  />
                </View>
                <View style={styles.timelineDot} />
              </View>
            );
          })}
        </View>
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.mutedForeground,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 0, // Remove top padding completely
    paddingBottom: 0, // Remove bottom padding completely
    marginTop: -Spacing.lg, // Negative margin to pull header up
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
  },
  compareButton: {
    backgroundColor: Colors.muted,
  },
  compareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: Colors.mutedForeground,
  },
  timelineContainer: {
    position: 'relative',
    paddingTop: Spacing.xs, // Reduced from Spacing.sm to Spacing.xs for even tighter spacing
    paddingBottom: Spacing.xl * 2,
  },
  timelineLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: Colors.primary,
    zIndex: 1,
    marginLeft: -1, // Center the 2px line
  },
  timelineItem: {
    marginBottom: Spacing.sm,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoContainer: {
    width: width * 0.35,
  },
  photoLeft: {
    marginRight: width * 0.42,
  },
  photoRight: {
    marginLeft: width * 0.42,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.background,
    zIndex: 2,
    position: 'absolute',
    left: '50%',
    marginLeft: -8, // Center the 16px dot
  },
  headerButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  selectButton: {
    backgroundColor: Colors.muted,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  compareSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  compareSelectedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  bottomSpacing: {
    height: Spacing.xl * 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    marginLeft: '-10%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    minWidth: 120,
    justifyContent: 'center',
  },
  goalPhysiqueButton: {
    backgroundColor: Colors.muted,
  },
  goalPhysiqueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  cameraButton: {
    backgroundColor: Colors.primary,
  },
  cameraButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  selectionHint: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  selectionHintText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  cameraIconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionModeContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  mostRecentButton: {
    backgroundColor: Colors.primary,
  },
  mostRecentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  selectionInfo: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
});