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
import { imageUriToBase64, uploadImageToSupabase, validateImageSize } from '../../lib/imageUtils';

interface DetectedEquipment {
  category: string;
  items: string[];
}

interface GymAnalysisResult {
  equipment: DetectedEquipment[];
  rawResponse: string;
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

  // Analyze gym equipment using edge function (Gemini Flash 2.0)
  const analyzeGymEquipmentViaEdgeFunction = async (
    base64Images: string[],
    accessToken: string
  ): Promise<GymAnalysisResult> => {
    const SUPABASE_PROJECT_ID = 'mgbfevrzrbjjiajkqpti';
    const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/analyze-gym-equipment`;

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ base64Images, gymId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to analyze images' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: GymAnalysisResult = await response.json();
    return data;
  };

  // Generate exercises from detected equipment using identify-equipment edge function
  const generateExercisesFromEquipment = async (
    base64Images: string[],
    accessToken: string,
    programmeType: 'ulul' | 'ppl' | null
  ): Promise<DetectedExercise[]> => {
    const SUPABASE_PROJECT_ID = 'mgbfevrzrbjjiajkqpti';
    const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/identify-equipment`;

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ 
        base64Images,
        programmeType: programmeType || 'ppl', // Default to PPL if not specified
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to generate exercises' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.identifiedExercises || [];
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access photos is required');
      return;
    }

    // Calculate how many more images can be selected (max 12 total)
    const currentCount = imageUris.length;
    const remainingSlots = Math.max(0, 12 - currentCount);
    
    // If already at limit, show message
    if (currentCount >= 12) {
      alert('You have reached the maximum of 12 images. Please remove some images before adding more.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remainingSlots > 0 ? remainingSlots : 12, // Allow selecting remaining slots
    });

