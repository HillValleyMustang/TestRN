/**
 * AICoachModal Component
 * Modal for AI-powered workout performance analysis
 * Calls Supabase edge function to analyse last 30 days of workouts
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { useAICoachUsage } from '../../hooks/data/useAICoachUsage';
import { useAICoachEligibility } from '../../hooks/data/useAICoachEligibility';
import { useAuth } from '../../app/_contexts/auth-context';

interface AICoachModalProps {
  visible: boolean;
  onClose: () => void;
}

const AI_COACH_DAILY_LIMIT = 2;
const ANALYSIS_STORAGE_KEY = 'ai_coach_analysis';
const ANALYSIS_TIMESTAMP_STORAGE_KEY = 'ai_coach_analysis_timestamp';

// Helper to parse analysis timestamp format: "ISO_DATE|workoutCount"
const parseAnalysisTimestamp = (timestamp: string): { date: Date; workoutCount: number } | null => {
  const [isoDate, countStr] = timestamp.split('|');
  if (!isoDate || !countStr) return null;

  const workoutCount = parseInt(countStr, 10);
  if (isNaN(workoutCount)) return null;

  return {
    date: new Date(isoDate),
    workoutCount,
  };
};

// Helper to create analysis timestamp format: "ISO_DATE|workoutCount"
const createAnalysisTimestamp = (workoutCount: number): string => {
  return `${new Date().toISOString()}|${workoutCount}`;
};

export function AICoachModal({ visible, onClose }: AICoachModalProps) {
  const { data: usageCount = 0, refetch: refetchUsage } = useAICoachUsage();
  const { data: eligibility } = useAICoachEligibility();
  const { supabase, userId } = useAuth();
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  // Timestamp format: "ISO_DATE|workoutCount" - stores both when analysis was created and workout count at that time
  const [lastAnalysisTimestamp, setLastAnalysisTimestamp] = useState<string | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);

  const canUseAiCoach = usageCount < AI_COACH_DAILY_LIMIT;
  const isEligible = eligibility?.isEligible ?? false;

  // Load analysis from AsyncStorage on mount
  useEffect(() => {
    const loadStoredAnalysis = async () => {
      if (!userId) return;

      try {
        const storedAnalysis = await AsyncStorage.getItem(`${ANALYSIS_STORAGE_KEY}_${userId}`);
        const storedTimestamp = await AsyncStorage.getItem(`${ANALYSIS_TIMESTAMP_STORAGE_KEY}_${userId}`);

        if (storedAnalysis && storedTimestamp) {
          setAnalysis(storedAnalysis);
          setLastAnalysisTimestamp(storedTimestamp);
        }
      } catch (error) {
        console.error('[AICoachModal] Failed to load stored analysis:', error);
      } finally {
        setStorageLoaded(true);
      }
    };

    loadStoredAnalysis();
  }, [userId]);

  // Save analysis to AsyncStorage whenever it changes
  useEffect(() => {
    const saveAnalysis = async () => {
      if (!userId || !storageLoaded) return;

      try {
        if (analysis && lastAnalysisTimestamp) {
          await AsyncStorage.setItem(`${ANALYSIS_STORAGE_KEY}_${userId}`, analysis);
          await AsyncStorage.setItem(`${ANALYSIS_TIMESTAMP_STORAGE_KEY}_${userId}`, lastAnalysisTimestamp);
        } else {
          // Clear storage if analysis is cleared
          await AsyncStorage.removeItem(`${ANALYSIS_STORAGE_KEY}_${userId}`);
          await AsyncStorage.removeItem(`${ANALYSIS_TIMESTAMP_STORAGE_KEY}_${userId}`);
        }
      } catch (error) {
        console.error('[AICoachModal] Failed to save analysis:', error);
      }
    };

    saveAnalysis();
  }, [analysis, lastAnalysisTimestamp, userId, storageLoaded]);

  // Reset loading state when modal closes and refetch usage when it opens
  useEffect(() => {
    if (!visible) {
      setLoading(false);
    } else {
      // Refetch usage count when modal opens to ensure it's current
      refetchUsage();
    }
  }, [visible, refetchUsage]);

  // Check if analysis should be cleared (24 hours old or user has new workouts)
  useEffect(() => {
    if (!analysis || !lastAnalysisTimestamp || !storageLoaded) return;

    const parsed = parseAnalysisTimestamp(lastAnalysisTimestamp);

    // If we can't parse the timestamp, clear it
    if (!parsed) {
      console.warn('[AICoachModal] Invalid timestamp format, clearing analysis');
      setAnalysis('');
      setLastAnalysisTimestamp(null);
      return;
    }

    // Check if analysis is older than 24 hours
    const now = new Date();
    const hoursSinceAnalysis = (now.getTime() - parsed.date.getTime()) / (1000 * 60 * 60);

    if (hoursSinceAnalysis >= 24) {
      setAnalysis('');
      setLastAnalysisTimestamp(null);
      return;
    }

    // Check if user has completed a workout since the analysis
    // We can infer this by checking if the eligibility data has changed
    // (workout count would increase after a new workout)
    const checkForNewWorkouts = async () => {
      // If eligibility data is missing, clear analysis to be safe
      if (!eligibility?.workoutCount) {
        console.warn('[AICoachModal] Eligibility data missing, clearing stale analysis');
        setAnalysis('');
        setLastAnalysisTimestamp(null);
        return;
      }

      // If current workout count is higher, user has done a new workout
      if (eligibility.workoutCount > parsed.workoutCount) {
        setAnalysis('');
        setLastAnalysisTimestamp(null);
      }
    };

    checkForNewWorkouts();
  }, [analysis, lastAnalysisTimestamp, eligibility?.workoutCount, storageLoaded]);

  // Parse analysis into structured sections
  const parseAnalysis = (text: string) => {
    const sections: Array<{ title: string; content: string; icon: string }> = [];
    const lines = text.split('\n');
    let currentSection: { title: string; content: string; icon: string } | null = null;

    const iconMap: Record<string, string> = {
      'overall': 'bar-chart',
      'progress': 'trending-up',
      'strength': 'fitness',
      'consistency': 'calendar',
      'recommendation': 'bulb',
      'suggestion': 'bulb',
      'advice': 'bulb',
      'improvement': 'arrow-up-circle',
      'area': 'target',
      'focus': 'eye',
      'volume': 'stats-chart',
      'intensity': 'flame',
      'recovery': 'moon',
      'training': 'barbell',
      'workout': 'fitness',
    };

    const getIcon = (title: string): string => {
      const lowerTitle = title.toLowerCase();
      for (const [keyword, icon] of Object.entries(iconMap)) {
        if (lowerTitle.includes(keyword)) return icon;
      }
      return 'information-circle';
    };

    lines.forEach((line) => {
      // Check if line is a header (starts with **text**)
      const headerMatch = line.match(/^\*\*(.+?)\*\*/);
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        // Start new section
        const title = headerMatch[1];
        currentSection = {
          title,
          content: '',
          icon: getIcon(title),
        };
      } else if (currentSection && line.trim()) {
        // Add content to current section
        const cleanLine = line.replace(/\*\*/g, '').trim();
        if (cleanLine) {
          currentSection.content += (currentSection.content ? '\n' : '') + cleanLine;
        }
      }
    });

    // Add last section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections.length > 0 ? sections : null;
  };

  const renderUnlockScreen = () => {
    if (!eligibility) return null;

    const {
      workoutCount,
      daysSinceFirstWorkout,
      firstWorkoutDate,
      workoutsRemaining,
    } = eligibility;

    // Format first workout date
    const formattedDate = firstWorkoutDate
      ? new Date(firstWorkoutDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'N/A';

    const workoutsMet = workoutCount >= 6;
    const daysMet = daysSinceFirstWorkout >= 30;

    return (
      <View style={styles.unlockScreen}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={48} color="#000" />
          </View>
          <Text style={styles.unlockTitle}>AI Coach Locked</Text>
          <View style={styles.requirementsBadge}>
            <Text style={styles.requirementsBadgeText}>
              6 Workouts + 30 Days Required
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.unlockDescription}>
          Your AI coach needs at least 6 workouts and 30 days of data to provide professional
          coaching advice. The more data you provide, the better the results.
        </Text>

        {/* Progress Cards */}
        <View style={styles.progressCards}>
          <View
            style={[
              styles.progressCard,
              !workoutsMet && styles.progressCardBlocking,
            ]}
          >
            {workoutsMet && <Ionicons name="checkmark-circle" size={24} color="#10B981" style={styles.progressCheckmark} />}
            <Text style={styles.progressIcon}>💪</Text>
            <Text style={styles.progressLabel}>Workouts</Text>
            <Text
              style={[
                styles.progressNumber,
                !workoutsMet && styles.progressNumberBlocking,
              ]}
            >
              {workoutCount} / 6
            </Text>
            {!workoutsMet && <Text style={styles.progressSubtext}>{workoutsRemaining} more to go</Text>}
          </View>

          <View
            style={[
              styles.progressCard,
              !daysMet && styles.progressCardBlocking,
            ]}
          >
            {daysMet && <Ionicons name="checkmark-circle" size={24} color="#10B981" style={styles.progressCheckmark} />}
            <Text style={styles.progressIcon}>📅</Text>
            <Text style={styles.progressLabel}>Days Active</Text>
            <Text
              style={[
                styles.progressNumber,
                !daysMet && styles.progressNumberBlocking,
              ]}
            >
              {daysSinceFirstWorkout} / 30
            </Text>
            <Text style={styles.progressSubtext}>Since {formattedDate}</Text>
          </View>
        </View>

        {/* What You'll Get Section */}
        <View style={styles.benefitsSection}>
          <View style={styles.benefitsHeader}>
            <Ionicons name="sparkles" size={20} color="#FBBF24" />
            <Text style={styles.benefitsTitle}>What You'll Unlock</Text>
          </View>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <Ionicons name="trending-up" size={16} color="#FBBF24" />
              </View>
              <Text style={styles.benefitText}>Progress trends & patterns</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <Ionicons name="fitness" size={16} color="#FBBF24" />
              </View>
              <Text style={styles.benefitText}>Strength development insights</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <Ionicons name="bulb" size={16} color="#FBBF24" />
              </View>
              <Text style={styles.benefitText}>Personalised recommendations</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <Ionicons name="locate" size={16} color="#FBBF24" />
              </View>
              <Text style={styles.benefitText}>Focus areas for improvement</Text>
            </View>
          </View>
        </View>

        {/* Why Section */}
        <View style={styles.whySection}>
          <View style={styles.whySectionHeader}>
            <Ionicons name="help-circle-outline" size={18} color={Colors.mutedForeground} />
            <Text style={styles.whySectionTitle}>Why these requirements?</Text>
          </View>
          <Text style={styles.whyReasonText}>
            <Text style={styles.whyReasonBold}>6 workouts</Text> identify training patterns. {' '}
            <Text style={styles.whyReasonBold}>30 days</Text> reveal consistency and recovery needs. Together they create a complete picture for meaningful coaching advice.
          </Text>
        </View>

        {/* Usage Policy */}
        <View style={styles.policySection}>
          <View style={styles.policySectionHeader}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.mutedForeground} />
            <Text style={styles.policySectionTitle}>How it works</Text>
          </View>
          <Text style={styles.policyText}>
            Your results stay available to review until you complete a new workout.
          </Text>
        </View>
      </View>
    );
  };

  const renderAnalysis = () => {
    const sections = parseAnalysis(analysis);

    // Format last analysis timestamp for display
    const formatAnalysisDate = () => {
      if (!lastAnalysisTimestamp) return '';

      const parsed = parseAnalysisTimestamp(lastAnalysisTimestamp);
      if (!parsed) return '';

      const now = new Date();
      const diffMs = now.getTime() - parsed.date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
      if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;

      return parsed.date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    if (!sections) {
      // Fallback to plain text if parsing fails
      return (
        <View style={styles.analysisContainer}>
          <Text style={styles.analysisText}>{analysis}</Text>
        </View>
      );
    }

    return (
      <View style={styles.analysisResults}>
        <View style={styles.resultsHeader}>
          <Ionicons name="sparkles" size={32} color="#FBBF24" />
          <Text style={styles.resultsTitle}>Your Personalised Analysis</Text>
          {lastAnalysisTimestamp && (
            <Text style={styles.analysisTimestamp}>{formatAnalysisDate()}</Text>
          )}
        </View>

        {sections.map((section, index) => (
          <View key={index} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon as any} size={22} color="#FBBF24" />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.analysisFooter}>
          <View style={styles.footerInfo}>
            <Ionicons name="information-circle" size={16} color={Colors.mutedForeground} />
            <Text style={styles.footerText}>
              Analysis based on your last 30 days of training data
            </Text>
          </View>
          {canUseAiCoach && (
            <Pressable
              style={styles.refreshButton}
              onPress={handleAnalyze}
            >
              <Ionicons name="refresh" size={16} color="#FBBF24" />
              <Text style={styles.refreshButtonText}>Refresh Analysis</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const handleAnalyze = async () => {
    if (usageCount >= AI_COACH_DAILY_LIMIT) {
      Alert.alert(
        'Daily Limit Reached',
        `You've reached the limit of ${AI_COACH_DAILY_LIMIT} AI coach uses per day.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    setAnalysis('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: {},
      });

      if (error) {
        console.error('[AICoachModal] Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('[AICoachModal] Data error:', data.error);
        throw new Error(data.error);
      }

      setAnalysis(data?.analysis || 'No analysis available');

      // Store timestamp with current workout count for staleness checking
      const timestamp = createAnalysisTimestamp(eligibility?.workoutCount || 0);
      setLastAnalysisTimestamp(timestamp);

      // Re-fetch usage count
      await refetchUsage();

    } catch (err: any) {
      console.error('[AICoachModal] Error details:', {
        message: err.message,
        context: err.context,
        error: err,
      });

      // Show user-friendly error message
      const errorMessage = err.message?.includes('status code')
        ? 'The AI Coach service is temporarily unavailable. Please try again later.'
        : err.message || 'Failed to get AI analysis. Please try again later.';

      Alert.alert(
        'Analysis Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles" size={24} color="#FBBF24" />
            <Text style={styles.headerTitle}>AI Fitness Coach</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.foreground} />
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {!analysis && !loading && !isEligible && renderUnlockScreen()}

          {!analysis && !loading && isEligible && (
            <View style={styles.centerContent}>
              {canUseAiCoach ? (
                <>
                  <Ionicons name="sparkles" size={56} color="#FBBF24" style={styles.heroIcon} />
                  <Text style={styles.title}>Your Personal AI Fitness Coach</Text>
                  <Text style={styles.description}>
                    Get intelligent, personalised feedback on your training progress. The AI analyses:
                  </Text>
                  <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                      <Ionicons name="fitness" size={20} color="#FBBF24" />
                      <Text style={styles.featureText}>Your last 30 days of workouts</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="star" size={20} color="#FBBF24" />
                      <Text style={styles.featureText}>Your workout ratings and performance</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="trending-up" size={20} color="#FBBF24" />
                      <Text style={styles.featureText}>Progress patterns and consistency</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="bulb" size={20} color="#FBBF24" />
                      <Text style={styles.featureText}>Actionable insights to improve results</Text>
                    </View>
                  </View>
                  <Pressable
                    style={styles.analyzeButton}
                    onPress={handleAnalyze}
                  >
                    <Ionicons name="sparkles" size={20} color="#fff" />
                    <Text style={styles.analyzeButtonText}>Analyse My Performance</Text>
                  </Pressable>
                  <Text style={styles.usageText}>
                    {AI_COACH_DAILY_LIMIT - usageCount} {AI_COACH_DAILY_LIMIT - usageCount === 1 ? 'use' : 'uses'} remaining today
                  </Text>
                  <View style={styles.readyPolicyBox}>
                    <Ionicons name="information-circle" size={16} color={Colors.mutedForeground} />
                    <Text style={styles.readyPolicyText}>
                      Your analysis stays available until your next workout and remains viewable for 24 hours.
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.limitReached}>
                  <Ionicons name="alert-circle" size={48} color="#FBBF24" />
                  <Text style={styles.limitReachedText}>
                    You've reached the limit of {AI_COACH_DAILY_LIMIT} AI coach uses per day.
                  </Text>
                  <Text style={styles.limitReachedSubtext}>
                    The AI Coach needs at least 3 workouts in the last 30 days to provide advice.
                  </Text>
                </View>
              )}
            </View>
          )}

          {loading && (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#FBBF24" />
              <Text style={styles.loadingText}>
                Analysing your performance... This may take a moment.
              </Text>
            </View>
          )}

          {analysis && renderAnalysis()}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    color: Colors.foreground,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.xl * 2,
  },
  heroIcon: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  featuresList: {
    width: '100%',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: Colors.foreground,
    flex: 1,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FBBF24',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  analyzeButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  usageText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  limitReached: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  limitReachedText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.foreground,
    textAlign: 'center',
  },
  limitReachedSubtext: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  loadingText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  analysisContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  analysisText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
  // Enhanced analysis results styles
  analysisResults: {
    gap: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  resultsHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  resultsTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    color: Colors.foreground,
    textAlign: 'center',
  },
  analysisTimestamp: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    color: Colors.foreground,
    flex: 1,
  },
  sectionContent: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: Colors.foreground,
    lineHeight: 22,
  },
  analysisFooter: {
    marginTop: Spacing.md,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  footerText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FBBF24',
    alignSelf: 'center',
  },
  refreshButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FBBF24',
  },
  // Unlock screen styles
  unlockScreen: {
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  unlockTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    color: Colors.foreground,
    textAlign: 'center',
  },
  requirementsBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  requirementsBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#000',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  unlockDescription: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginHorizontal: Spacing.xl,
    lineHeight: 22,
  },
  progressCards: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    marginTop: Spacing.md,
  },
  progressCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.xs,
    position: 'relative',
  },
  progressCardBlocking: {
    borderColor: '#FBBF24',
    borderWidth: 2,
  },
  progressCheckmark: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  progressIcon: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  progressNumber: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
    color: Colors.foreground,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  progressNumberBlocking: {
    color: '#FBBF24',
    fontSize: 32,
  },
  progressSubtext: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  analyzeButtonDisabled: {
    backgroundColor: Colors.mutedForeground,
    marginTop: Spacing.lg,
  },
  // Benefits section styles
  benefitsSection: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  benefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  benefitsTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.foreground,
  },
  benefitsList: {
    gap: Spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  benefitIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FBBF2420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.foreground,
    flex: 1,
  },
  // Why section styles
  whySection: {
    width: '100%',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  whySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  whySectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  whyReasonText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  whyReasonBold: {
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.foreground,
  },
  // Policy section styles
  policySection: {
    width: '100%',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  policySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  policySectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  policyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  policyBold: {
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.foreground,
  },
  // Ready screen policy box styles
  readyPolicyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
    maxWidth: '90%',
  },
  readyPolicyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: Colors.mutedForeground,
    lineHeight: 18,
    flex: 1,
  },
});
