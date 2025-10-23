/**
 * PhotoLightboxDialog — rewritten
 * Lightbox modal for timeline photos with:
 *  - Pinch-to-zoom (clamped 1x..3x)
 *  - Pan with bounds when zoomed
 *  - Swipe left/right between photos (FlatList paging)
 *  - Double-tap to toggle zoom (1x/2x)
 *  - Uploaded date display
 *  - Close button
 *  - Lazy signed-URL fetch with neighbor prefetch
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PanGestureHandler,
  PinchGestureHandler,
  TapGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { useAuth } from '../../app/_contexts/auth-context';
import { createSignedUrl } from '../../lib/imageUtils';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ----- Types -----
export type ProgressPhoto = {
  id: string;
  user_id: string;
  photo_path: string;
  notes?: string;
  workouts_since_last_photo?: number;
  created_at: string;
};

export interface PhotoLightboxDialogProps {
  visible: boolean;
  onClose: () => void;
  photos: ProgressPhoto[];
  initialPhotoIndex: number;
}

// ----- Constants -----
const SCALE_MIN = 1;
const SCALE_MAX = 3;

// Small helper
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export const PhotoLightboxDialog: React.FC<PhotoLightboxDialogProps> = ({
  visible,
  onClose,
  photos,
  initialPhotoIndex,
}) => {
  const { supabase } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  // Zoom / pan state
  const [zoomScale, setZoomScale] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lastOffset, setLastOffset] = useState({ x: 0, y: 0 });

  // Refs
  const flatListRef = useRef<FlatList<ProgressPhoto>>(null);
  const pinchRef = useRef<any>(null);
  const panRef = useRef<any>(null);
  const doubleTapRef = useRef<any>(null);

  // Reset zoom/pan
  const resetZoom = useCallback(() => {
    setZoomScale(1);
    setBaseScale(1);
    setPanOffset({ x: 0, y: 0 });
    setLastOffset({ x: 0, y: 0 });
  }, []);

  // Fetch helpers (lazy + neighbor prefetch)
  const ensureUrl = useCallback(
    async (p?: ProgressPhoto) => {
      if (!p || imageUrls.get(p.id)) return;
      try {
        const signed = await createSignedUrl(supabase, 'user-photos', p.photo_path, 3600);
        setImageUrls(prev => new Map(prev).set(p.id, signed));
      } catch (err) {
        console.error('[PhotoLightboxDialog] Signed URL error', err);
        // Store a sentinel to avoid retry-loop churn
        setImageUrls(prev => new Map(prev).set(p.id, ''));
      }
    },
    [imageUrls, supabase]
  );

  // Visible changes
  useEffect(() => {
    if (!visible) {
      // Keep URLs cached across open/close to aid UX; just reset gestures
      resetZoom();
      return;
    }
    // make sure the initial index is set and scrolled
    setCurrentIndex(initialPhotoIndex);
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: initialPhotoIndex, animated: false });
    }
  }, [visible, initialPhotoIndex, resetZoom]);

  // Fetch current + neighbors when index/visibility changes
  useEffect(() => {
    if (!visible || photos.length === 0) return;
    setLoading(true);
    const cur = photos[currentIndex];
    const prev = photos[currentIndex - 1];
    const next = photos[currentIndex + 1];
    Promise.all([ensureUrl(cur), ensureUrl(prev), ensureUrl(next)])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, currentIndex, photos, ensureUrl]);

  // Gesture handlers
  const onPinchGestureEvent = useCallback((e: any) => {
    const newScale = clamp(baseScale * e.nativeEvent.scale, SCALE_MIN, SCALE_MAX);
    setZoomScale(newScale);
  }, [baseScale]);

  const onPinchHandlerStateChange = useCallback((e: any) => {
    if (e.nativeEvent.state === State.END) {
      const finalScale = clamp(baseScale * e.nativeEvent.scale, SCALE_MIN, SCALE_MAX);
      setBaseScale(finalScale);
      setZoomScale(finalScale);
      // If we zoomed back to 1, snap pan back
      if (finalScale === 1) {
        setPanOffset({ x: 0, y: 0 });
        setLastOffset({ x: 0, y: 0 });
      }
    }
  }, [baseScale]);

  const onPanGestureEvent = useCallback((e: any) => {
    if (zoomScale <= 1) return; // let FlatList handle swipes

    // Compute max pan based on container size and scale.
    // Our image container below uses aspectRatio: 1 and fills screen width.
    const containerW = SCREEN_WIDTH;
    const containerH = SCREEN_WIDTH; // square container
    const maxX = ((containerW * zoomScale) - containerW) / 2;
    const maxY = ((containerH * zoomScale) - containerH) / 2;

    const x = clamp(lastOffset.x + e.nativeEvent.translationX, -maxX, maxX);
    const y = clamp(lastOffset.y + e.nativeEvent.translationY, -maxY, maxY);
    setPanOffset({ x, y });
  }, [zoomScale, lastOffset.x, lastOffset.y]);

  const onPanHandlerStateChange = useCallback((e: any) => {
    if (e.nativeEvent.state === State.END) {
      setLastOffset(panOffset);
    }
  }, [panOffset]);

  const onDoubleTapActivated = useCallback(() => {
    if (zoomScale > 1) {
      resetZoom();
    } else {
      setZoomScale(2);
      setBaseScale(2);
      setPanOffset({ x: 0, y: 0 });
      setLastOffset({ x: 0, y: 0 });
    }
  }, [zoomScale, resetZoom]);

  // Index change -> reset gestures
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length > 0) {
      const newIdx = viewableItems[0].index ?? 0;
      if (newIdx !== currentIndex) {
        setCurrentIndex(newIdx);
        resetZoom();
      }
    }
  });

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  const formatDate = useCallback((s: string) => {
    return new Date(s).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }, []);

  const renderPhoto = useCallback(({ item }: { item: ProgressPhoto; index: number }) => {
    const uri = imageUrls.get(item.id);

    return (
      <View style={styles.slide}>
        <TapGestureHandler ref={doubleTapRef} numberOfTaps={2} onActivated={onDoubleTapActivated}>
          <View style={styles.gestureWrap}>
            <PinchGestureHandler
              ref={pinchRef}
              simultaneousHandlers={[panRef, doubleTapRef]}
              onGestureEvent={onPinchGestureEvent}
              onHandlerStateChange={onPinchHandlerStateChange}
            >
              <PanGestureHandler
                ref={panRef}
                simultaneousHandlers={[pinchRef, doubleTapRef]}
                onGestureEvent={onPanGestureEvent}
                onHandlerStateChange={onPanHandlerStateChange}
                minPointers={1}
                maxPointers={1}
              >
                <View style={styles.imageBox}>
                  {loading && !uri ? (
                    <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>
                  ) : uri ? (
                    <Image
                      source={{ uri }}
                      style={[styles.image, {
                        transform: [
                          { scale: zoomScale },
                          { translateX: panOffset.x },
                          { translateY: panOffset.y },
                        ],
                      }]}
                      resizeMode="contain"
                      onError={() => console.log('[PhotoLightboxDialog] Image failed')}
                    />
                  ) : (
                    <View style={styles.error}> 
                      <Ionicons name="image-outline" size={64} color={Colors.mutedForeground} />
                      <Text style={styles.errorText}>Failed to load photo</Text>
                    </View>
                  )}
                </View>
              </PanGestureHandler>
            </PinchGestureHandler>
          </View>
        </TapGestureHandler>

        <View style={styles.info}> 
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          {!!item.notes && <Text style={styles.notes}>{item.notes}</Text>}
        </View>
      </View>
    );
  }, [imageUrls, loading, onDoubleTapActivated, onPanGestureEvent, onPanHandlerStateChange, onPinchGestureEvent, onPinchHandlerStateChange, formatDate, panOffset.x, panOffset.y, zoomScale]);

  if (!visible || photos.length === 0) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{currentIndex + 1} of {photos.length}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close photo viewer"
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={Colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Photo pager */}
        <FlatList
          ref={flatListRef}
          data={photos}
          keyExtractor={(it) => it.id}
          renderItem={renderPhoto}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          initialScrollIndex={initialPhotoIndex}
          getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          // Critical: when zoomed, lock list scrolling so pan can move the photo
          scrollEnabled={zoomScale === 1}
        />

        {/* Zoom helper when >1x */}
        {zoomScale > 1 && (
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomButton} onPress={resetZoom}>
              <Ionicons name="contract" size={16} color={Colors.primary} />
              <Text style={[styles.zoomButtonText, TextStyles.small]}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

// ----- Styles -----
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  container: {
    backgroundColor: '#FFFFFF', borderRadius: BorderRadius.xl, margin: Spacing.lg,
    width: '95%', maxHeight: '95%', overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: {
    ...TextStyles.h3,
    color: Colors.foreground,
  },
  closeButton: {
    padding: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: 'rgba(255,255,255,0.2)',
  },
  slide: {
    width: SCREEN_WIDTH,
    padding: Spacing.lg,
  },
  gestureWrap: {
    width: '100%',
  },
  imageBox: {
    width: '100%', aspectRatio: 1, backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md, overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  image: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%', borderRadius: BorderRadius.md,
  },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  errorText: { ...TextStyles.body, color: Colors.mutedForeground, marginTop: Spacing.md, textAlign: 'center' },
  info: { marginTop: Spacing.md, alignItems: 'center' },
  dateText: { ...TextStyles.bodyBold, color: Colors.foreground },
  notes: { ...TextStyles.body, color: Colors.foreground, marginTop: Spacing.xs, textAlign: 'center' },
  zoomControls: {
    position: 'absolute', top: Spacing.xl + 80, right: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: BorderRadius.md, padding: Spacing.xs,
  },
  zoomButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  zoomButtonText: { color: Colors.primary, fontWeight: '600' },
});

export default PhotoLightboxDialog;
