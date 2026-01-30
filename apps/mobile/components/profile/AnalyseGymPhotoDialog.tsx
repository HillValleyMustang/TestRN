/**
 * Add Gym - Step 3a: AI Photo Analysis
 * Upload gym photos for AI equipment detection
 * Reference: profile s10 design
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../app/_contexts/auth-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { FontFamily } from '../../constants/Typography';
import { imageUriToBase64, uploadImageToSupabase, validateImageSize, compressImage } from '../../lib/imageUtils';

interface DetectedEquipment {
  category: string;
  items: string[];
}

interface DetectedExercise {
  name: string;
  main_muscle: string;
  type: string;
  category?: string;
  description?: string;
  pro_tip?: string;
  video_url?: string;
  movement_type?: string;
  movement_pattern?: string;
  duplicate_status: 'none' | 'global' | 'my-exercises';
  existing_id?: string | null;
}

interface AnalyseGymPhotoDialogProps {
  visible: boolean;
  gymId: string;
  gymName: string;
  onBack: () => void;
  onFinish: () => void;
  onExercisesGenerated?: (exercises: DetectedExercise[], base64Images: string[]) => void;
  maxPhotos?: number; // Maximum number of photos allowed (default: 12)
}

type FeedbackType = 'none' | 'no-equipment' | 'partial' | 'error' | 'unable-to-analyze';

interface AnalysisResult {
  imageIndex: number;
  hadEquipment: boolean;
  equipmentCount: number;
  error?: string;
}

export const AnalyseGymPhotoDialog: React.FC<AnalyseGymPhotoDialogProps> = ({
  visible,
  gymId,
  gymName,
  onBack,
  onFinish,
  onExercisesGenerated,
  maxPhotos = 12,
}) => {
  const { userId, supabase, session } = useAuth();
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // New state for edge case handling
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('none');
  const [totalEquipmentDetected, setTotalEquipmentDetected] = useState(0);

  // Refs for preventing memory leaks and race conditions
  const isMountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      isProcessingRef.current = false;
    };
  }, []);

  // Reset state when dialog opens
  useEffect(() => {
    if (visible) {
      setAnalysisProgress('');
      setAnalysisResults([]);
      setFeedbackMessage('');
      setFeedbackType('none');
      setTotalEquipmentDetected(0);
      // Don't reset retryAttempt or imageUris here - only on close
    } else {
      // Reset everything when dialog closes
      setImageUris([]);
      setRetryAttempt(0);
      setIsAnalyzing(false);
      setAnalysisProgress('');
      setAnalysisResults([]);
      setFeedbackMessage('');
      setFeedbackType('none');
      setTotalEquipmentDetected(0);
    }
  }, [visible]);

  // Timeout utility function
  const withTimeout = <T,>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  };

  // Session check helper
  const checkSession = () => {
    if (!supabase || !userId) {
      throw new Error('Session expired. Please try again.');
    }
  };

  // Combined gym analysis: equipment detection + exercise generation in a single Gemini call
  const analyzeGymComplete = async (
    base64Images: string[],
    accessToken: string,
    generateExercises: boolean,
    programmeType: 'ulul' | 'ppl' | null
  ): Promise<{ equipment: DetectedEquipment[]; identifiedExercises: DetectedExercise[]; rawResponse: string }> => {
    const SUPABASE_PROJECT_ID = 'mgbfevrzrbjjiajkqpti';
    const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/analyze-gym-complete`;

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        base64Images,
        gymId,
        generateExercises,
        programmeType: programmeType || 'ppl',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to analyze images' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  const handleTakePhoto = async () => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access camera is required');
      return;
    }

    // Check if we're at the limit
    const currentCount = imageUris.length;
    if (currentCount >= maxPhotos) {
      alert(`You have reached the maximum of ${maxPhotos} images. Please remove some images before adding more.`);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUri = result.assets[0].uri;
      const combinedUris = [...imageUris, newUri].slice(0, maxPhotos);
      setImageUris(combinedUris);
      if (isMountedRef.current) {
        setFeedbackType('none');
        setFeedbackMessage('');
        setRetryAttempt(0);
      }
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access photos is required');
      return;
    }

    // Calculate how many more images can be selected
    const currentCount = imageUris.length;
    const remainingSlots = Math.max(0, maxPhotos - currentCount);

    // If already at limit, show message
    if (currentCount >= maxPhotos) {
      alert(`You have reached the maximum of ${maxPhotos} images. Please remove some images before adding more.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: maxPhotos > 1,
      quality: 0.8,
      ...(maxPhotos > 1 && remainingSlots > 0 ? { selectionLimit: remainingSlots } : {}),
    });

    if (!result.canceled && result.assets.length > 0) {
      // Combine new selections with existing ones (up to max)
      const newUris = result.assets.map(asset => asset.uri);
      const combinedUris = [...imageUris, ...newUris].slice(0, maxPhotos); // Cap at maxPhotos
      setImageUris(combinedUris);
      // Clear previous feedback when new images are selected
      if (isMountedRef.current) {
        setFeedbackType('none');
        setFeedbackMessage('');
        // Reset retry counter when new images are selected
        setRetryAttempt(0);
      }
    }
  };

  const handleRetry = () => {
    // Prevent concurrent executions
    if (isAnalyzing || isProcessingRef.current) {
      return;
    }

    if (isMountedRef.current) {
      setRetryAttempt(retryAttempt + 1);
      setFeedbackType('none');
      setFeedbackMessage('');
      setAnalysisResults([]);
      setTotalEquipmentDetected(0);
    }
    handleUploadAndAnalyse();
  };

  const determineErrorType = (error: any): string => {
    if (!error) return 'unknown';
    
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('NetworkError')) {
      return 'network';
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return 'timeout';
    }
    if (errorMessage.includes('OpenAI') || errorMessage.includes('API') || errorMessage.includes('429') || errorMessage.includes('503')) {
      return 'api';
    }
    if (errorMessage.includes('image') || errorMessage.includes('base64') || errorMessage.includes('upload')) {
      return 'image-processing';
    }
    
    return 'unknown';
  };

  const handleUploadAndAnalyse = async () => {
    if (imageUris.length === 0 || !userId) return;

    // Prevent concurrent executions
    if (isProcessingRef.current) {
      console.log('[AnalyseGymPhotoDialog] Already processing, skipping');
      return;
    }

    isProcessingRef.current = true;
    if (isMountedRef.current) {
      setIsAnalyzing(true);
      setFeedbackType('none');
    }

    const results: AnalysisResult[] = [];
    let hasErrors = false;

    try {
      // Check session before starting
      checkSession();

      // Step 1: Compress, convert and upload all images in parallel
      const base64Images: string[] = [];
      const imageUrls: string[] = [];

      if (isMountedRef.current) {
        setAnalysisProgress('Compressing images... (25%)');
      }

      // Compress all images in parallel
      let compressedUris: string[];
      try {
        compressedUris = await Promise.all(
          imageUris.map(async (uri, i) => {
            await validateImageSize(uri, 10);
            return withTimeout(
              compressImage(uri, 1280, 1280, 0.75),
              15000,
              'Image compression timed out'
            );
          })
        );
      } catch (error) {
        console.error('[AnalyseGymPhotoDialog] Compression error:', error);
        const errorType = determineErrorType(error);
        for (let i = 0; i < imageUris.length; i++) {
          results.push({
            imageIndex: i,
            hadEquipment: false,
            equipmentCount: 0,
            error: errorType === 'unknown' && (error as Error).message?.includes('size')
              ? 'image-too-large'
              : errorType,
          });
        }
        hasErrors = true;
        compressedUris = [];
      }

      if (!isMountedRef.current) return;

      if (compressedUris.length > 0) {
        // Convert to base64 in parallel (single conversion, reused for upload + analysis)
        if (isMountedRef.current) {
          setAnalysisProgress('Preparing upload... (40%)');
        }

        try {
          const b64Results = await Promise.all(
            compressedUris.map(uri =>
              withTimeout(imageUriToBase64(uri), 30000, 'Image conversion timed out')
            )
          );
          base64Images.push(...b64Results);
        } catch (error) {
          console.error('[AnalyseGymPhotoDialog] Base64 conversion error:', error);
          hasErrors = true;
        }

        // Upload in parallel
        if (base64Images.length > 0) {
          if (isMountedRef.current) {
            setAnalysisProgress('Uploading to cloud... (50%)');
          }

          try {
            const uploadResults = await Promise.all(
              compressedUris.map((uri, i) => {
                const imagePath = `${userId}/${Date.now()}_${i}.jpg`;
                return withTimeout(
                  uploadImageToSupabase(supabase, 'user-uploads', imagePath, uri),
                  30000,
                  'Upload timed out'
                );
              })
            );
            imageUrls.push(...uploadResults);
          } catch (error) {
            console.error('[AnalyseGymPhotoDialog] Upload error:', error);
            // Upload failure is non-critical - we still have base64 for analysis
          }
        }
      }

      // Check if any images converted successfully
      if (base64Images.length === 0) {
        if (!isMountedRef.current) return;

        if (retryAttempt >= 1) {
          if (isMountedRef.current) {
            setFeedbackType('unable-to-analyze');
            setFeedbackMessage("We're unable to analyse your photos right now. Continue to set up your gym using one of the other options or try again later.");
          }
        } else {
          const errorType = results[0]?.error || 'unknown';
          if (isMountedRef.current) {
            setFeedbackType('error');
            if (errorType === 'image-too-large') {
              setFeedbackMessage('One or more images are too large (max 10MB). Please use smaller images.');
            } else if (errorType === 'timeout') {
              setFeedbackMessage('Upload timed out. Please check your connection and try again.');
            } else {
              setFeedbackMessage('Failed to upload images. Please try again.');
            }
          }
        }
        return;
      }

      // Step 2: Single combined AI analysis (equipment + exercises in one Gemini call)
      if (isMountedRef.current) {
        setAnalysisProgress('AI is analysing your gym... (75%)');
      }

      const allEquipment = new Set<string>();
      const equipmentWithCategories: Array<{ name: string; category: string }> = [];
      let generatedExercises: DetectedExercise[] = [];

      try {
        checkSession();

        if (!session?.access_token) {
          throw new Error('Session access token not available');
        }

        // Fetch user's programme type from profile
        let programmeType: 'ulul' | 'ppl' | null = null;
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('programme_type')
            .eq('id', userId)
            .single();

          if (!profileError && profile) {
            programmeType = profile.programme_type as 'ulul' | 'ppl' | null;
            console.log('[AnalyseGymPhotoDialog] Programme type:', programmeType);
          }
        } catch (error) {
          console.warn('[AnalyseGymPhotoDialog] Could not fetch programme type:', error);
        }

        const shouldGenerateExercises = !!onExercisesGenerated;
        console.log('[AnalyseGymPhotoDialog] Starting combined analysis with', base64Images.length, 'images, generateExercises:', shouldGenerateExercises);
        const startTime = Date.now();

        // Single combined API call (70s timeout)
        const analysisResult = await withTimeout(
          analyzeGymComplete(base64Images, session.access_token, shouldGenerateExercises, programmeType),
          70000,
          'Analysis timed out. Please try again.'
        );

        const elapsed = Date.now() - startTime;
        console.log('[AnalyseGymPhotoDialog] Combined analysis completed in', elapsed, 'ms');

        // Process equipment results
        let totalEquipmentCount = 0;
        analysisResult.equipment.forEach((category) => {
          category.items.forEach((item) => {
            allEquipment.add(item);
            equipmentWithCategories.push({
              name: item,
              category: category.category,
            });
            totalEquipmentCount++;
          });
        });

        // Track per-image results
        for (let i = 0; i < base64Images.length; i++) {
          results.push({
            imageIndex: i,
            hadEquipment: totalEquipmentCount > 0,
            equipmentCount: Math.ceil(totalEquipmentCount / base64Images.length),
          });
        }

        // Store generated exercises
        generatedExercises = analysisResult.identifiedExercises || [];
        console.log('[AnalyseGymPhotoDialog] Equipment detected:', totalEquipmentCount, '| Exercises generated:', generatedExercises.length);
      } catch (error) {
        console.error('[AnalyseGymPhotoDialog] Error analyzing images:', error);
        const errorType = determineErrorType(error);

        for (let i = 0; i < base64Images.length; i++) {
          results.push({
            imageIndex: i,
            hadEquipment: false,
            equipmentCount: 0,
            error: errorType,
          });
        }
        hasErrors = true;
      }

      if (!isMountedRef.current) return;

      if (isMountedRef.current) {
        setAnalysisResults(results);
        setAnalysisProgress('Finishing up... (90%)');
      }

      const totalEquipment = allEquipment.size;
      if (isMountedRef.current) {
        setTotalEquipmentDetected(totalEquipment);
      }

      // Step 3: Insert detected equipment into database
      if (equipmentWithCategories.length > 0) {
        try {
          const equipmentInserts = equipmentWithCategories.map((eq) => ({
            gym_id: gymId,
            equipment_name: eq.name,
            category: eq.category || null,
            detected_at: new Date().toISOString(),
          }));

          const { error: insertError } = await supabase
            .from('gym_equipment')
            .insert(equipmentInserts);

          if (insertError) {
            if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
              console.log('[AnalyseGymPhotoDialog] Some equipment already exists, skipping duplicates (this is expected)');
            } else {
              console.error('[AnalyseGymPhotoDialog] Equipment insert error:', insertError);
            }
          }
        } catch (error) {
          console.error('[AnalyseGymPhotoDialog] Equipment insert failed:', error);
        }
      }

      if (!isMountedRef.current) return;

      // Step 4: Pass exercises to parent if available
      if (generatedExercises.length > 0 && onExercisesGenerated) {
        onExercisesGenerated(generatedExercises, base64Images);
        return;
      }

      // Step 5: Determine feedback type and show appropriate message
      const successfulAnalyses = results.filter(r => !r.error);
      const imagesWithEquipment = results.filter(r => r.hadEquipment);

      if (hasErrors && successfulAnalyses.length === 0) {
        if (retryAttempt >= 1) {
          if (isMountedRef.current) {
            setFeedbackType('unable-to-analyze');
            setFeedbackMessage("We're unable to analyse your photos right now. Continue to set up your gym using one of the other options or try again later.");
          }
        } else {
          const errorType = results[0]?.error || 'unknown';
          if (isMountedRef.current) {
            setFeedbackType('error');
            if (errorType === 'network') {
              setFeedbackMessage('Connection issue. Please check your internet and try again.');
            } else if (errorType === 'timeout') {
              setFeedbackMessage('Analysis timed out. Please try again.');
            } else if (errorType === 'api') {
              setFeedbackMessage('AI service temporarily unavailable. Please try again.');
            } else {
              setFeedbackMessage('Something went wrong. Please try again.');
            }
          }
        }
      } else if (totalEquipment === 0) {
        if (retryAttempt >= 1) {
          if (isMountedRef.current) {
            setFeedbackType('unable-to-analyze');
            setFeedbackMessage("We're unable to analyse your photos right now. Continue to set up your gym using one of the other options or try again later.");
          }
        } else {
          if (isMountedRef.current) {
            setFeedbackType('no-equipment');
            setFeedbackMessage("We couldn't identify any gym equipment in your photos. Please try again with clearer images of your equipment.");
          }
        }
      } else if (imagesWithEquipment.length < imageUris.length) {
        if (isMountedRef.current) {
          setFeedbackType('partial');
          setFeedbackMessage("AI was not able to identify exercises from one or more images. We have added those exercises that were identified to your new gym. You can easily manage your gym and use the AI feature again in the T-path Management page.");
        }
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            onFinish();
          }
        }, 100);
      } else {
        if (isMountedRef.current) {
          onFinish();
        }
      }

    } catch (error) {
      console.error('[AnalyseGymPhotoDialog] Error:', error);

      if (!isMountedRef.current) return;

      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('Session expired') || errorMessage.includes('401') || errorMessage.includes('403')) {
        if (isMountedRef.current) {
          setFeedbackType('error');
          setFeedbackMessage('Your session has expired. Please try again.');
        }
        return;
      }

      if (retryAttempt >= 1) {
        if (isMountedRef.current) {
          setFeedbackType('unable-to-analyze');
          setFeedbackMessage("We're unable to analyse your photos right now. Continue to set up your gym using one of the other options or try again later.");
        }
      } else {
        const errorType = determineErrorType(error);
        if (isMountedRef.current) {
          setFeedbackType('error');
          if (errorType === 'network') {
            setFeedbackMessage('Connection issue. Please check your internet and try again.');
          } else if (errorType === 'timeout') {
            setFeedbackMessage('Operation timed out. Please try again.');
          } else if (errorType === 'api') {
            setFeedbackMessage('AI service temporarily unavailable. Please try again.');
          } else {
            setFeedbackMessage('Something went wrong. Please try again.');
          }
        }
      }
    } finally {
      isProcessingRef.current = false;
      if (isMountedRef.current) {
        setIsAnalyzing(false);
        setAnalysisProgress('');
      }
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
        <View style={styles.modalContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
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
              {/* Selection Counter - Always visible */}
              <View style={styles.selectionCounterContainer}>
                <Text style={styles.selectionCounterText}>
                  {imageUris.length}/{maxPhotos} photos selected
                </Text>
                {imageUris.length >= maxPhotos && (
                  <Text style={styles.selectionCounterSubtext}>
                    Maximum reached
                  </Text>
                )}
                {imageUris.length > 0 && imageUris.length < maxPhotos && (
                  <Text style={styles.selectionCounterSubtext}>
                    You can add {maxPhotos - imageUris.length} more
                  </Text>
                )}
              </View>

              <View style={styles.dashedBorder}>
                {imageUris.length > 0 ? (
                  <View style={styles.imageGrid}>
                    {imageUris.map((uri, index) => (
                      <View key={index} style={styles.thumbnailWrapper}>
                        <Image source={{ uri }} style={styles.thumbnailImage} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => {
                            const newUris = imageUris.filter((_, i) => i !== index);
                            setImageUris(newUris);
                            if (isMountedRef.current) {
                              setFeedbackType('none');
                              setFeedbackMessage('');
                              setRetryAttempt(0);
                            }
                          }}
                          disabled={isAnalyzing}
                        >
                          <Ionicons name="close-circle" size={20} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={40} color={Colors.mutedForeground} />
                    <Text style={styles.uploadText}>
                      Upload photos of your gym equipment. Our AI will identify exercises you can do. You can upload up to {maxPhotos} photos.
                    </Text>
                  </>
                )}
              </View>

              {/* Button row - show both buttons for ad-hoc, single button for gym setup */}
              <View style={onExercisesGenerated ? styles.buttonRow : styles.singleButtonContainer}>
                {onExercisesGenerated && (
                  <TouchableOpacity
                    style={[
                      styles.uploadButton,
                      styles.halfButton,
                      imageUris.length >= maxPhotos && styles.uploadButtonDisabled
                    ]}
                    onPress={handleTakePhoto}
                    disabled={isAnalyzing || imageUris.length >= maxPhotos}
                  >
                    <Ionicons name="camera" size={20} color="#fff" />
                    <Text style={styles.uploadButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    onExercisesGenerated && styles.halfButton,
                    imageUris.length >= maxPhotos && styles.uploadButtonDisabled
                  ]}
                  onPress={handlePickImage}
                  disabled={isAnalyzing || imageUris.length >= maxPhotos}
                >
                  <Ionicons name="images" size={20} color="#fff" />
                  <Text style={styles.uploadButtonText}>
                    {onExercisesGenerated
                      ? 'From Library'
                      : imageUris.length >= maxPhotos
                      ? `Maximum Reached (${maxPhotos}/${maxPhotos})`
                      : imageUris.length > 0
                      ? `Add More Photos (${imageUris.length}/${maxPhotos})`
                      : `Add Photos (0/${maxPhotos})`
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Progress Indicator */}
            {isAnalyzing && analysisProgress && (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="small" color={Colors.gray900} />
                <Text style={styles.progressText}>{analysisProgress}</Text>
              </View>
            )}

            {/* Feedback Message */}
            {feedbackType !== 'none' && feedbackMessage && (
              <View style={[
                styles.feedbackContainer,
                feedbackType === 'error' && styles.feedbackError,
                feedbackType === 'no-equipment' && styles.feedbackWarning,
                feedbackType === 'partial' && styles.feedbackInfo,
                feedbackType === 'unable-to-analyze' && styles.feedbackWarning,
              ]}>
                <Ionicons 
                  name={
                    feedbackType === 'error' ? 'alert-circle' :
                    feedbackType === 'no-equipment' ? 'warning' :
                    feedbackType === 'partial' ? 'information-circle' :
                    'warning'
                  } 
                  size={20} 
                  color={
                    feedbackType === 'error' ? '#dc2626' :
                    feedbackType === 'no-equipment' ? '#f59e0b' :
                    feedbackType === 'partial' ? '#3b82f6' :
                    '#f59e0b'
                  }
                  style={styles.feedbackIcon}
                />
                <Text style={styles.feedbackText}>{feedbackMessage}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              {feedbackType === 'unable-to-analyze' ? (
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.backButton]}
                    onPress={onBack}
                  >
                    <Text style={styles.backButtonText}>Go Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.finishButton]}
                    onPress={onFinish}
                  >
                    <Text style={styles.finishButtonText}>Continue Anyway</Text>
                  </TouchableOpacity>
                </>
              ) : feedbackType === 'no-equipment' || feedbackType === 'error' ? (
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.backButton]}
                    onPress={onBack}
                  >
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.finishButton]}
                    onPress={handleRetry}
                  >
                    <Ionicons name="refresh" size={20} color="#fff" />
                    <Text style={styles.finishButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </>
              ) : feedbackType === 'partial' ? (
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.backButton]}
                    onPress={handleRetry}
                  >
                    <Ionicons name="refresh" size={16} color={Colors.foreground} />
                    <Text style={styles.backButtonText}>Try Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.finishButton]}
                    onPress={onFinish}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.finishButtonText}>Continue</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
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
                      (isAnalyzing || imageUris.length === 0) && styles.finishButtonDisabled,
                    ]}
                    onPress={handleUploadAndAnalyse}
                    disabled={isAnalyzing || imageUris.length === 0}
                  >
                    {isAnalyzing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.finishButtonText}>
                          {imageUris.length > 0 ? 'Continue' : 'Finish Setup'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          </ScrollView>
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
  },
  modalContainer: {
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
    paddingHorizontal: Spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
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
    fontFamily: FontFamily.regular,
  },
  title: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
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
    fontFamily: FontFamily.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  selectionCounterContainer: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  selectionCounterText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  selectionCounterSubtext: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.mutedForeground,
  },
  thumbnailWrapper: {
    position: 'relative',
    margin: 4,
  },
  thumbnailImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  singleButtonContainer: {
    width: '100%',
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
  halfButton: {
    flex: 1,
  },
  uploadButtonText: {
    fontSize: 16,
    fontFamily: FontFamily.semibold,
    color: '#fff',
  },
  uploadButtonDisabled: {
    backgroundColor: Colors.muted,
    opacity: 0.6,
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
    fontFamily: FontFamily.semibold,
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
    fontFamily: FontFamily.semibold,
    color: '#fff',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  progressText: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: Colors.foreground,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  feedbackError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  feedbackWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  feedbackInfo: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  feedbackIcon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  feedbackText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.foreground,
    lineHeight: 20,
  },
});
