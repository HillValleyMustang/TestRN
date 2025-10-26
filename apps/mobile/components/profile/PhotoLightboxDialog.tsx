/**
 * PhotoLightboxDialog — rewritten for Expo Go compatibility
 * Lightbox modal for timeline photos with:
 *  - Double-tap to toggle zoom (1x/2x)
 *  - Pan with bounds when zoomed (using PanResponder)
 *  - Swipe left/right between photos (FlatList paging)
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
  Animated,
  PanResponder,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  // Zoom / pan state - simplified for Animated
  const [zoomScale, setZoomScale] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Refs
  const flatListRef = useRef<FlatList<ProgressPhoto>>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const panAnim = useRef(new Animated.ValueXY({x:0, y:0})).current;
  const lastTapRef = useRef(0);
  const panOffsetRef = useRef({x: 0, y: 0});

  // Reset zoom/pan
  const resetZoom = useCallback(() => {
    setZoomScale(1);
    setBaseScale(1);
    setPanOffset({ x: 0, y: 0 });
    panOffsetRef.current = {x: 0, y: 0};
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(panAnim, {
        toValue: {x: 0, y: 0},
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
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

  // PanResponder for gestures - Expo Go compatible
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => zoomScale > 1, // Only respond when zoomed
      onMoveShouldSetPanResponder: () => zoomScale > 1,
      onPanResponderGrant: () => {
        // Start gesture
      },
      onPanResponderMove: (evt, gestureState) => {
        if (zoomScale <= 1) return; // let FlatList handle swipes

        // Compute max pan based on container size and scale.
        const containerW = SCREEN_WIDTH;
        const containerH = SCREEN_WIDTH; // square container
        const maxX = ((containerW * zoomScale) - containerW) / 2;
        const maxY = ((containerH * zoomScale) - containerH) / 2;

        const x = clamp(panOffsetRef.current.x + gestureState.dx, -maxX, maxX);
        const y = clamp(panOffsetRef.current.y + gestureState.dy, -maxY, maxY);
        panAnim.setValue({x, y});
      },
      onPanResponderRelease: () => {
        // Commit pan offset
        panOffsetRef.current = {x: panAnim.x._value, y: panAnim.y._value};
        setPanOffset(panOffsetRef.current);
      },
    })
  ).current;

  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 250) {
      if (zoomScale > 1) {
        resetZoom();
      } else {
        setZoomScale(2);
        setBaseScale(2);
        setPanOffset({ x: 0, y: 0 });
        panOffsetRef.current = {x: 0, y: 0};
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(panAnim, {
            toValue: {x: 0, y: 0},
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
    lastTapRef.current = now;
  }, [zoomScale, resetZoom]);


  // Handle scroll end to update current index
  const onMomentumScrollEnd = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < photos.length) {
      setCurrentIndex(newIndex);
      resetZoom();
    }
  }, [currentIndex, photos.length, resetZoom]);

  const formatDate = useCallback((s: string) => {
    return new Date(s).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }, []);

  const renderPhoto = useCallback(({ item }: { item: ProgressPhoto; index: number }) => {
    const uri = imageUrls.get(item.id);

    return (
      <View style={styles.slide}>
        <View style={styles.gestureWrap}>
          <Pressable
            onPress={handlePress}
            {...(zoomScale > 1 ? panResponder.panHandlers : {})}
          >
            <Animated.View style={styles.imageBox}>
              {loading && !uri ? (
                <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>
              ) : uri ? (
                <Animated.Image
                  source={{ uri }}
                  style={[styles.image, {
                    transform: [
                      { scale: scaleAnim },
                      { translateX: panAnim.x },
                      { translateY: panAnim.y },
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
            </Animated.View>
          </Pressable>
        </View>

        <View style={styles.info}>
           <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
           {!!item.notes && <Text style={styles.notes}>{item.notes}</Text>}

           {/* Page dots indicator - positioned under date/notes */}
           {photos.length > 1 && (
             <View style={styles.pageDots}>
               {photos.map((_, index) => (
                 <TouchableOpacity
                   key={index}
                   style={[
                     styles.pageDot,
                     index === currentIndex && styles.pageDotActive,
                   ]}
                   onPress={() => {
                     flatListRef.current?.scrollToIndex({
                       index,
                       animated: true,
                     });
                   }}
                 />
               ))}
             </View>
           )}
         </View>
      </View>
    );
  }, [imageUrls, loading, handlePress, formatDate, zoomScale, panOffset.x, panOffset.y]);

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
          onMomentumScrollEnd={onMomentumScrollEnd}
          initialScrollIndex={initialPhotoIndex}
          getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          // Allow swiping from anywhere on the card, but lock when zoomed for pan gestures
          scrollEnabled={zoomScale === 1}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="start"
          // Disable pan responder when scrolling is enabled
          // {...(zoomScale === 1 ? {} : panResponder.panHandlers)}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  gestureWrap: {
    width: '100%',
  },
  gestureContainer: {
    width: '100%',
  },
  imageBox: {
    width: SCREEN_WIDTH, aspectRatio: 1, backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md, overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
    marginHorizontal: -Spacing.lg, // Extend beyond slide padding
    paddingHorizontal: Spacing.sm, // Further reduce padding to shift image more right
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
  pageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: BorderRadius.md,
    minWidth: 60,
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  pageDotActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 12,
    height: 8,
    borderRadius: 4,
  },
});

export default PhotoLightboxDialog;
