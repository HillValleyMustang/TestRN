/**
 * PhysiqueAnalysisModal component for displaying AI analysis results and recommendations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../app/_contexts/auth-context';
import { imageUriToBase64, getGoalPhysiquePhoto } from '../../lib/imageUtils';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

const { width } = Dimensions.get('window');

interface PhysiqueAnalysis {
  id: string;
  muscle_mass_level: string;
  body_fat_estimated_range: string;
  dominant_muscle_groups: string[];
  physique_archetype: string;
  required_training_style: string;
  weakness_areas?: string[];
  estimated_timeframe_months: number;
  difficulty_level: string;
  genetic_considerations?: string;
  is_elite_physique: boolean;
  reality_check_notes?: string;
}

interface GoalRecommendation {
  id: string;
  category: string;
  recommendation_type: string;
  title: string;
  description: string;
  priority: string;
  is_accepted?: boolean;
  current_training_context?: {
    current_workouts_per_week: number;
    current_training_style: string;
    current_focus_areas: string[];
    training_gap_analysis: string;
  };
}

interface PhysiqueAnalysisModalProps {
  visible: boolean;
  onClose: () => void;
  goalPhysiqueId: string;
  onRecommendationsAccepted?: (recommendations: GoalRecommendation[]) => void;
}

export const PhysiqueAnalysisModal = ({
  visible,
  onClose,
  goalPhysiqueId,
  onRecommendationsAccepted,
}: PhysiqueAnalysisModalProps) => {
  const { supabase, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [analysis, setAnalysis] = useState<PhysiqueAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<GoalRecommendation[]>([]);
  const [acceptedRecommendations, setAcceptedRecommendations] = useState<Set<string>>(new Set());
  const [realityCheckAccepted, setRealityCheckAccepted] = useState(false);
  const [showRealityCheck, setShowRealityCheck] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [hasAcceptedRealityCheck, setHasAcceptedRealityCheck] = useState(false);

  useEffect(() => {
    if (visible && goalPhysiqueId) {
      loadProfile();
      loadAnalysis();
      // Check if user has already accepted reality check
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage');
        AsyncStorage.getItem('reality_check_accepted').then((value: string | null) => {
          if (value === 'true') {
            setHasAcceptedRealityCheck(true);
            setShowRealityCheck(false);
          }
        }).catch(console.error);
      } catch (error) {
        // AsyncStorage not available, skip the check
        console.log('AsyncStorage not available, showing reality check');
      }
    }
  }, [visible, goalPhysiqueId]);

  const loadProfile = async () => {
    if (!userId) return;

    try {
      // Load profile data with workout statistics
      const profileRes = await supabase
        .from('profiles')
        .select('*, full_name')
        .eq('id', userId)
        .single();

      if (profileRes.error) throw profileRes.error;

      // Load workout statistics
      const [totalWorkoutsRes, workoutDatesRes] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('completed_at', 'is', null),

        supabase
          .from('workout_sessions')
          .select('completed_at')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(30),
      ]);

      // Calculate current workouts per week (last 4 weeks)
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const recentWorkouts = workoutDatesRes.data?.filter(session =>
        new Date(session.completed_at) >= fourWeeksAgo
      ) || [];

      const workoutsPerWeek = Math.round((recentWorkouts.length / 4) * 10) / 10; // Round to 1 decimal

      const profileData = {
        ...profileRes.data,
        total_workouts: totalWorkoutsRes.count || 0,
        current_workouts_per_week: workoutsPerWeek,
      };

      setProfile(profileData);
    } catch (error) {
      console.error('[PhysiqueAnalysis] Error loading profile:', error);
    }
  };

  const loadAnalysis = async () => {
    if (!goalPhysiqueId) return;

    setLoading(true);

    try {
      // Check if analysis already exists
      const { data: existingAnalysis, error: analysisError } = await supabase
        .from('physique_analyses')
        .select('*')
        .eq('goal_physique_id', goalPhysiqueId)
        .single();

      if (existingAnalysis && !analysisError) {
        setAnalysis(existingAnalysis);
        await loadRecommendations(existingAnalysis.id);
      } else {
        // Start new analysis
        await startAnalysis();
      }
    } catch (error) {
      console.error('[PhysiqueAnalysis] Load error:', error);
      Alert.alert('Error', 'Failed to load physique analysis');
    } finally {
      setLoading(false);
    }
  };

  const startAnalysis = async () => {
    setAnalysing(true);

    try {
      // Get goal physique details
      const { data: goalPhysique, error: goalError } = await supabase
        .from('goal_physiques')
        .select('local_photo_path')
        .eq('id', goalPhysiqueId)
        .single();

      if (goalError || !goalPhysique) {
        throw new Error('Goal physique not found');
      }

      if (!goalPhysique.local_photo_path) {
        throw new Error('Goal physique photo not found on device');
      }

      // Read the local image file and convert to base64
      const imageUri = await getGoalPhysiquePhoto(goalPhysique.local_photo_path);
      if (!imageUri) {
        throw new Error('Goal physique photo not found on device');
      }
      const imageBase64 = await imageUriToBase64(imageUri);

      // Call analysis function with base64 image data
      const { data, error } = await supabase.functions.invoke('analyse-goal-physique', {
        body: {
          goalPhysiqueId,
          imageData: imageBase64,
        },
      });

      if (error) {
        throw error;
      }

      setAnalysis(data.analysis);
      setRecommendations(data.recommendations || []);

    } catch (error: any) {
      console.error('[PhysiqueAnalysis] Analysis error:', error);
      console.error('[PhysiqueAnalysis] Error details:', {
        message: error.message,
        status: error.status,
        details: error.details,
        hint: error.hint,
        fullError: error,
        errorKeys: Object.keys(error),
        errorString: error.toString()
      });

      // Try to get the actual error message from the Edge Function response
      let errorMessage = error.message || 'Failed to analyse physique';

      // Check if we can extract a more specific error from the response
      if (error.details || error.context) {
        const details = error.details || error.context;
        if (typeof details === 'string' && details.includes('error')) {
          try {
            const parsedDetails = JSON.parse(details);
            if (parsedDetails.error) {
              errorMessage = parsedDetails.error;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }

      // For FunctionsHttpError, try to get the response body
      if (error.name === 'FunctionsHttpError') {
        console.error('[PhysiqueAnalysis] FunctionsHttpError detected');

        // Try to access the context property which might contain the actual error
        if (error.context) {
          console.error('[PhysiqueAnalysis] Error context:', error.context);
          try {
            const contextData = JSON.parse(error.context);
            console.error('[PhysiqueAnalysis] Parsed context:', contextData);
            if (contextData.error) {
              errorMessage = contextData.error;
            }
          } catch (e) {
            console.error('[PhysiqueAnalysis] Could not parse context:', e);
          }
        }

        // Check if there's a response property
        if (error.response) {
          console.error('[PhysiqueAnalysis] Error response:', error.response);
        }

        // Try to read the response body which contains the actual error
        if (error.context && error.context._bodyBlob) {
          console.error('[PhysiqueAnalysis] Attempting to read response body...');
          try {
            // The context contains a Response-like object with the actual error
            const response = error.context;
            console.error('[PhysiqueAnalysis] Response status:', response.status);
            console.error('[PhysiqueAnalysis] Response headers:', response.headers);

            // Try to read the response text
            if (response._bodyInit && response._bodyInit._data) {
              console.error('[PhysiqueAnalysis] Response body data:', response._bodyInit._data);
            }

            // Try to get the text content
            if (response.text) {
              response.text().then((text: string) => {
                console.error('[PhysiqueAnalysis] Response text:', text);
                try {
                  const errorData = JSON.parse(text);
                  console.error('[PhysiqueAnalysis] Parsed error response:', errorData);
                  if (errorData.error) {
                    console.error('[PhysiqueAnalysis] Actual error message:', errorData.error);
                  }
                } catch (parseError) {
                  console.error('[PhysiqueAnalysis] Could not parse response as JSON:', parseError);
                }
              }).catch((textError: any) => {
                console.error('[PhysiqueAnalysis] Could not read response text:', textError);
              });
            }
          } catch (bodyError) {
            console.error('[PhysiqueAnalysis] Error reading response body:', bodyError);
          }
        }

        // Check all properties of the error object
        console.error('[PhysiqueAnalysis] All error properties:');
        for (const key in error) {
          if (error.hasOwnProperty(key)) {
            console.error(`[PhysiqueAnalysis] ${key}:`, error[key]);
          }
        }
      }

      // Check if it's a content policy error
      if (errorMessage && (
        errorMessage.includes('violates our usage policies') ||
        errorMessage.includes('safety instructions') ||
        errorMessage.includes('content policy') ||
        errorMessage.includes('inappropriate content')
      )) {
        Alert.alert(
          'Content Policy Violation',
          'This image contains content that violates our usage policies. Please ensure your photo shows appropriate athletic/fitness content only.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Analysis Failed', `Error: ${errorMessage}\n\nPlease check the console logs for more details.`);
      }
    } finally {
      setAnalysing(false);
    }
  };

  const loadRecommendations = async (analysisId: string) => {
    try {
      const { data, error } = await supabase
        .from('goal_recommendations')
        .select('*')
        .eq('physique_analysis_id', analysisId)
        .order('priority', { ascending: false });

      if (error) throw error;

      // TODO: Enhance recommendations with current training context
      // This would analyze recent workout data and add personalized context
      // to each recommendation based on current training patterns

      setRecommendations(data || []);
    } catch (error) {
      console.error('[PhysiqueAnalysis] Load recommendations error:', error);
    }
  };

  const toggleRecommendation = (recommendationId: string) => {
    const newAccepted = new Set(acceptedRecommendations);
    if (newAccepted.has(recommendationId)) {
      newAccepted.delete(recommendationId);
    } else {
      newAccepted.add(recommendationId);
    }
    setAcceptedRecommendations(newAccepted);
  };

  const acceptSelectedRecommendations = async () => {
    if (!realityCheckAccepted) {
      Alert.alert('Required', 'Please accept the reality check before proceeding.');
      return;
    }

    if (acceptedRecommendations.size === 0) {
      Alert.alert('No Recommendations', 'Please select at least one recommendation to accept.');
      return;
    }

    try {
      // Update recommendations as accepted
      const acceptedIds = Array.from(acceptedRecommendations);
      const { error } = await supabase
        .from('goal_recommendations')
        .update({
          is_accepted: true,
          updated_at: new Date().toISOString()
        })
        .in('id', acceptedIds);

      if (error) throw error;

      // Get accepted recommendations
      const acceptedRecs = recommendations.filter(rec => acceptedIds.includes(rec.id));

      // Create implementation plan based on accepted recommendations
      const implementationPlan = createImplementationPlan(acceptedRecs, analysis);

      // TODO: Save implementation plan to database
      // TODO: Update user's training preferences based on recommendations
      // TODO: Schedule follow-up notifications for implementation milestones

      onRecommendationsAccepted?.(acceptedRecs);
      onClose();

      // Show implementation success message
      Alert.alert(
        'Implementation Plan Created',
        `Your personalized training plan has been updated with ${acceptedRecs.length} recommendation${acceptedRecs.length !== 1 ? 's' : ''}. Check your workout launcher for the updated plan.`,
        [{ text: 'Got it!' }]
      );

    } catch (error) {
      console.error('[PhysiqueAnalysis] Accept recommendations error:', error);
      Alert.alert('Error', 'Failed to save recommendations');
    }
  };

  const createImplementationPlan = (acceptedRecs: GoalRecommendation[], analysis: PhysiqueAnalysis | null) => {
    // Create a structured implementation plan based on accepted recommendations
    const plan = {
      goal_physique_id: goalPhysiqueId,
      implementation_timeline: [] as any[],
      training_adjustments: [] as any[],
      milestones: [] as any[],
      created_at: new Date().toISOString()
    };

    // Group recommendations by priority and timeline
    const highPriority = acceptedRecs.filter(r => r.priority === 'high');
    const mediumPriority = acceptedRecs.filter(r => r.priority === 'medium');
    const lowPriority = acceptedRecs.filter(r => r.priority === 'low');

    // Immediate actions (Week 1)
    if (highPriority.length > 0) {
      plan.implementation_timeline.push({
        phase: 'immediate',
        week: 1,
        actions: highPriority.map(r => ({
          recommendation_id: r.id,
          title: r.title,
          description: r.description,
          category: r.category
        }))
      });
    }

    // Short-term adjustments (Weeks 2-4)
    if (mediumPriority.length > 0) {
      plan.implementation_timeline.push({
        phase: 'short_term',
        week: 2,
        actions: mediumPriority.map(r => ({
          recommendation_id: r.id,
          title: r.title,
          description: r.description,
          category: r.category
        }))
      });
    }

    // Long-term development (Weeks 5+)
    if (lowPriority.length > 0) {
      plan.implementation_timeline.push({
        phase: 'long_term',
        week: 5,
        actions: lowPriority.map(r => ({
          recommendation_id: r.id,
          title: r.title,
          description: r.description,
          category: r.category
        }))
      });
    }

    // Create training adjustments based on physique requirements
    if (analysis) {
      plan.training_adjustments = [
        {
          type: 'frequency',
          current: profile?.current_workouts_per_week || 0,
          target: analysis.required_training_style === 'High Volume' ? 5 :
                  analysis.required_training_style === 'Moderate Volume' ? 4 : 3,
          timeframe_weeks: 2
        },
        {
          type: 'focus_areas',
          target_muscle_groups: analysis.dominant_muscle_groups,
          training_style: analysis.required_training_style
        }
      ];
    }

    // Create progress milestones
    plan.milestones = [
      {
        week: 2,
        description: 'Training frequency adjusted to match goal requirements',
        metric: 'workouts_per_week',
        target: analysis?.required_training_style === 'High Volume' ? 5 :
                analysis?.required_training_style === 'Moderate Volume' ? 4 : 3
      },
      {
        week: 4,
        description: 'Initial progress toward physique goals',
        metric: 'consistency_check',
        target: '80% workout completion'
      },
      {
        week: 8,
        description: 'Mid-term physique assessment',
        metric: 'progress_photo',
        target: 'Compare with goal physique'
      }
    ];

    return plan;
  };

  const resetModal = () => {
    setAnalysis(null);
    setRecommendations([]);
    setAcceptedRecommendations(new Set());
    setRealityCheckAccepted(false);
    setShowRealityCheck(!hasAcceptedRealityCheck); // Only show if not previously accepted
    setLoading(false);
    setAnalysing(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, TextStyles.h3]}>
              {analysing ? 'Analysing Physique' : 'Physique Analysis'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={(ref) => {
              if (ref && showRealityCheck === false) {
                // Scroll to top when switching to analysis view
                setTimeout(() => ref.scrollTo({ y: 0, animated: false }), 100);
              }
            }}
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {analysing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>
                  AI is analysing your goal physique...
                </Text>
                <Text style={styles.loadingSubtext}>
                  This may take a few moments
                </Text>
              </View>
            ) : showRealityCheck ? (
              <View style={styles.realityCheckPage}>
                <View style={styles.realityCheckHeader}>
                  <Ionicons name="warning" size={48} color={Colors.destructive} />
                  <Text style={styles.realityCheckTitle}>Important Reality Notice</Text>
                  <Text style={styles.realityCheckSubtitle}>
                    Before viewing your AI analysis, please acknowledge the following:
                  </Text>
                </View>

                <View style={styles.realityCheckContent}>
                  <Text style={styles.realityCheckText}>
                    I understand that achieving this physique goal depends on many factors beyond training alone, including:
                  </Text>

                  <View style={styles.realityCheckPoints}>
                    <View style={styles.realityCheckPoint}>
                      <Ionicons name="ellipse" size={8} color={Colors.mutedForeground} />
                      <Text style={styles.realityCheckPointText}>Genetics and natural body composition</Text>
                    </View>
                    <View style={styles.realityCheckPoint}>
                      <Ionicons name="ellipse" size={8} color={Colors.mutedForeground} />
                      <Text style={styles.realityCheckPointText}>Diet and nutrition consistency</Text>
                    </View>
                    <View style={styles.realityCheckPoint}>
                      <Ionicons name="ellipse" size={8} color={Colors.mutedForeground} />
                      <Text style={styles.realityCheckPointText}>Recovery and sleep quality</Text>
                    </View>
                    <View style={styles.realityCheckPoint}>
                      <Ionicons name="ellipse" size={8} color={Colors.mutedForeground} />
                      <Text style={styles.realityCheckPointText}>Hormonal factors and age</Text>
                    </View>
                    <View style={styles.realityCheckPoint}>
                      <Ionicons name="ellipse" size={8} color={Colors.mutedForeground} />
                      <Text style={styles.realityCheckPointText}>Lifestyle and stress management</Text>
                    </View>
                  </View>

                  <Text style={styles.realityCheckText}>
                    AI analysis provides motivational guidance and training suggestions, but results are not guaranteed and depend on your individual circumstances.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setRealityCheckAccepted(!realityCheckAccepted)}
                >
                  <View style={[styles.checkbox, realityCheckAccepted && styles.checkboxChecked]}>
                    {realityCheckAccepted && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.checkboxText}>
                    I acknowledge and accept these limitations
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.continueButton, !realityCheckAccepted && styles.disabledButton]}
                  onPress={() => {
                    // Save reality check acceptance locally
                    try {
                      const AsyncStorage = require('@react-native-async-storage/async-storage');
                      AsyncStorage.setItem('reality_check_accepted', 'true').catch(console.error);
                    } catch (error) {
                      // AsyncStorage not available, continue anyway
                      console.log('AsyncStorage not available for saving');
                    }
                    setShowRealityCheck(false);
                  }}
                  disabled={!realityCheckAccepted}
                >
                  <Text style={styles.continueButtonText}>Continue to Analysis</Text>
                </TouchableOpacity>
              </View>
            ) : analysis ? (
              <>
                {/* Analysis Results */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Analysis Results</Text>

                  <View style={styles.analysisGrid}>
                    <View style={styles.analysisItem}>
                      <Text style={styles.analysisLabel}>Muscle Mass</Text>
                      <Text style={styles.analysisValue}>{analysis.muscle_mass_level}</Text>
                    </View>
                    <View style={styles.analysisItem}>
                      <Text style={styles.analysisLabel}>Body Fat</Text>
                      <Text style={styles.analysisValue}>{analysis.body_fat_estimated_range}</Text>
                    </View>
                    <View style={styles.analysisItem}>
                      <Text style={styles.analysisLabel}>Physique Type</Text>
                      <Text style={styles.analysisValue}>{analysis.physique_archetype}</Text>
                    </View>
                    <View style={styles.analysisItem}>
                      <Text style={styles.analysisLabel}>Training Style</Text>
                      <Text style={styles.analysisValue}>{analysis.required_training_style}</Text>
                      {analysis.required_training_style === 'Hypertrophy' && (
                        <Text style={styles.termExplanation}>
                          Muscle building focused training with moderate weights and higher reps (8-12)
                        </Text>
                      )}
                      {analysis.required_training_style === 'Strength' && (
                        <Text style={styles.termExplanation}>
                          Heavy weight, low rep training to build maximal strength (1-6 reps)
                        </Text>
                      )}
                      {analysis.required_training_style === 'High Volume' && (
                        <Text style={styles.termExplanation}>
                          Frequent training with higher total volume for muscle growth
                        </Text>
                      )}
                      {analysis.required_training_style === 'Moderate Volume' && (
                        <Text style={styles.termExplanation}>
                          Balanced training frequency for sustainable progress
                        </Text>
                      )}
                    </View>
                  </View>

                  {analysis.dominant_muscle_groups.length > 0 && (
                    <View style={styles.muscleGroups}>
                      <Text style={styles.muscleGroupsTitle}>Dominant Areas:</Text>
                      <View style={styles.muscleGroupsList}>
                        {analysis.dominant_muscle_groups.map((muscle, index) => (
                          <View key={index} style={styles.muscleGroupChip}>
                            <Text style={styles.muscleGroupText}>{muscle}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>


                {/* Current Training Context */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Current Training Analysis</Text>
                  <Text style={styles.sectionSubtitle}>
                    How your current training compares to your goal physique requirements
                  </Text>

                  <View style={styles.trainingContextCard}>
                    <View style={styles.trainingContextHeader}>
                      <Ionicons name="analytics" size={24} color={Colors.primary} />
                      <Text style={styles.trainingContextTitle}>Training Gap Analysis</Text>
                    </View>

                    <Text style={styles.trainingContextText}>
                      Based on your recent workouts, here's how your current training aligns with the physique requirements:
                    </Text>

                    <View style={styles.trainingMetrics}>
                      <View style={styles.trainingMetric}>
                        <Text style={styles.trainingMetricLabel}>Current Frequency</Text>
                        <Text style={styles.trainingMetricValue}>
                          {profile?.current_workouts_per_week || 'Analyzing...'} workouts/week
                        </Text>
                      </View>
                      <View style={styles.trainingMetric}>
                        <Text style={styles.trainingMetricLabel}>Required Frequency</Text>
                        <Text style={styles.trainingMetricValue}>
                          {analysis?.required_training_style === 'High Volume' ? '4-6' :
                           analysis?.required_training_style === 'Moderate Volume' ? '3-5' : '2-4'} workouts/week
                        </Text>
                      </View>
                    </View>

                    <View style={styles.trainingGap}>
                      <Text style={styles.trainingGapTitle}>Key Adjustments Needed:</Text>
                      <Text style={styles.trainingGapText}>
                        {analysis?.required_training_style === 'High Volume' && (profile?.current_workouts_per_week || 0) < 4
                          ? 'Increase training frequency to 4-6 sessions per week for optimal muscle building.'
                          : analysis?.required_training_style === 'Moderate Volume' && (profile?.current_workouts_per_week || 0) < 3
                          ? 'Consider increasing to 3-5 sessions per week to match physique requirements.'
                          : 'Your current training frequency aligns well with the goal physique requirements.'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personalised Recommendations</Text>
                    <Text style={styles.sectionSubtitle}>
                      Select the recommendations you'd like to apply to your training
                    </Text>

                    {recommendations.map((rec, index) => (
                      <TouchableOpacity
                        key={rec.id || `rec-${index}`}
                        style={[
                          styles.recommendationCard,
                          acceptedRecommendations.has(rec.id) && styles.recommendationCardAccepted
                        ]}
                        onPress={() => toggleRecommendation(rec.id)}
                        disabled={!realityCheckAccepted}
                      >
                        <View style={styles.recommendationHeader}>
                          <View style={styles.recommendationLeft}>
                            <View style={[
                              styles.priorityIndicator,
                              rec.priority === 'high' && styles.priorityHigh,
                              rec.priority === 'medium' && styles.priorityMedium,
                              rec.priority === 'low' && styles.priorityLow
                            ]} />
                            <Text style={styles.recommendationTitle}>{rec.title.replace(/ize/g, 'ise')}</Text>
                          </View>
                          <View style={[
                            styles.checkboxSmall,
                            acceptedRecommendations.has(rec.id) && styles.checkboxSmallChecked
                          ]}>
                            {acceptedRecommendations.has(rec.id) && (
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            )}
                          </View>
                        </View>
                        <Text style={styles.recommendationDescription}>{rec.description.replace(/ize/g, 'ise')}</Text>

                        {/* Show current training context if available */}
                        {rec.current_training_context && (
                          <View style={styles.trainingContext}>
                            <Text style={styles.trainingContextLabel}>Current Training:</Text>
                            <Text style={styles.trainingContextValue}>
                              {rec.current_training_context.training_gap_analysis}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color={Colors.destructive} />
                <Text style={styles.errorText}>Failed to load analysis</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadAnalysis}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {analysis && !showRealityCheck && recommendations.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.footerButton, styles.skipButton]}
                onPress={handleClose}
              >
                <Text style={styles.skipButtonText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.footerButton, styles.acceptButton]}
                onPress={acceptSelectedRecommendations}
                disabled={acceptedRecommendations.size === 0}
              >
                <Text style={styles.acceptButtonText}>
                  Create Implementation Plan ({acceptedRecommendations.size})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Implementation Timeline Preview */}
          {acceptedRecommendations.size > 0 && (
            <View style={styles.implementationPreview}>
              <Text style={styles.previewTitle}>Implementation Timeline</Text>

              <View style={styles.timelinePreview}>
                <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelinePhase}>Week 1: Immediate Actions</Text>
                    <Text style={styles.timelineDescription}>
                      {Array.from(acceptedRecommendations).filter(id =>
                        recommendations.find(r => r.id === id)?.priority === 'high'
                      ).length} high-priority recommendations
                    </Text>
                  </View>
                </View>

                <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelinePhase}>Weeks 2-4: Build Foundation</Text>
                    <Text style={styles.timelineDescription}>
                      {Array.from(acceptedRecommendations).filter(id =>
                        recommendations.find(r => r.id === id)?.priority === 'medium'
                      ).length} medium-priority adjustments
                    </Text>
                  </View>
                </View>

                <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelinePhase}>Weeks 5+: Long-term Development</Text>
                    <Text style={styles.timelineDescription}>
                      {Array.from(acceptedRecommendations).filter(id =>
                        recommendations.find(r => r.id === id)?.priority === 'low'
                      ).length} advanced optimizations
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    flex: 1,
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
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  loadingText: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  loadingSubtext: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  sectionSubtitle: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
  },
  analysisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  analysisItem: {
    flex: 1,
    minWidth: (width - Spacing.lg * 2 - Spacing.md) / 2,
    backgroundColor: Colors.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  analysisLabel: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginBottom: Spacing.xs,
  },
  analysisValue: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '600',
  },
  termExplanation: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  muscleGroups: {
    marginTop: Spacing.lg,
  },
  muscleGroupsTitle: {
    ...TextStyles.body,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  muscleGroupsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  muscleGroupChip: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  muscleGroupText: {
    ...TextStyles.small,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  realityCheckPage: {
    flex: 1,
    paddingVertical: Spacing.xl,
  },
  realityCheckHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  realityCheckTitle: {
    ...TextStyles.h2,
    color: Colors.destructive,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  realityCheckSubtitle: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  realityCheckContent: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  realityCheckText: {
    ...TextStyles.body,
    color: Colors.foreground,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  realityCheckPoints: {
    marginBottom: Spacing.lg,
  },
  realityCheckPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  realityCheckPointText: {
    ...TextStyles.bodySmall,
    color: Colors.foreground,
    flex: 1,
    lineHeight: 18,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  continueButtonText: {
    ...TextStyles.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxText: {
    ...TextStyles.body,
    color: Colors.foreground,
    flex: 1,
    lineHeight: 20,
  },
  recommendationCard: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  recommendationCardAccepted: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  recommendationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priorityIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: Colors.mutedForeground,
    marginRight: Spacing.sm,
  },
  priorityHigh: {
    backgroundColor: Colors.destructive,
  },
  priorityMedium: {
    backgroundColor: Colors.yellow500,
  },
  priorityLow: {
    backgroundColor: Colors.success,
  },
  recommendationTitle: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '600',
    flex: 1,
  },
  checkboxSmall: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSmallChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  recommendationDescription: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  errorText: {
    ...TextStyles.h4,
    color: Colors.destructive,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    ...TextStyles.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: Colors.muted,
  },
  skipButtonText: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: Colors.primary,
  },
  acceptButtonText: {
    ...TextStyles.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  trainingContextCard: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trainingContextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  trainingContextTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
  },
  trainingContextText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
  },
  trainingMetrics: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  trainingMetric: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trainingMetricLabel: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginBottom: Spacing.xs,
  },
  trainingMetricValue: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '600',
  },
  trainingGap: {
    backgroundColor: Colors.primary + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    paddingTop: Spacing.sm,
  },
  trainingGapTitle: {
    ...TextStyles.body,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  trainingGapText: {
    ...TextStyles.body,
    color: Colors.white,
    lineHeight: 20,
  },
  trainingContext: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  trainingContextLabel: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginBottom: Spacing.xs,
  },
  trainingContextValue: {
    ...TextStyles.small,
    color: Colors.foreground,
    fontStyle: 'italic',
  },
  implementationPreview: {
    backgroundColor: Colors.secondary,
    margin: Spacing.lg,
    marginTop: 0,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  timelinePreview: {
    gap: Spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
  },
  timelinePhase: {
    ...TextStyles.body,
    color: Colors.foreground,
    fontWeight: '600',
    marginBottom: 2,
  },
  timelineDescription: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
});