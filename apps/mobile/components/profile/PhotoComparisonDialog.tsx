/**
 * PhotoComparisonDialog component for comparing two progress photos with a slider
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import { PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
import { useAuth } from '../../app/_contexts/auth-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

type ProgressPhoto = {
  id: string;
  user_id: string;
  photo_path: string;
  notes?: string;
  workouts_since_last_photo?: number;
  created_at: string;
};

interface PhotoComparisonDialogProps {
  visible: boolean;
  onClose: () => void;
  sourcePhoto: ProgressPhoto | null;
  comparisonPhoto?: ProgressPhoto | null;
}

const proTips = [
  "Progress isn't always linear! Factors like water retention can affect daily photos. Stay consistent!",
  "Different lighting can change how a photo looks. For best results, try to use the same spot each time.",
  "Notice a difference in angle? Try using the Pose Ghost next time for a perfect match."
];

export const PhotoComparisonDialog = ({
  visible,
  onClose,
  sourcePhoto,
  comparisonPhoto: providedComparisonPhoto,
}: PhotoComparisonDialogProps) => {
  const { session, supabase } = useAuth();
  const [comparisonPhoto, setComparisonPhoto] = useState<ProgressPhoto | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [comparisonImageUrl, setComparisonImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sliderValue, setSliderValue] = useState(50);
  const [tip, setTip] = useState<string | null>(null);
  const [isTipVisible, setIsTipVisible] = useState(true);

  // Zoom and pan state
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lastScale, setLastScale] = useState(1);
  const [lastOffset, setLastOffset] = useState({ x: 0, y: 0 });

  // Refs for gesture handlers
  const panRef = useRef(null);
  const pinchRef = useRef(null);

  // Gesture handlers
  const onPinchGestureEvent = (event: any) => {
    const newScale = lastScale * event.nativeEvent.scale;
    setZoomScale(Math.max(0.5, Math.min(3, newScale)));
  };

  const onPinchHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      setLastScale(zoomScale);
    }
  };

  const onPanGestureEvent = (event: any) => {
    if (zoomScale > 1) {
      const newOffset = {
        x: lastOffset.x + event.nativeEvent.translationX,
        y: lastOffset.y + event.nativeEvent.translationY,
      };
      setPanOffset(newOffset);
    }
  };

  const onPanHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      setLastOffset(panOffset);
    }
  };

  const resetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setLastScale(1);
    setLastOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!visible) {
      setComparisonPhoto(null);
      setSourceImageUrl(null);
      setComparisonImageUrl(null);
      setLoading(false);
      // Reset zoom and pan when closing
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
      setLastScale(1);
      setLastOffset({ x: 0, y: 0 });
      return;
    }

    if (!sourcePhoto) return;

    const randomTip = proTips[Math.floor(Math.random() * proTips.length)];
    setTip(randomTip);
    setIsTipVisible(true);

    const fetchComparisonData = async () => {
      setLoading(true);
      try {
        // Get signed URL for source photo
        const { data: sourceUrlData, error: sourceUrlError } = await supabase.storage
          .from('user-photos')
          .createSignedUrl(sourcePhoto.photo_path, 60);
        if (sourceUrlError) throw sourceUrlError;
        setSourceImageUrl(sourceUrlData.signedUrl);

        // Use provided comparison photo
        if (providedComparisonPhoto) {
          setComparisonPhoto(providedComparisonPhoto);

          // Get signed URL for comparison photo
          const { data: comparisonUrlData, error: comparisonUrlError } = await supabase.storage
            .from('user-photos')
            .createSignedUrl(providedComparisonPhoto.photo_path, 60);
          if (comparisonUrlError) throw comparisonUrlError;
          setComparisonImageUrl(comparisonUrlData.signedUrl);
        } else {
          // Auto mode - find comparison photo
          if (!session?.user?.id) {
            throw new Error('User not authenticated');
          }

          const { data: allPhotos, error: photosError } = await supabase
            .from('progress_photos')
            .select('*')
            .eq('user_id', session.user.id)
            .neq('id', sourcePhoto.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (photosError && photosError.code !== 'PGRST116') {
            throw photosError;
          }

          if (!allPhotos) {
            throw new Error('No other photos found to compare with.');
          }

          setComparisonPhoto(allPhotos);

          // Get signed URL for comparison photo
          const { data: comparisonUrlData, error: comparisonUrlError } = await supabase.storage
            .from('user-photos')
            .createSignedUrl(allPhotos.photo_path, 60);
          if (comparisonUrlError) throw comparisonUrlError;
          setComparisonImageUrl(comparisonUrlData.signedUrl);
        }

      } catch (error: any) {
        console.error('[PhotoComparisonDialog] Error:', error);
        Alert.alert('Error', error.message || 'Could not load comparison photos.');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchComparisonData();
  }, [visible, sourcePhoto, providedComparisonPhoto, supabase, session]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, TextStyles.h3]}>Compare Progress</Text>
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
            ) : (
              <PinchGestureHandler
                ref={pinchRef}
                simultaneousHandlers={panRef}
                onGestureEvent={onPinchGestureEvent}
                onHandlerStateChange={onPinchHandlerStateChange}
              >
                <PanGestureHandler
                  ref={panRef}
                  simultaneousHandlers={pinchRef}
                  onGestureEvent={onPanGestureEvent}
                  onHandlerStateChange={onPanHandlerStateChange}
                  minPointers={1}
                  maxPointers={1}
                >
                  <View style={styles.gestureContainer}>
                    {comparisonImageUrl && (
                      <Image
                        source={{ uri: comparisonImageUrl }}
                        style={[
                          styles.image,
                          {
                            transform: [
                              { scale: zoomScale },
                              { translateX: panOffset.x },
                              { translateY: panOffset.y },
                            ],
                          },
                        ]}
                        resizeMode="contain"
                      />
                    )}
                    {sourceImageUrl && (
                      <Image
                        source={{ uri: sourceImageUrl }}
                        style={[
                          styles.image,
                          {
                            opacity: sliderValue / 100,
                            transform: [
                              { scale: zoomScale },
                              { translateX: panOffset.x },
                              { translateY: panOffset.y },
                            ],
                          },
                        ]}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                </PanGestureHandler>
              </PinchGestureHandler>
            )}
          </View>

          {/* Zoom controls */}
          {zoomScale > 1 && (
            <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomButton} onPress={resetZoom}>
                <Ionicons name="contract" size={16} color={Colors.primary} />
                <Text style={[styles.zoomButtonText, TextStyles.small]}>Reset</Text>
              </TouchableOpacity>
            </View>
          )}

          {isTipVisible && tip && (
            <View style={styles.tipContainer}>
              <View style={styles.tipHeader}>
                <Ionicons name="bulb" size={16} color={Colors.primary} />
                <Text style={[styles.tipTitle, TextStyles.bodyMedium]}>Pro Tip</Text>
                <TouchableOpacity onPress={() => setIsTipVisible(false)}>
                  <Ionicons name="close" size={16} color={Colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.tipText, TextStyles.bodySmall]}>{tip}</Text>
            </View>
          )}

          <View style={styles.sliderContainer}>
            <Slider
              containerStyle={styles.slider}
              minimumValue={0}
              maximumValue={100}
              value={sliderValue}
              onValueChange={(value: number | number[]) => setSliderValue(Array.isArray(value) ? value[0] : value)}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.muted}
              thumbTintColor={Colors.primary}
              step={1}
            />
            <View style={styles.sliderLabels}>
              <Text style={[styles.sliderLabel, TextStyles.small]}>
                {comparisonPhoto ? new Date(comparisonPhoto.created_at).toLocaleDateString() : 'Older'}
              </Text>
              <Text style={[styles.sliderLabel, TextStyles.small]}>
                {sourcePhoto ? new Date(sourcePhoto.created_at).toLocaleDateString() : 'Newer'}
              </Text>
            </View>
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
  subtitle: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
    color: Colors.mutedForeground,
    textAlign: 'center',
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
  tipContainer: {
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  tipTitle: {
    flex: 1,
    marginLeft: Spacing.xs,
  },
  tipText: {
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  sliderContainer: {
    marginTop: Spacing.lg,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  gestureContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  zoomControls: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  zoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  zoomButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    color: Colors.mutedForeground,
  },
});