    if (!result.canceled && result.assets.length > 0) {
      // Combine new selections with existing ones (up to 12 total)
      const newUris = result.assets.map(asset => asset.uri);
      const combinedUris = [...imageUris, ...newUris].slice(0, 12); // Cap at 12
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

      // Step 1: Validate and upload all images
      const imageUrls: string[] = [];
      const base64Images: string[] = [];

      for (let i = 0; i < imageUris.length; i++) {
        if (!isMountedRef.current) break;

        if (isMountedRef.current) {
          setAnalysisProgress(`Uploading images... (${i + 1}/${imageUris.length})`);
        }

        try {
          // Validate image size (10MB max)
          await validateImageSize(imageUris[i], 10);

          // Upload with timeout (30 seconds)
          const imagePath = `${userId}/${Date.now()}_${i}.jpg`;
          const imageUrl = await withTimeout(
            uploadImageToSupabase(supabase, 'user-uploads', imagePath, imageUris[i]),
            30000,
            'Upload timed out'
          );
          imageUrls.push(imageUrl);

          // Convert image to base64 for AI analysis with timeout
          const base64Image = await withTimeout(
            imageUriToBase64(imageUris[i]),
            30000,
            'Image conversion timed out'
          );
          base64Images.push(base64Image);
        } catch (error) {
          console.error(`[AnalyseGymPhotoDialog] Error uploading image ${i}:`, error);
          const errorType = determineErrorType(error);
          results.push({
            imageIndex: i,
            hadEquipment: false,
            equipmentCount: 0,
            error: errorType === 'unknown' && (error as Error).message.includes('size') 
              ? 'image-too-large' 
              : errorType,
          });
          hasErrors = true;
        }
      }

      // Check if any images uploaded successfully
      if (base64Images.length === 0) {
        // All uploads failed
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

      // Step 2: Analyze all gym photos with Gemini Edge Function (single batch request)
      if (isMountedRef.current) {
        setAnalysisProgress(`Analysing images... (${base64Images.length} image${base64Images.length > 1 ? 's' : ''})`);
      }

      const allEquipment = new Set<string>();
      const equipmentWithCategories: Array<{ name: string; category: string }> = [];
      let analysisResult: GymAnalysisResult | null = null;
      
      try {
        // Check session before analysis
        checkSession();

        if (!session?.access_token) {
          throw new Error('Session access token not available');
        }

        // Analyze all images in a single batch request via edge function (60 second timeout)
        analysisResult = await withTimeout(
          analyzeGymEquipmentViaEdgeFunction(base64Images, session.access_token),
          60000,
          'Analysis timed out'
        );
        
        // Process results - edge function analyzes all images together
        let totalEquipmentCount = 0;
        
        analysisResult.equipment.forEach((category) => {
          category.items.forEach((item) => {
            // Track for display/counting (deduplicated by name)
            allEquipment.add(item);
            // Track with category for database storage
            equipmentWithCategories.push({
              name: item,
              category: category.category,
            });
            totalEquipmentCount++;
          });
        });

        // For tracking purposes, we'll assume all images contributed to the result
        // since the edge function processes them as a batch
        for (let i = 0; i < base64Images.length; i++) {
          results.push({
            imageIndex: i,
            hadEquipment: totalEquipmentCount > 0,
            equipmentCount: Math.ceil(totalEquipmentCount / base64Images.length), // Approximate per image
          });
        }
      } catch (error) {
        console.error('[AnalyseGymPhotoDialog] Error analyzing images:', error);
        const errorType = determineErrorType(error);
        
        // Mark all images as failed
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
      }
      
      const totalEquipment = allEquipment.size;
      if (isMountedRef.current) {
        setTotalEquipmentDetected(totalEquipment);
      }

      // Step 3: Insert detected equipment into database (with deduplication via unique constraint)
      if (equipmentWithCategories.length > 0) {
        try {
          // Prepare equipment inserts with category information
          const equipmentInserts = equipmentWithCategories.map((eq) => ({
            gym_id: gymId,
            equipment_name: eq.name,
            category: eq.category || null,
            detected_at: new Date().toISOString(),
          }));

          // Insert equipment (duplicates are prevented by unique constraint)
          // If equipment already exists, the insert will fail but we handle it gracefully
          const { error: insertError } = await supabase
            .from('gym_equipment')
            .insert(equipmentInserts);

          if (insertError) {
            // Handle unique constraint violations gracefully (equipment already exists)
            // PGRST error codes: 23505 (Postgres unique violation) or PGRST204 (row not found)
            // We ignore unique violations since duplicates are expected if user re-runs analysis
            if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
              console.log('[AnalyseGymPhotoDialog] Some equipment already exists, skipping duplicates (this is expected)');
            } else {
              console.error('[AnalyseGymPhotoDialog] Equipment insert error:', insertError);
            }
            // Don't fail the whole flow if equipment insert fails - this is non-critical data
          }
        } catch (error) {
          console.error('[AnalyseGymPhotoDialog] Equipment insert failed:', error);
          // Don't fail the whole flow if equipment insert fails
        }
      }

      if (!isMountedRef.current) return;

      // Step 4: Generate exercises from detected equipment
      let generatedExercises: DetectedExercise[] = [];
      if (totalEquipment > 0 && onExercisesGenerated) {
        try {
          if (isMountedRef.current) {
            setAnalysisProgress('AI is analysing your equipment and generating exercises...');
          }

          // Update progress every 5 seconds to give feedback
          const progressInterval = setInterval(() => {
            if (isMountedRef.current) {
              setAnalysisProgress(prev => {
                const messages = [
                  'AI is analysing your equipment...',
                  'Identifying exercises from detected equipment...',
                  'Matching equipment to exercise library...',
                  'Almost done, finalising exercise list...',
                ];
                const currentIndex = messages.indexOf(prev);
                return messages[(currentIndex + 1) % messages.length];
              });
            }
          }, 5000);

          // Check session before exercise generation
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
            
            if (profileError) {
              console.error('[AnalyseGymPhotoDialog] Error fetching profile:', profileError);
            } else {
              programmeType = profile?.programme_type as 'ulul' | 'ppl' | null;
              console.log('[AnalyseGymPhotoDialog] User programme type from DB:', programmeType);
              console.log('[AnalyseGymPhotoDialog] Full profile data:', profile);
            }
          } catch (error) {
            console.warn('[AnalyseGymPhotoDialog] Could not fetch programme type:', error);
          }
          
          console.log('[AnalyseGymPhotoDialog] Sending programmeType to edge function:', programmeType || 'ppl (default)');

          // Generate exercises from equipment using identify-equipment edge function
          console.log('[AnalyseGymPhotoDialog] Starting exercise generation with', base64Images.length, 'images');
          const startTime = Date.now();
          
          try {
            generatedExercises = await withTimeout(
              generateExercisesFromEquipment(base64Images, session.access_token, programmeType),
              90000, // Increased to 90 seconds for more complex analysis
              'Exercise generation timed out. This can happen with many images. Please try again.'
            );
          } finally {
            clearInterval(progressInterval);
          }
          
          const elapsed = Date.now() - startTime;
          console.log('[AnalyseGymPhotoDialog] Exercise generation completed in', elapsed, 'ms');

          console.log('[AnalyseGymPhotoDialog] Generated exercises:', generatedExercises.length);

          if (!isMountedRef.current) return;

          // Pass exercises and images to parent component for exercise selection
          if (generatedExercises.length > 0) {
            onExercisesGenerated(generatedExercises, base64Images);
            // Don't call onFinish() - parent will handle the next step
            return;
          } else {
            // No exercises generated - show feedback but don't proceed to exercise selection
            console.warn('[AnalyseGymPhotoDialog] No exercises generated from equipment');
          }
        } catch (error) {
          console.error('[AnalyseGymPhotoDialog] Exercise generation error:', error);
          // Continue with normal feedback flow if exercise generation fails
        }
      }

