/**
 * PhotoCaptureFlow component for capturing photos with pose ghost overlay
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../../app/_contexts/auth-context';
import { createSignedUrl } from '../../lib/imageUtils';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

const { width, height } = Dimensions.get('window');

interface PhotoCaptureFlowProps {
  visible: boolean;
  onClose: () => void;
  onPhotoCaptured: (uri: string) => void;
}

export const PhotoCaptureFlow = ({
  visible,
  onClose,
  onPhotoCaptured,
}: PhotoCaptureFlowProps) => {
  const { session, supabase, userId } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [isPoseGhostVisible, setIsPoseGhostVisible] = useState(false);
  const [ghostImageUrl, setGhostImageUrl] = useState<string | null>(null);
  const [loadingGhost, setLoadingGhost] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (visible && permission && !permission.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  const togglePoseGhost = async () => {
    const turningOn = !isPoseGhostVisible;
    setIsPoseGhostVisible(turningOn);

    if (turningOn && userId) {
      setLoadingGhost(true);
      try {
        const { data: latestPhoto, error: fetchError } = await supabase
          .from('progress_photos')
          .select('photo_path')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            Alert.alert('No Previous Photo', 'No previous photo found to use as a ghost overlay.');
            setIsPoseGhostVisible(false);
            return;
          }
          throw fetchError;
        }

        if (!latestPhoto) {
          Alert.alert('No Previous Photo', 'No previous photo found to use as a ghost overlay.');
          setIsPoseGhostVisible(false);
          return;
        }

        const signedUrl = await createSignedUrl(supabase, 'user-photos', latestPhoto.photo_path, 60);
        setGhostImageUrl(signedUrl);
      } catch (error: any) {
        console.error('[PhotoCaptureFlow] Error fetching pose ghost:', error);
        Alert.alert('Error', 'Could not load your last photo for the ghost overlay.');
        setIsPoseGhostVisible(false);
      } finally {
        setLoadingGhost(false);
      }
    } else {
      setGhostImageUrl(null);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo?.uri) {
        onPhotoCaptured(photo.uri);
      }
    } catch (error) {
      console.error('[PhotoCaptureFlow] Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const flipCamera = () => {
    setCameraType((current: CameraType) => current === 'back' ? 'front' : 'back');
  };

  if (!visible) return null;

  if (!permission) {
    return (
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Ionicons name="camera" size={64} color={Colors.mutedForeground} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Please enable camera permissions to capture progress photos.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
      >
        {/* Pose Ghost Overlay */}
        {isPoseGhostVisible && ghostImageUrl && (
          <View style={styles.ghostOverlay}>
            <View style={styles.ghostImageContainer}>
              <Text style={styles.ghostLabel}>Previous Photo</Text>
              <View style={styles.ghostImageWrapper}>
                <Image style={styles.ghostImage} source={{ uri: ghostImageUrl }} />
              </View>
            </View>
          </View>
        )}

        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.controlButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.topRightControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={togglePoseGhost}
              disabled={loadingGhost}
            >
              {loadingGhost ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={isPoseGhostVisible ? "eye" : "eye-off"}
                  size={24}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={flipCamera}>
              <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            {isPoseGhostVisible
              ? 'Position yourself to match the ghost overlay'
              : 'Position yourself for your progress photo'
            }
          </Text>
        </View>
      </CameraView>
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
    backgroundColor: '#000000',
    zIndex: 1000,
  },
  camera: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.mutedForeground,
    marginTop: Spacing.md,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cancelButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
  },
  ghostOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostImageContainer: {
    alignItems: 'center',
  },
  ghostLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  ghostImageWrapper: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  ghostImage: {
    width: width * 0.6,
    height: height * 0.4,
    opacity: 0.6,
  },
  topControls: {
    position: 'absolute',
    top: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRightControls: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: Spacing.xl * 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  instructions: {
    position: 'absolute',
    bottom: Spacing.xl * 4,
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
});