      // Step 5: Determine feedback type and show appropriate message
      const successfulAnalyses = results.filter(r => !r.error);
      const imagesWithEquipment = results.filter(r => r.hadEquipment);
      
      if (hasErrors && successfulAnalyses.length === 0) {
        // All images failed - error scenario
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
        // No equipment detected scenario
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
        // Partial success - some images had equipment, some didn't
        if (isMountedRef.current) {
          setFeedbackType('partial');
          setFeedbackMessage("AI was not able to identify exercises from one or more images. We have added those exercises that were identified to your new gym. You can easily manage your gym and use the AI feature again in the T-path Management page.");
        }
        // Auto-finish after showing feedback in partial success
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            onFinish();
          }
        }, 100);
      } else {
        // Complete success - all images analyzed and equipment found
        if (isMountedRef.current) {
          onFinish();
        }
      }

    } catch (error) {
      console.error('[AnalyseGymPhotoDialog] Error:', error);
      
      if (!isMountedRef.current) return;

      // Check if it's a session error
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('Session expired') || errorMessage.includes('401') || errorMessage.includes('403')) {
        if (isMountedRef.current) {
          setFeedbackType('error');
          setFeedbackMessage('Your session has expired. Please try again.');
        }
        return;
      }
      
      // Handle general errors
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
                  {imageUris.length}/12 photos selected
                </Text>
                {imageUris.length >= 12 && (
                  <Text style={styles.selectionCounterSubtext}>
                    Maximum reached
                  </Text>
                )}
                {imageUris.length > 0 && imageUris.length < 12 && (
                  <Text style={styles.selectionCounterSubtext}>
                    You can add {12 - imageUris.length} more
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
                      Upload photos of your gym equipment. Our AI will identify exercises you can do. You can upload up to 12 photos.
                    </Text>
                  </>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  imageUris.length >= 12 && styles.uploadButtonDisabled
                ]}
                onPress={handlePickImage}
                disabled={isAnalyzing || imageUris.length >= 12}
              >
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>
                  {imageUris.length >= 12 
                    ? 'Maximum Reached (12/12)'
                    : imageUris.length > 0 
                    ? `Add More Photos (${imageUris.length}/12)`
                    : 'Add Photos (0/12)'
                  }
                </Text>
              </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
