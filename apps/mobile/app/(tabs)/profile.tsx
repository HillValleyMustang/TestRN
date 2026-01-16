/**
 * Profile Screen - Complete implementation with 6 tabs
 * Tabs: Overview | Stats | Photo | Media | Social | Settings
 * Reference: MOBILE_SPEC_05_PROFILE_FULL.md
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../_contexts/auth-context';
import { useData, UserAchievement } from '../_contexts/data-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { achievementsList, ACHIEVEMENT_DISPLAY_INFO, ACHIEVEMENT_IDS } from '@data/constants/achievements';
import { TextStyles } from '../../constants/Typography';
import { useLevelFromPoints } from '../../hooks/useLevelFromPoints';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { BackgroundRoot } from '../../components/BackgroundRoot';
import { PointsExplanationModal } from '../../components/profile/PointsExplanationModal';
import { EditNameModal } from '../../components/profile/EditNameModal';
import { BodyMetricsModal } from '../../components/profile/BodyMetricsModal';
import { AvatarUploadModal } from '../../components/profile/AvatarUploadModal';
import { ChangePasswordModal } from '../../components/profile/ChangePasswordModal';
import { WorkoutPreferencesModal } from '../../components/profile/WorkoutPreferencesModal';
import { AchievementDetailModal } from '../../components/profile/AchievementDetailModal';
import { PersonalInfoCard } from '../../components/profile/PersonalInfoCard';
import { WorkoutPreferencesCard } from '../../components/profile/WorkoutPreferencesCard';
import { ProgrammeTypeCard } from '../../components/profile/ProgrammeTypeCard';
import { MyGymsCardNew } from '../../components/profile/MyGymsCardNew';
import { AICoachUsageCard } from '../../components/profile/AICoachUsageCard';
import { TrainingProfileCard } from '../../components/profile/TrainingProfileCard';
import { DataExportCard } from '../../components/profile/DataExportCard';
import { ManageGymWorkoutsDialog } from '../../components/profile/ManageGymWorkoutsDialog';
import { PhotoJourneyTab } from '../../components/profile/PhotoJourneyTab';
import { PhotoCaptureFlow } from '../../components/profile/PhotoCaptureFlow';
import { UploadPhotoDialog } from '../../components/profile/UploadPhotoDialog';
import { PhotoComparisonDialog } from '../../components/profile/PhotoComparisonDialog';
import { PhotoLightboxDialog } from '../../components/profile/PhotoLightboxDialog';
import { PhotoSourceSelectionModal } from '../../components/profile/PhotoSourceSelectionModal';
import { GoalPhysiqueUploadModal } from '../../components/profile/GoalPhysiqueUploadModal';
import { PhysiqueAnalysisModal } from '../../components/profile/PhysiqueAnalysisModal';
import { GoalPhysiqueGallery } from '../../components/profile/GoalPhysiqueGallery';
import { AIWorkoutService, OnboardingPayload } from '../../lib/ai-workout-service';
import { database } from '../_lib/database';

const { width } = Dimensions.get('window');

const HEADER_MAX_HEIGHT = 270; // Increased to accommodate full header and tabs
const HEADER_MIN_HEIGHT = 0;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
const TAB_BAR_HEIGHT = 56; // Approximate height of the tab bar
const HEADER_OFFSET = 60; // Additional offset to move nav bar below page header

type Tab = 'overview' | 'stats' | 'photo' | 'media' | 'social' | 'settings';

const PROFILE_TAB_KEY = 'profile_active_tab';

const TABS_ORDER: Tab[] = [
  'overview',
  'stats',
  'photo',
  'media',
  'social',
  'settings',
];

const TAB_ICONS: Record<Tab, keyof typeof Ionicons.glyphMap> = {
  overview: 'bar-chart',
  stats: 'trending-up',
  photo: 'camera',
  media: 'film',
  social: 'people',
  settings: 'settings',
};

const TAB_COLORS: Record<Tab, string> = {
  overview: '#3B82F6', // Blue
  stats: '#EC4899', // Pink
  photo: '#06B6D4', // Cyan
  media: '#A855F7', // Purple
  social: '#3B82F6', // Blue
  settings: '#6B7280', // Gray
};

export default function ProfileScreen() {
  const { session, userId, supabase } = useAuth();
  const { forceRefresh, invalidateAllCaches, setShouldRefreshDashboard, getUserAchievements } = useData();

  console.log('[Profile] Component rendered with forceRefresh:', forceRefresh, 'profile total_points:', profile?.total_points);
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; scrollTo?: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [profile, setProfile] = useState<any>(null);
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointsModalVisible, setPointsModalVisible] = useState(false);
  const [editNameModalVisible, setEditNameModalVisible] = useState(false);
  const [bodyMetricsModalVisible, setBodyMetricsModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);
  const [achievementModalVisible, setAchievementModalVisible] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [complexAchievementProgress, setComplexAchievementProgress] = useState<{
    weekendWorkouts: number;
    earlyBirdWorkouts: number;
    totalSets: number;
  }>({ weekendWorkouts: 0, earlyBirdWorkouts: 0, totalSets: 0 });
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [manageWorkoutsVisible, setManageWorkoutsVisible] = useState(false);
  const [selectedGymId, setSelectedGymId] = useState<string>('');
  const [selectedGymName, setSelectedGymName] = useState<string>('');

  // Animation values for tab icons
  const tabScales = useRef<Record<Tab, Animated.Value>>(
    TABS_ORDER.reduce(
      (acc, tab) => ({
        ...acc,
        [tab]: new Animated.Value(tab === 'overview' ? 1.1 : 1),
      }),
      {} as Record<Tab, Animated.Value>
    )
  ).current;

  // Scroll animation for header
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });


  // PagerView ref for programmatic navigation
  const pagerRef = useRef<PagerView>(null);

  // ScrollView refs for programmatic scrolling
  const overviewScrollRef = useRef<ScrollView>(null);

  const levelInfo = useLevelFromPoints(profile?.total_points || 0);

  useEffect(() => {
    console.log('[Profile] Profile state changed, total_points:', profile?.total_points);
  }, [profile?.total_points]);

  useEffect(() => {
    console.log('[Profile] useEffect triggered - loading profile, forceRefresh:', forceRefresh, 'userId:', userId);
    // Always fetch fresh profile data to ensure points are up to date
    loadProfile();
    loadAchievements();
    loadSavedTab();
  }, [userId, forceRefresh]);

  // Refresh profile data when this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Profile] Tab focused - refreshing profile data');
      loadProfile();
      loadAchievements();
    }, [userId])
  );

  // Also refresh when the component becomes active (not just on focus)
  useEffect(() => {
    console.log('[Profile] Component active - ensuring fresh data');
    const timer = setTimeout(() => {
      loadProfile();
    }, 500); // Small delay to ensure other updates complete
    return () => clearTimeout(timer);
  }, []);

  // Handle tab query parameter and scrolling
  useEffect(() => {
    if (params.tab && ['overview', 'stats', 'photo', 'media', 'social', 'settings'].includes(params.tab)) {
      const requestedTab = params.tab as Tab;
      setActiveTab(requestedTab);
      // Also update the pager view
      const tabIndex = TABS_ORDER.indexOf(requestedTab);
      if (pagerRef.current && tabIndex !== -1) {
        pagerRef.current.setPage(tabIndex);
      }

      // Handle scrolling to specific sections
      if (params.scrollTo === 'achievements' && requestedTab === 'overview') {
        // Delay scrolling to ensure the view is fully rendered
        setTimeout(() => {
          if (overviewScrollRef.current) {
            // Scroll to a position that shows the achievements section
            // Based on the layout: header + tabs + stat cards + some padding
            const scrollY = 400; // Approximate position of achievements section
            overviewScrollRef.current.scrollTo({ y: scrollY, animated: true });
          }
        }, 500); // Delay to ensure rendering is complete
      }
    }
  }, [params.tab, params.scrollTo]);

  const loadProfile = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      console.log('[Profile] Starting profile load for user:', userId, 'at timestamp:', Date.now());

      // Load profile data
      const profileRes = await supabase
        .from('profiles')
        .select('*, full_name')
        .eq('id', userId)
        .single();

      if (profileRes.error) {
        console.error('[Profile] Profile query error:', profileRes.error);
        throw profileRes.error;
      }

      console.log('[Profile] Profile data loaded:', profileRes.data?.id, 'total_points:', profileRes.data?.total_points, 'forceRefresh value:', forceRefresh);

      // Load gyms data
      const gymsRes = await supabase
        .from('gyms')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      console.log('[Profile] Gyms loaded:', gymsRes.data?.length || 0);

      // Load workout statistics - optimized queries
      const [totalWorkoutsRes, workoutDatesRes] =
        await Promise.all([
          // Total workouts: count completed workout_sessions
          supabase
            .from('workout_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .not('completed_at', 'is', null),

          // Get workout dates for streak calculation - limit to recent
          supabase
            .from('workout_sessions')
            .select('completed_at')
            .eq('user_id', userId)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(14), // Reduced from 30 to 14 for better performance
        ]);

      if (totalWorkoutsRes.error) {
        console.error('[Profile] Total workouts query error:', totalWorkoutsRes.error);
        throw totalWorkoutsRes.error;
      }
      if (workoutDatesRes.error) {
        console.error('[Profile] Workout dates query error:', workoutDatesRes.error);
        throw workoutDatesRes.error;
      }

      console.log('[Profile] Workout stats loaded - total:', totalWorkoutsRes.count);

      // Skip unique exercises count for now - use a simple estimate
      // This prevents the RPC call that doesn't exist
      const uniqueExercisesCount = Math.min(totalWorkoutsRes.count || 0, 15); // Conservative estimate

      // Calculate current streak - optimized
      const workoutDates =
        workoutDatesRes.data?.map(session =>
          new Date(session.completed_at).toDateString()
        ) || [];

      let currentStreak = 0;
      const today = new Date().toDateString();
      const yesterday = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toDateString();

      // Check if worked out today or yesterday (to handle timezone issues)
      const hasRecentWorkout =
        workoutDates.includes(today) || workoutDates.includes(yesterday);

      if (hasRecentWorkout) {
        // Calculate consecutive days - optimized
        const uniqueDates = [...new Set(workoutDates)].sort(
          (a, b) => new Date(b).getTime() - new Date(a).getTime()
        );

        for (let i = 0; i < uniqueDates.length; i++) {
          const expectedDate = new Date(
            Date.now() - i * 24 * 60 * 60 * 1000
          ).toDateString();
          if (uniqueDates[i] === expectedDate) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Combine profile data with calculated stats
      const profileData = {
        ...profileRes.data,
        total_workouts: totalWorkoutsRes.count || 0,
        unique_exercises: uniqueExercisesCount,
        current_streak: currentStreak,
      };

      console.log('[Profile] Final profile data:', {
        id: profileData.id,
        total_workouts: profileData.total_workouts,
        current_streak: profileData.current_streak,
        unique_exercises: profileData.unique_exercises
      });

      console.log('[Profile] Setting profile state with total_points:', profileData.total_points);
      setProfile(profileData);

      if (gymsRes.data) {
        setGyms(gymsRes.data);
      }
    } catch (error) {
      console.error('[Profile] Error loading profile:', error);

      // Create fallback profile data so header renders
      const fallbackProfile = {
        id: userId,
        user_id: userId,
        full_name: session?.user?.user_metadata?.full_name || 'Athlete',
        first_name: session?.user?.user_metadata?.first_name || 'Athlete',
        last_name: session?.user?.user_metadata?.last_name || '',
        total_points: 0,
        total_workouts: 0,
        unique_exercises: 0,
        current_streak: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('[Profile] Using fallback profile data');
      setProfile(fallbackProfile);
      setGyms([]);

      // Don't show error alert for now - just log it
      // Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updates: any) => {
    if (!userId) return;

    try {
      console.log('[Profile] Updating profile with:', updates);
      
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('[Profile] Database update error:', error);
        throw error;
      }

      console.log('[Profile] Database updated successfully, refreshing caches');
      
      // Verify the update was saved (especially important for programme_type changes)
      if (updates.programme_type) {
        const { data: verifyData } = await supabase
          .from('profiles')
          .select('programme_type')
          .eq('id', userId)
          .single();
        
        console.log('[Profile] Verification - programme_type in DB:', verifyData?.programme_type, 'Expected:', updates.programme_type);
      }
      
      // Update local state immediately
      setProfile({ ...profile, ...updates });
      
      // Clear all caches immediately to force fresh data fetch
      invalidateAllCaches();
      
      // Set flag to trigger dashboard refresh on next mount/focus
      setShouldRefreshDashboard(true);
      
      // Small delay to ensure Supabase propagation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify the update worked by reloading profile
      await loadProfile();
      
      console.log('[Profile] Profile update and cache refresh complete');
    } catch (error) {
      console.error('[Profile] Failed to update profile:', error);
      throw error;
    }
  };

  const handleRegenerateTPath = async (newProgrammeType: 'ppl' | 'ulul') => {
    if (!userId || !session?.access_token || !profile) {
      console.error('[Profile] Missing required data for T-Path regeneration');
      return;
    }

    try {
      console.log('[Profile] Starting T-Path regeneration for type:', newProgrammeType);
      
      // Get active gym
      const activeGymId = profile.active_gym_id || gyms[0]?.id;
      if (!activeGymId) {
        throw new Error('No active gym found');
      }

      // Convert session length from number to string format if needed
      let sessionLengthString: string;
      const sessionLength = profile.preferred_session_length;
      if (typeof sessionLength === 'number') {
        const sessionLengthMap: Record<number, string> = {
          30: '15-30',
          45: '30-45',
          60: '45-60',
          90: '60-90',
        };
        sessionLengthString = sessionLengthMap[sessionLength] || '45-60';
      } else {
        sessionLengthString = sessionLength || '45-60';
      }

      // Build payload for workout generation - USE THE NEW PROGRAMME TYPE PASSED IN
      const payload: OnboardingPayload = {
        fullName: profile.full_name || 'Athlete',
        heightCm: profile.height_cm || 175,
        weightKg: profile.weight_kg || 75,
        bodyFatPct: profile.body_fat_pct,
        tPathType: newProgrammeType, // Use the new type, not from profile state!
        experience: 'intermediate',
        goalFocus: profile.primary_goal || 'muscle_gain',
        preferredMuscles: profile.preferred_muscles || '',
        constraints: profile.health_notes || '',
        sessionLength: sessionLengthString,
        gymId: activeGymId,
        equipmentMethod: 'skip',
        unitSystem: profile.unit_system || 'metric',
      };

      console.log('[Profile] Payload tPathType:', payload.tPathType);

      console.log('[Profile] Generating new workout plan with payload:', payload);

      // Call AI service to generate new workout plan
      const aiResponse = await AIWorkoutService.generateWorkoutPlan(
        payload,
        session.access_token
      );

      console.log('[Profile] New workout plan generated:', aiResponse);

      // Delete old T-Path and workouts from local database
      if (profile.active_t_path_id) {
        console.log('[Profile] Deleting old T-Path:', profile.active_t_path_id);
        await database.deleteTPath(profile.active_t_path_id);
      }

      // Save new T-Path to local database
      console.log('[Profile] Saving new T-Path to local database');
      await database.addTPath({
        id: aiResponse.mainTPath.id,
        user_id: userId,
        template_name: aiResponse.mainTPath.template_name,
        description: aiResponse.mainTPath.description,
        t_path_type: aiResponse.mainTPath.t_path_type,
        experience_level: aiResponse.mainTPath.experience_level,
        session_length: aiResponse.mainTPath.session_length,
        created_at: aiResponse.mainTPath.created_at,
        updated_at: aiResponse.mainTPath.created_at,
        parent_id: null,
        gym_id: activeGymId,
        is_active: true,
      });

      // Save child workouts
      console.log('[Profile] Saving child workouts');
      for (const workout of aiResponse.childWorkouts) {
        await database.addTPath({
          id: workout.id,
          user_id: userId,
          template_name: workout.workout_name,
          description: '',
          t_path_type: aiResponse.mainTPath.t_path_type,
          experience_level: aiResponse.mainTPath.experience_level,
          session_length: aiResponse.mainTPath.session_length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          parent_id: aiResponse.mainTPath.id,
          gym_id: activeGymId,
          is_active: true,
        });

        // Save exercises for each workout
        console.log('[Profile] Saving exercises for workout:', workout.workout_name, 'count:', workout.exercises.length);
        for (const exercise of workout.exercises) {
          // Get the exercise ID - could be exercise_id or id depending on response structure
          const exerciseId = (exercise as any).exercise_id || (exercise as any).id;
          
          if (!exerciseId) {
            console.warn('[Profile] Skipping exercise without ID:', exercise);
            continue;
          }

          try {
            await database.addTPathExercise({
              id: `${workout.id}_${exerciseId}_${Date.now()}_${exercise.order_index}`,
              t_path_id: workout.id,
              exercise_id: exerciseId,
              order_index: exercise.order_index,
              is_bonus_exercise: Boolean((exercise as any).is_bonus_exercise),
              created_at: new Date().toISOString(),
            } as any);
            console.log('[Profile] Saved exercise:', exerciseId);
          } catch (exerciseError) {
            console.error('[Profile] Failed to save exercise:', exerciseId, exerciseError);
            // Continue with next exercise instead of failing the entire workout
          }
        }
      }

      // Update profile with new active_t_path_id AND programme_type to ensure it's persisted
      console.log('[Profile] Updating profile with new T-Path ID and programme type:', newProgrammeType);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          active_t_path_id: aiResponse.mainTPath.id,
          programme_type: newProgrammeType,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('[Profile] Failed to update profile:', updateError);
        throw updateError;
      }

      // Update local state with both the new T-Path ID and programme type
      setProfile({ 
        ...profile, 
        active_t_path_id: aiResponse.mainTPath.id,
        programme_type: newProgrammeType
      });

      // Clear all caches and trigger refresh
      invalidateAllCaches();
      setShouldRefreshDashboard(true);
      
      // Small delay before reloading
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Reload profile to verify
      await loadProfile();

      // Verify the programme type was saved correctly
      const { data: verifyData } = await supabase
        .from('profiles')
        .select('programme_type, active_t_path_id')
        .eq('id', userId)
        .single();
      
      console.log('[Profile] Verification - Database values:', {
        programme_type: verifyData?.programme_type,
        active_t_path_id: verifyData?.active_t_path_id,
        expected_programme_type: newProgrammeType,
        expected_t_path_id: aiResponse.mainTPath.id
      });

      console.log('[Profile] T-Path regeneration complete');
      
      Toast.show({
        type: 'success',
        text1: 'Workout Plan Updated',
        text2: 'Your new workout plan has been generated successfully',
        position: 'bottom',
        visibilityTime: 3000,
      });
    } catch (error: any) {
      console.error('[Profile] T-Path regeneration failed:', error);
      Alert.alert(
        'Error',
        `Failed to regenerate workout plan: ${error.message || 'Unknown error'}`
      );
      throw error;
    }
  };

  const handleRefreshGyms = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('gyms')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (data) {
      setGyms(data);
    }

    // Also refresh profile to get updated active_gym_id
    await loadProfile();
  };

  const loadComplexAchievementProgress = async () => {
    if (!userId) return;
    
    try {
      // Query workout sessions to calculate complex achievement progress
      const { data: workoutSessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('session_date, completed_at')
        .eq('user_id', userId)
        .not('completed_at', 'is', null);
      
      if (sessionsError) {
        console.error('[Profile] Error loading workout sessions for achievements:', sessionsError);
        return;
      }
      
      // Calculate weekend workouts (Saturday = 6, Sunday = 0)
      const weekendWorkouts = (workoutSessions || []).filter(session => {
        const date = new Date(session.session_date);
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
      }).length;
      
      // Calculate early bird workouts (before 8 AM)
      const earlyBirdWorkouts = (workoutSessions || []).filter(session => {
        const date = new Date(session.completed_at);
        const hour = date.getHours();
        return hour < 8;
      }).length;
      
      // Query set logs to count total sets
      const { data: setLogs, error: setLogsError } = await supabase
        .from('set_logs')
        .select('id, workout_sessions!inner(user_id)')
        .eq('workout_sessions.user_id', userId);
      
      if (setLogsError) {
        console.error('[Profile] Error loading set logs for achievements:', setLogsError);
      }
      
      const totalSets = setLogs?.length || 0;
      
      setComplexAchievementProgress({
        weekendWorkouts,
        earlyBirdWorkouts,
        totalSets,
      });
      
      console.log('[Profile] Complex achievement progress:', {
        weekendWorkouts,
        earlyBirdWorkouts,
        totalSets,
      });
    } catch (error) {
      console.error('[Profile] Error calculating complex achievement progress:', error);
    }
  };

  const loadAchievements = async () => {
    if (!userId) return;
    setLoadingAchievements(true);
    try {
      const achievements = await getUserAchievements(userId);
      setUserAchievements(achievements);
      // Also load complex achievement progress
      await loadComplexAchievementProgress();
    } catch (error) {
      console.error('[Profile] Error loading achievements:', error);
    } finally {
      setLoadingAchievements(false);
    }
  };

  const calculateAchievementProgress = (achievementId: string, isUnlocked: boolean): { progress: number; total: number } => {
    if (!profile) return { progress: 0, total: 1 };

    const totalWorkouts = profile.total_workouts || 0;
    const totalPoints = profile.total_points || 0;
    const currentStreak = profile.current_streak || 0;

    switch (achievementId) {
      case ACHIEVEMENT_IDS.FIRST_WORKOUT:
        return { progress: totalWorkouts >= 1 ? 1 : 0, total: 1 };
      
      case ACHIEVEMENT_IDS.TWENTY_FIVE_WORKOUTS:
        return { progress: totalWorkouts, total: 25 };
      
      case ACHIEVEMENT_IDS.FIFTY_WORKOUTS:
        return { progress: totalWorkouts, total: 50 };
      
      case ACHIEVEMENT_IDS.TEN_DAY_STREAK:
        return { progress: currentStreak, total: 10 };
      
      case ACHIEVEMENT_IDS.THIRTY_DAY_STREAK:
        return { progress: currentStreak, total: 30 };
      
      case ACHIEVEMENT_IDS.CENTURY_CLUB:
        return { progress: totalPoints, total: 1000 };
      
      // For complex achievements, use actual calculated progress
      case ACHIEVEMENT_IDS.WEEKEND_WARRIOR:
        return { progress: complexAchievementProgress.weekendWorkouts, total: 10 };
      
      case ACHIEVEMENT_IDS.EARLY_BIRD:
        return { progress: complexAchievementProgress.earlyBirdWorkouts, total: 10 };
      
      case ACHIEVEMENT_IDS.VOLUME_MASTER:
        return { progress: complexAchievementProgress.totalSets, total: 100 };
      
      case ACHIEVEMENT_IDS.PERFECT_WEEK:
      case ACHIEVEMENT_IDS.BEAST_MODE:
      case ACHIEVEMENT_IDS.AI_APPRENTICE:
        return { progress: isUnlocked ? 1 : 0, total: 1 };
      
      default:
        return { progress: 0, total: 1 };
    }
  };

  const mapAchievements = () => {
    const unlockedIds = new Set(userAchievements.map(a => a.achievement_id));
    
    return achievementsList.map(achievement => {
      const isUnlockedInDb = unlockedIds.has(achievement.id);
      const displayInfo = ACHIEVEMENT_DISPLAY_INFO[achievement.id];
      // Calculate progress - for simple achievements, isUnlocked doesn't matter
      // For complex achievements, we need isUnlockedInDb
      const { progress, total } = calculateAchievementProgress(achievement.id, isUnlockedInDb);
      
      // Determine final unlock status
      // For most achievements with progress tracking (total > 1), check database OR progress
      // For achievements we can't track progress (Perfect Week, Beast Mode, AI Apprentice), only check database
      const isComplexNoProgress = [
        ACHIEVEMENT_IDS.PERFECT_WEEK,
        ACHIEVEMENT_IDS.BEAST_MODE,
        ACHIEVEMENT_IDS.AI_APPRENTICE,
      ].includes(achievement.id);
      
      const isUnlocked = isComplexNoProgress 
        ? isUnlockedInDb 
        : isUnlockedInDb || (progress >= total && total > 1);
      
      return {
        id: achievement.id,
        name: displayInfo?.name || achievement.name,
        icon: displayInfo?.icon || achievement.icon,
        description: displayInfo?.description || '',
        progress,
        total,
        unlocked: isUnlocked,
      };
    });
  };

  const handleManageGym = (gymId: string) => {
    const gym = gyms.find(g => g.id === gymId);
    if (gym) {
      setSelectedGymId(gymId);
      setSelectedGymName(gym.name);
      setManageWorkoutsVisible(true);
    }
  };

  const loadSavedTab = async () => {
    try {
      const saved = await AsyncStorage.getItem(PROFILE_TAB_KEY);
      if (
        saved &&
        ['overview', 'stats', 'photo', 'media', 'social', 'settings'].includes(
          saved
        )
      ) {
        const savedTab = saved as Tab;

        // Reset all tab scales to 1
        TABS_ORDER.forEach(tab => {
          tabScales[tab].setValue(1);
        });

        // Animate the saved tab to 1.1
        Animated.spring(tabScales[savedTab], {
          toValue: 1.1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();

        setActiveTab(savedTab);
      }
    } catch (error) {
      console.error('[Profile] Error loading saved tab:', error);
    }
  };

  const handleTabChange = async (tab: Tab) => {
    // Animate out old tab
    if (activeTab) {
      Animated.spring(tabScales[activeTab], {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }

    // Animate in new tab
    Animated.spring(tabScales[tab], {
      toValue: 1.1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    setActiveTab(tab);

    // Navigate to the corresponding page in PagerView
    const tabIndex = TABS_ORDER.indexOf(tab);
    if (pagerRef.current && tabIndex !== -1) {
      pagerRef.current.setPage(tabIndex);
    }

    try {
      await AsyncStorage.setItem(PROFILE_TAB_KEY, tab);
    } catch (error) {
      console.error('[Profile] Error saving tab:', error);
    }
  };

  const handlePageChange = (pageIndex: number) => {
    const newTab = TABS_ORDER[pageIndex];
    if (newTab) {
      setActiveTab(newTab);
      // Reset scroll position to top when switching tabs
      scrollY.setValue(0);
      // Update tab scales
      TABS_ORDER.forEach(tab => {
        Animated.spring(tabScales[tab], {
          toValue: tab === newTab ? 1.1 : 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      });
    }
  };

  const getInitials = () => {
    const userName = profile?.full_name ||
                     session?.user?.user_metadata?.full_name ||
                     'Athlete';

    // Generate initials from the user's actual name - take first letter of each word
    const nameParts = userName.trim().split(' ');
    const initials = nameParts.map((part: string) => part[0]).join('').toUpperCase();

    return initials || 'A'; // Fallback to 'A' if no initials
  };

  const getMemberSince = () => {
    if (!profile?.created_at) return 'New Member';
    const date = new Date(profile.created_at);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const renderAvatar = () => {
    if (profile?.avatar_url) {
      return (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
      );
    }
    return (
      <View style={[styles.avatar, styles.avatarFallback]}>
        <Text style={styles.avatarText}>{getInitials()}</Text>
      </View>
    );
  };

  const renderHeader = () => {
    // Use profile data if available, otherwise use fallback
    const displayProfile = profile || {
      total_points: 0,
      created_at: new Date().toISOString(),
    };

    return (
      <View style={styles.header}>
        {renderAvatar()}

        <Text style={styles.displayName}>
          {(() => {
            // Always use 'Athlete' as the display name, but generate initials from user's actual name
            const userName = displayProfile?.full_name ||
                             session?.user?.user_metadata?.full_name ||
                             'Athlete';

            // Generate initials from the user's actual name - take first letter of each word
            const nameParts = userName.trim().split(' ');
            const initials = nameParts.map((part: string) => part[0]).join('').toUpperCase();

            return `Athlete ${initials}`;
          })()}
        </Text>

        <View style={styles.metaRow}>
          <TouchableOpacity
            style={[
              styles.levelPill,
              { backgroundColor: levelInfo.backgroundColor },
            ]}
            onPress={() => {
              setLevelModalVisible(true);
            }}
          >
            <View style={styles.levelPillContent}>
              <Text style={[styles.levelText, { color: levelInfo.color }]}>
                {levelInfo.levelName}
              </Text>
              <Text style={[styles.levelText, { color: levelInfo.color }]}>
                {displayProfile?.total_points || 0} pts
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.memberSince}>Member since {getMemberSince()}</Text>
        </View>

        {levelInfo.nextThreshold && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${levelInfo.progressToNext}%`,
                    backgroundColor: levelInfo.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(levelInfo.progressToNext)}% to {levelInfo.nextThreshold}{' '}
              pts
            </Text>
          </View>
        )}
      </View>
    );
  };

  const handleAchievementPress = (achievement: ReturnType<typeof mapAchievements>[0]) => {
    setSelectedAchievement(achievement);
    setAchievementModalVisible(true);
  };

  const renderTabs = () => (
    <View style={styles.tabBar}>
      {TABS_ORDER.map(tab => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.tabActive]}
          onPress={() => handleTabChange(tab)}
        >
          <Animated.View style={{ transform: [{ scale: tabScales[tab] }] }}>
            <Ionicons
              name={TAB_ICONS[tab] as any}
              size={20}
              color={TAB_COLORS[tab]}
            />
          </Animated.View>
          <Text
            style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewTab = () => {
    return (
      <View style={styles.tabContent}>
        {/* Stat Cards Grid - 2x2 */}
        <View style={styles.statGrid}>
          <View style={[styles.statCard, styles.statCardOrange]}>
            <View style={styles.statCardContent}>
              <Ionicons name="flame" size={20} color="#FFFFFF" />
              <Text style={styles.statCardLabel}>Current Streak</Text>
              <Text style={styles.statCardValue}>
                {profile?.current_streak || 0} Days
              </Text>
            </View>
          </View>
          <View style={[styles.statCard, styles.statCardBlue]}>
            <View style={styles.statCardContent}>
              <Ionicons name="fitness" size={20} color="#FFFFFF" />
              <Text style={styles.statCardLabel}>Total Workouts</Text>
              <Text style={styles.statCardValue}>
                {profile?.total_workouts || 0}
              </Text>
            </View>
          </View>
          <View style={[styles.statCard, styles.statCardPurple]}>
            <View style={styles.statCardContent}>
              <Ionicons name="barbell" size={20} color="#FFFFFF" />
              <Text style={styles.statCardLabel}>
                Total Unique{'\n'}Exercises
              </Text>
              <Text style={styles.statCardValue}>
                {profile?.unique_exercises || 0}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardYellow]}
            onPress={() => setPointsModalVisible(true)}
          >
            <View style={styles.statCardContent}>
              <Ionicons name="star" size={20} color="#FFFFFF" />
              <Text style={styles.statCardLabel}>Total Points</Text>
              <Text style={styles.statCardValue}>
                {profile?.total_points || 0}
              </Text>
            </View>
          </TouchableOpacity>
        </View>


        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          {loadingAchievements ? (
            <View style={styles.achievementsLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.achievementsLoadingText}>Loading achievements...</Text>
            </View>
          ) : (
            <>
              <View style={styles.achievementsGrid}>{renderAchievements()}</View>
              <Text style={styles.achievementsTapHint}>
                Tap to see requirements
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderAchievements = () => {
    const mappedAchievements = mapAchievements();
    return mappedAchievements.map(achievement => (
      <TouchableOpacity
        key={achievement.id}
        style={[
          styles.achievementCard,
          achievement.unlocked && styles.achievementCardUnlocked,
        ]}
        onPress={() => handleAchievementPress(achievement)}
      >
        <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
        <Text style={styles.achievementTitle}>{achievement.name}</Text>
      </TouchableOpacity>
    ));
  };

  const renderStatsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Stats</Text>
      <Text style={styles.sectionSubtext}>
        Track your progress and performance
      </Text>

      {/* Fitness Level Card */}
      <TouchableOpacity
        style={styles.levelCardContainer}
        onPress={() => setLevelModalVisible(true)}
      >
        <View style={styles.levelCard}>
          {/* Header with level name and badge */}
          <View style={styles.levelCardHeader}>
            <View style={styles.levelBadge}>
              <Ionicons name="trophy" size={20} color={Colors.white} />
            </View>
            <Text style={[styles.levelCardTitle, { color: levelInfo.color }]}>{levelInfo.levelName}</Text>
          </View>

          {/* Points display */}
          <View style={styles.levelPointsContainer}>
            <Text style={[styles.levelPointsValue, { color: levelInfo.color }]}>{profile?.total_points || 0}</Text>
            <Text style={styles.levelPointsLabel}>points earned</Text>
          </View>

          {/* Progress section */}
          {levelInfo.nextThreshold ? (
            <View style={styles.levelProgressSection}>
              <View style={styles.levelProgressBar}>
                <View
                  style={[
                    styles.levelProgressFill,
                    {
                      width: `${levelInfo.progressToNext}%`,
                      backgroundColor: levelInfo.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.levelProgressText}>
                {levelInfo.pointsToNext} to {levelInfo.nextLevelName}
              </Text>
            </View>
          ) : (
            <View style={styles.levelMaxSection}>
              <Ionicons name="star" size={16} color={Colors.yellow500} />
              <Text style={styles.levelMaxText}>Maximum level achieved!</Text>
            </View>
          )}

          {/* Tap hint */}
          <View style={styles.levelTapHint}>
            <Text style={styles.levelTapHintText}>Tap to view all levels</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.mutedForeground} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Body Metrics */}
      <View style={styles.section}>
        <View style={styles.bodyMetricsHeader}>
          <View style={styles.bodyMetricsTitleRow}>
            <Ionicons name="bar-chart" size={20} color={Colors.foreground} />
            <Text style={styles.bodyMetricsTitle}>Body Metrics</Text>
          </View>
          <TouchableOpacity onPress={() => setBodyMetricsModalVisible(true)}>
            <Ionicons
              name="create-outline"
              size={20}
              color={Colors.foreground}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.bodyMetricsGrid}>
          <View style={styles.bodyMetricItem}>
            <Text style={styles.bodyMetricValue}>
              {profile?.height_cm && profile?.weight_kg
                ? (
                    profile.weight_kg / Math.pow(profile.height_cm / 100, 2)
                  ).toFixed(1)
                : '--'}
            </Text>
            <Text style={styles.bodyMetricLabel}>BMI</Text>
          </View>
          <View style={styles.bodyMetricItem}>
            <Text style={styles.bodyMetricValue}>
              {profile?.height_cm || '--'}cm
            </Text>
            <Text style={styles.bodyMetricLabel}>Height</Text>
          </View>
          <View style={styles.bodyMetricItem}>
            <Text style={styles.bodyMetricValue}>
              {profile?.weight_kg || '--'}kg
            </Text>
            <Text style={styles.bodyMetricLabel}>Weight</Text>
          </View>
          <View style={styles.bodyMetricItem}>
            <Text style={styles.bodyMetricValue}>
              {profile?.height_cm && profile?.weight_kg
                ? Math.round(
                    profile.weight_kg * 24 + profile.height_cm * 10
                  ).toLocaleString()
                : '--'}
            </Text>
            <Text style={styles.bodyMetricLabel}>Daily Cal (est.)</Text>
          </View>
          <View style={styles.bodyMetricItem}>
            <Text style={styles.bodyMetricValue}>
              {profile?.body_fat_pct || '--'}%
            </Text>
            <Text style={styles.bodyMetricLabel}>Body Fat</Text>
          </View>
        </View>
      </View>

    </View>
  );

  const [photos, setPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [isCaptureFlowOpen, setIsCaptureFlowOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonSourcePhoto, setComparisonSourcePhoto] = useState<any>(null);
  const [comparisonComparisonPhoto, setComparisonComparisonPhoto] =
    useState<any>(null);
  const [isPhotoSourceModalOpen, setIsPhotoSourceModalOpen] = useState(false);
  const [isGalleryPhoto, setIsGalleryPhoto] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [isGoalPhysiqueModalOpen, setIsGoalPhysiqueModalOpen] = useState(false);
  const [isPhysiqueAnalysisModalOpen, setIsPhysiqueAnalysisModalOpen] = useState(false);
  const [selectedGoalPhysiqueId, setSelectedGoalPhysiqueId] = useState<string | null>(null);
  const [isGoalPhysiqueGalleryOpen, setIsGoalPhysiqueGalleryOpen] = useState(false);

  const handlePhotoDelete = async (photo: any) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from Supabase Storage
              const { error: storageError } = await supabase.storage
                .from('user-photos')
                .remove([photo.photo_path]);

              if (storageError) {
                console.error(
                  '[Profile] Storage deletion error:',
                  storageError
                );
                throw storageError;
              }

              // Delete from database
              const { error: dbError } = await supabase
                .from('progress_photos')
                .delete()
                .eq('id', photo.id);

              if (dbError) {
                console.error('[Profile] Database deletion error:', dbError);
                throw dbError;
              }

              // Refresh photos list and ensure loaded state
              fetchPhotos();
              setPhotosLoaded(true);

              Toast.show({
                type: 'success',
                text1: 'Photo deleted',
                text2: 'The photo has been removed from your timeline.',
                position: 'bottom',
                visibilityTime: 3000,
              });
            } catch (error: any) {
              console.error('[Profile] Photo deletion error:', error);
              Alert.alert('Error', 'Failed to delete photo. Please try again.');
            }
          },
        },
      ]
    );
  };

  const fetchPhotos = useCallback(async () => {
    if (!userId) return;
    setLoadingPhotos(true);
    try {
      console.log('[Profile] Fetching photos for user:', userId);
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Profile] Database error fetching photos:', error);
        throw error;
      }
      console.log('[Profile] Photos fetched:', data?.length || 0, 'photos');
      if (data && data.length > 0) {
        console.log('[Profile] First photo path:', data[0].photo_path);
      }
      setPhotos(data || []);
    } catch (error: any) {
      console.error('[Profile] Error fetching photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setLoadingPhotos(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (activeTab === 'photo' && !photosLoaded) {
      fetchPhotos();
      setPhotosLoaded(true);
    }
  }, [activeTab, fetchPhotos, photosLoaded]);

  const handlePhotoCaptured = (uri: string) => {
    setCapturedPhotoUri(uri);
    setIsCaptureFlowOpen(false);
    setIsUploadDialogOpen(true);
  };

  const handleGalleryPick = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Gallery access is required to select photos.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable cropping - let users upload as-is
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // Check file size (5MB limit)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            'File too large',
            'Please select an image smaller than 5MB.'
          );
          return;
        }

        setCapturedPhotoUri(asset.uri);
        setIsGalleryPhoto(true); // Mark this as a gallery photo
        setIsPhotoSourceModalOpen(false); // Close the source selection modal
        setIsUploadDialogOpen(true);
      }
    } catch (error) {
      console.error('[Profile] Gallery picker error:', error);
      Alert.alert('Error', 'Failed to select photo from gallery.');
    }
  };

  const handleUploadSuccess = () => {
    fetchPhotos();
    setCapturedPhotoUri(null);
    setIsGalleryPhoto(false);
    setPhotosLoaded(true);
  };

  const handleGoalPhysiquePress = () => {
    setIsGoalPhysiqueGalleryOpen(true);
  };

  const handleGoalPhysiqueUploadSuccess = (goalPhysiqueId: string) => {
    setSelectedGoalPhysiqueId(goalPhysiqueId);
    setIsGoalPhysiqueModalOpen(false);
    setIsPhysiqueAnalysisModalOpen(true);
  };

  const handleRecommendationsAccepted = (recommendations: any[]) => {
    console.log('[Profile] Recommendations accepted:', recommendations);
    // TODO: Implement recommendation acceptance logic
    // This will integrate with the training plan modification system
  };

  const renderPhotoTab = () => (
    <View style={styles.tabContent}>
      <PhotoJourneyTab
        photos={photos}
        loading={loadingPhotos}
        onPhotoPress={(photo: any, index: number) => {
          setLightboxInitialIndex(index);
          setIsLightboxOpen(true);
        }}
        onPhotoDelete={handlePhotoDelete}
        onComparisonOpen={() => setIsComparisonOpen(true)}
        onComparisonClose={() => setIsComparisonOpen(false)}
        onPhotosSelected={(selectedPhotos: any[]) => {
          setComparisonSourcePhoto(selectedPhotos[0]);
          setComparisonComparisonPhoto(selectedPhotos[1]);
          setIsComparisonOpen(true);
        }}
        onGoalPhysiquePress={handleGoalPhysiquePress}
      />
    </View>
  );

  const renderMediaTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Media</Text>
      <Text style={styles.sectionSubtext}>Your workout videos and photos</Text>

      <View style={styles.emptyState}>
        <Ionicons name="images" size={64} color={Colors.mutedForeground} />
        <Text style={styles.emptyStateText}>No media yet</Text>
        <Text style={styles.emptyStateSubtext}>Share your workout moments</Text>
      </View>
    </View>
  );

  const renderSocialTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.socialPlaceholder}>
        <Ionicons name="people" size={64} color={Colors.mutedForeground} />
        <Text style={styles.socialPlaceholderText}>
          Social features coming soon!
        </Text>
        <Text style={styles.socialPlaceholderSubtext}>
          Connect with friends and share your fitness journey
        </Text>
      </View>
    </View>
  );

  const renderSettingsTab = () => (
    <View style={styles.tabContent}>
      <PersonalInfoCard profile={profile} onUpdate={handleUpdateProfile} />

      <WorkoutPreferencesCard
        profile={profile}
        onUpdate={handleUpdateProfile}
      />

      <TrainingProfileCard profile={profile} onUpdate={handleUpdateProfile} />

      <ProgrammeTypeCard 
        profile={profile} 
        onUpdate={handleUpdateProfile}
        onRegenerateTPath={handleRegenerateTPath}
      />

      <MyGymsCardNew
        userId={userId!}
        gyms={gyms}
        activeGymId={profile?.active_gym_id}
        onRefresh={handleRefreshGyms}
        onManageGym={handleManageGym}
        supabase={supabase}
      />

      {/* AI Coach Usage */}
      <AICoachUsageCard
        dailyUses={0}
        maxDailyUses={2}
        onOpenCoach={() => {
          // TODO: Implement AI coach dialog
          Alert.alert('AI Coach', 'AI Coach feature coming soon!');
        }}
      />

      {/* Data Export */}
      <DataExportCard />

      {/* User Points Leaderboard */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Points Leaderboard</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={async () => {
            try {
              const { data, error } = await supabase
                .from('profiles')
                .select('display_name, email, total_points')
                .order('total_points', { ascending: false })
                .limit(50);

              if (error) throw error;

              const leaderboardText = data?.map((user, index) =>
                `${index + 1}. ${user.display_name || user.email} - ${user.total_points || 0} points`
              ).join('\n') || 'No users found';

              Alert.alert(
                'Points Leaderboard',
                leaderboardText,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error fetching leaderboard:', error);
              Alert.alert('Error', 'Failed to load leaderboard');
            }
          }}
        >
          <View style={styles.settingsButtonContent}>
            <Ionicons name="trophy" size={20} color={Colors.foreground} />
            <Text style={styles.settingsButtonText}>View Top Users</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.foreground}
          />
        </TouchableOpacity>
      </View>

      {/* Workout History Management */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Data Management</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => {
            router.push('/workout-history-management');
          }}
        >
          <View style={styles.settingsButtonContent}>
            <Ionicons name="time" size={20} color={Colors.foreground} />
            <Text style={styles.settingsButtonText}>Manage Workout History</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.foreground}
          />
        </TouchableOpacity>
      </View>

      {/* Security Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Security</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setPasswordModalVisible(true)}
        >
          <View style={styles.settingsButtonContent}>
            <Ionicons name="lock-closed" size={20} color={Colors.foreground} />
            <Text style={styles.settingsButtonText}>Change Password</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.foreground}
          />
        </TouchableOpacity>
      </View>

      {/* Security Actions */}
      <View style={[styles.settingsSection, { marginBottom: 0 }]}>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() => {
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                  await supabase.auth.signOut();
                },
              },
            ]);
          }}
        >
          <Ionicons name="log-out" size={20} color={Colors.foreground} />
          <Text style={styles.dangerButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabContentForTab = (tab: Tab) => {
    switch (tab) {
      case 'overview':
        return renderOverviewTab();
      case 'stats':
        return renderStatsTab();
      case 'photo':
        return renderPhotoTab();
      case 'media':
        return renderMediaTab();
      case 'social':
        return renderSocialTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Aurora Background with 3 animated blobs */}
      <BackgroundRoot />
      <View style={styles.screenContentWrapper}>
        <ScreenContainer scroll={false} edges={['left', 'right']}>
          <Animated.View
            style={[
              styles.headerWrapper,
              { transform: [{ translateY: headerTranslateY }] },
            ]}
          >
          <View style={styles.headerScrollView}>
            <View style={styles.headerContainer}>{renderHeader()}</View>
          </View>
        </Animated.View>

        {/* The tab bar needs to be a separate interactive layer */}
        <Animated.View
          style={[
            styles.tabBarInteractiveWrapper,
            { transform: [{ translateY: headerTranslateY }] },
          ]}
        >
          <View style={styles.tabsContainer}>{renderTabs()}</View>
        </Animated.View>

        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={0}
          onPageSelected={e => handlePageChange(e.nativeEvent.position)}
          scrollEnabled={!isComparisonOpen}
        >
          {TABS_ORDER.map(tab => (
            <View key={tab} style={styles.page}>
              <Animated.ScrollView
                ref={tab === 'overview' ? overviewScrollRef : undefined}
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { useNativeDriver: true }
                )}
              >
                {renderTabContentForTab(tab)}
              </Animated.ScrollView>
            </View>
          ))}
        </PagerView>
        </ScreenContainer>
      </View>

      {/* Camera FAB - only show on photo tab */}
      {activeTab === 'photo' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setIsPhotoSourceModalOpen(true)}
        >
          <Ionicons name="camera" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* Modals */}
      <PointsExplanationModal
        visible={pointsModalVisible}
        onClose={() => setPointsModalVisible(false)}
      />
      <EditNameModal
        visible={editNameModalVisible}
        onClose={() => setEditNameModalVisible(false)}
        currentName={profile?.display_name || ''}
        userId={userId || ''}
        onSuccess={newName => {
          setProfile({ ...profile, display_name: newName });
        }}
      />
      <BodyMetricsModal
        visible={bodyMetricsModalVisible}
        onClose={() => setBodyMetricsModalVisible(false)}
        userId={userId || ''}
        currentMetrics={{
          height_cm: profile?.height_cm,
          weight_kg: profile?.weight_kg,
          body_fat_pct: profile?.body_fat_pct,
        }}
        onSuccess={metrics => {
          setProfile({ ...profile, ...metrics });
        }}
      />
      <AvatarUploadModal
        visible={avatarModalVisible}
        onClose={() => setAvatarModalVisible(false)}
        userId={userId || ''}
        currentAvatarUrl={profile?.avatar_url}
        onSuccess={avatarUrl => {
          setProfile({ ...profile, avatar_url: avatarUrl });
        }}
      />
      <ChangePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />
      <WorkoutPreferencesModal
        visible={preferencesModalVisible}
        onClose={() => setPreferencesModalVisible(false)}
        userId={userId || ''}
        currentPreferences={{
          unit_system: profile?.unit_system,
          t_path_type: profile?.programme_type,
          default_session_length: profile?.default_session_length,
        }}
        onSuccess={prefs => {
          setProfile({ ...profile, ...prefs });
        }}
        onTPathTypeChange={newType => {
          console.log('[Profile] Programme type changed to:', newType);
        }}
      />
      <AchievementDetailModal
        visible={achievementModalVisible}
        onClose={() => setAchievementModalVisible(false)}
        achievement={selectedAchievement}
      />
      <ManageGymWorkoutsDialog
        visible={manageWorkoutsVisible}
        gymId={selectedGymId}
        gymName={selectedGymName}
        onClose={() => {
          setManageWorkoutsVisible(false);
          setSelectedGymId('');
          setSelectedGymName('');
        }}
      />
      <PhotoCaptureFlow
        visible={isCaptureFlowOpen}
        onClose={() => setIsCaptureFlowOpen(false)}
        onPhotoCaptured={handlePhotoCaptured}
      />
      <UploadPhotoDialog
        visible={isUploadDialogOpen}
        onClose={() => {
          setIsUploadDialogOpen(false);
          setCapturedPhotoUri(null);
          setIsGalleryPhoto(false);
        }}
        imageUri={capturedPhotoUri}
        onUploadSuccess={handleUploadSuccess}
        isFromGallery={isGalleryPhoto}
      />
      <PhotoComparisonDialog
        visible={isComparisonOpen}
        onClose={() => {
          setIsComparisonOpen(false);
          setComparisonSourcePhoto(null);
          setComparisonComparisonPhoto(null);
        }}
        sourcePhoto={comparisonSourcePhoto}
        comparisonPhoto={comparisonComparisonPhoto}
      />
      <PhotoSourceSelectionModal
        visible={isPhotoSourceModalOpen}
        onClose={() => setIsPhotoSourceModalOpen(false)}
        onTakePhoto={() => {
          setIsPhotoSourceModalOpen(false);
          setIsCaptureFlowOpen(true);
        }}
        onChooseFromGallery={handleGalleryPick}
      />
      <PhotoLightboxDialog
        visible={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        photos={photos}
        initialPhotoIndex={lightboxInitialIndex}
      />

      <GoalPhysiqueUploadModal
        visible={isGoalPhysiqueModalOpen}
        onClose={() => setIsGoalPhysiqueModalOpen(false)}
        onUploadSuccess={handleGoalPhysiqueUploadSuccess}
      />

      <PhysiqueAnalysisModal
        visible={isPhysiqueAnalysisModalOpen}
        onClose={() => setIsPhysiqueAnalysisModalOpen(false)}
        goalPhysiqueId={selectedGoalPhysiqueId || ''}
        onRecommendationsAccepted={handleRecommendationsAccepted}
      />

      <GoalPhysiqueGallery
        visible={isGoalPhysiqueGalleryOpen}
        onClose={() => setIsGoalPhysiqueGalleryOpen(false)}
        onSelectGoal={(goalPhysique) => {
          setSelectedGoalPhysiqueId(goalPhysique.id);
          setIsGoalPhysiqueGalleryOpen(false);
          setIsPhysiqueAnalysisModalOpen(true);
        }}
        onUploadNew={() => {
          setIsGoalPhysiqueGalleryOpen(false);
          setIsGoalPhysiqueModalOpen(true);
        }}
      />

      {/* Level Explanation Modal */}
      <Modal
        visible={levelModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLevelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.levelModal}>
            {/* Fixed Header */}
            <View style={styles.levelModalHeader}>
              <View style={styles.levelModalHeaderContent}>
                <Ionicons name="trophy" size={24} color={Colors.primary} />
                <Text style={styles.levelModalTitle}>Fitness Levels</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setLevelModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={styles.levelModalScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.levelModalScrollContent}
            >
              {/* Subtitle */}
              <Text style={styles.levelModalSubtitle}>
                Earn points through workouts to unlock higher fitness levels and track your progress
              </Text>

              {/* How to Earn Points Section */}
              <View style={styles.pointsInfoSection}>
                <View style={styles.pointsInfoHeader}>
                  <View style={styles.pointsIconContainer}>
                    <Ionicons name="bulb" size={20} color={Colors.white} />
                  </View>
                  <Text style={styles.pointsInfoTitle}>How to Earn Points</Text>
                </View>
                <View style={styles.pointsList}>
                  <View style={styles.pointsItem}>
                    <View style={[styles.pointsIconBg, { backgroundColor: Colors.success + '20' }]}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    </View>
                    <Text style={styles.pointsItemText}>Complete workouts: +5 points each</Text>
                  </View>
                  <View style={styles.pointsItem}>
                    <View style={[styles.pointsIconBg, { backgroundColor: Colors.success + '20' }]}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    </View>
                    <Text style={styles.pointsItemText}>Set volume personal records: +2 points per set PB</Text>
                  </View>
                  <View style={styles.pointsItem}>
                    <View style={[styles.pointsIconBg, { backgroundColor: Colors.success + '20' }]}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    </View>
                    <Text style={styles.pointsItemText}>Beat total workout volume: +5 points per session PB</Text>
                  </View>
                  <View style={styles.pointsItem}>
                    <View style={[styles.pointsIconBg, { backgroundColor: Colors.success + '20' }]}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    </View>
                    <Text style={styles.pointsItemText}>Complete full programme (PPL/ULUL): +10 points per week</Text>
                  </View>
                  <View style={styles.pointsItem}>
                    <View style={[styles.pointsIconBg, { backgroundColor: Colors.destructive + '20' }]}>
                      <Ionicons name="remove-circle" size={16} color={Colors.destructive} />
                    </View>
                    <Text style={styles.pointsItemText}>Incomplete workout week: -5 points</Text>
                  </View>
                </View>
              </View>

              {/* Levels Grid */}
              <View style={styles.levelsGrid}>
                {[
                  {
                    name: 'Rookie',
                    points: '0-49',
                    color: Colors.gray500,
                    bgColor: Colors.gray50,
                    description: 'Just getting started on your fitness journey',
                    icon: 'leaf',
                    gradient: ['#F3F4F6', '#E5E7EB']
                  },
                  {
                    name: 'Warrior',
                    points: '50-149',
                    color: Colors.blue500,
                    bgColor: Colors.blue50,
                    description: 'Building consistency and strength',
                    icon: 'shield',
                    gradient: ['#DBEAFE', '#BFDBFE']
                  },
                  {
                    name: 'Champion',
                    points: '150-299',
                    color: Colors.purple500,
                    bgColor: Colors.purple50,
                    description: 'Dedicated athlete with proven results',
                    icon: 'trophy',
                    gradient: ['#F3E8FF', '#E9D5FF']
                  },
                  {
                    name: 'Legend',
                    points: '300-499',
                    color: Colors.yellow500,
                    bgColor: Colors.yellow50,
                    description: 'Elite performer with exceptional dedication',
                    icon: 'star',
                    gradient: ['#FEF9C3', '#FEF08A']
                  },
                  {
                    name: 'Titan',
                    points: '500+',
                    color: Colors.red500,
                    bgColor: Colors.red50,
                    description: 'Ultimate fitness achievement - true dedication',
                    icon: 'flame',
                    gradient: ['#FEE2E2', '#FECACA']
                  }
                ].map((level, index) => (
                  <View key={level.name} style={[styles.levelItem, { backgroundColor: level.bgColor }]}>
                    <View style={styles.levelItemHeader}>
                      <View style={[styles.levelIconContainer, { backgroundColor: level.color + '20' }]}>
                        <Ionicons name={level.icon as any} size={28} color={level.color} />
                      </View>
                      <View style={styles.levelItemInfo}>
                        <Text style={[styles.levelItemName, { color: level.color }]}>{level.name}</Text>
                        <Text style={styles.levelItemPoints}>{level.points} points</Text>
                      </View>
                      {levelInfo.levelName === level.name && (
                        <View style={styles.currentLevelBadge}>
                          <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                          <Text style={styles.currentLevelText}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.levelItemDescription}>{level.description}</Text>
                    {levelInfo.levelName === level.name && (
                      <View style={styles.currentLevelIndicator}>
                        <View style={[styles.currentLevelDot, { backgroundColor: level.color }]} />
                        <Text style={[styles.currentLevelIndicatorText, { color: level.color }]}>
                          Your current level
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* No Footer - Removed as requested */}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    overflow: 'hidden', // Clip content so it doesn't render over the AppHeader on Android
  },
  screenContentWrapper: {
    flex: 1,
    overflow: 'hidden', // Clip content so profile header can't escape bounds
  },
  headerWrapper: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    zIndex: 100, // Above content but below AppHeader (which uses elevation: 100 on Android)
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5, // Lower elevation than AppHeader (100) to ensure it stays below on Android
    pointerEvents: 'auto', // Allow interactions
  },
  headerScrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    backgroundColor: 'transparent',
  },
  tabsContainer: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBarInteractiveWrapper: {
    position: 'absolute',
    top: HEADER_MAX_HEIGHT - TAB_BAR_HEIGHT + HEADER_OFFSET,
    left: 0,
    right: 0,
    zIndex: 1000, // Very high zIndex to ensure it's tappable
    pointerEvents: 'auto', // Explicitly allow interaction
  },
  pagerView: {
    flex: 1,
  },
  pagerViewInner: {
    flex: 1,
    marginTop: HEADER_MAX_HEIGHT + Spacing.md + HEADER_OFFSET, // Push content down below the entire header and interactive tab bar, plus a small gap
  },
  page: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg * 1.2, // Increased by 20% from 0
    paddingBottom: 0, // Remove bottom padding to eliminate the gap
  },
  tabContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 0, // Remove bottom padding to eliminate gap above footer
    marginTop: Spacing.lg * 10 + HEADER_OFFSET + 20, // Increased from *8 to *10 to move content back up
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...TextStyles.body,
    marginTop: Spacing.md,
    color: Colors.mutedForeground,
  },
  header: {
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: 'transparent',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  avatarFallback: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    ...TextStyles.h1,
    fontWeight: '700',
  },
  displayName: {
    ...TextStyles.h2,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  levelPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  levelPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelModal: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    margin: Spacing.lg,
    height: '90%', // Changed from maxHeight to height to ensure consistent sizing
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopLeftRadius: BorderRadius.xl, // Ensure all corners are rounded
    borderTopRightRadius: BorderRadius.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    flexDirection: 'column',
  },
  levelModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  levelModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  levelModalTitle: {
    ...TextStyles.h3,
    color: Colors.foreground,
    fontWeight: '700',
  },
  levelModalScrollView: {
    flex: 1,
  },
  levelModalScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  levelModalSubtitle: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
  },
  levelsGrid: {
    gap: Spacing.md,
  },
  levelItem: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  levelItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  levelIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  levelItemInfo: {
    flex: 1,
  },
  levelItemName: {
    ...TextStyles.h4,
    color: Colors.foreground,
    fontWeight: '600',
  },
  levelItemPoints: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  levelItemDescription: {
    ...TextStyles.body,
    color: Colors.foreground,
    lineHeight: 20,
  },
  currentLevelBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  currentLevelText: {
    ...TextStyles.caption,
    color: Colors.white,
    fontWeight: '600',
  },
  currentLevelIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  currentLevelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  currentLevelIndicatorText: {
    ...TextStyles.smallMedium,
    fontWeight: '600',
  },
  levelModalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.secondary,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  levelModalFooterText: {
    ...TextStyles.bodyMedium,
    color: Colors.foreground,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: Spacing.md,
  },
  footerStat: {
    alignItems: 'center',
    flex: 1,
  },
  footerStatValue: {
    ...TextStyles.h4,
    color: Colors.primary,
    fontWeight: '700',
  },
  footerStatLabel: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: 2,
  },
  levelText: {
    ...TextStyles.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 11,
  },
  memberSince: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
  },
  progressContainer: {
    width: '100%',
    marginTop: Spacing.sm,
    marginBottom: 0,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginTop: 4,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#FFFFFF',
    marginTop: 0,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.primary,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.foreground,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionSubtext: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.lg,
    justifyContent: 'space-between', // Force 2 cards per row
  },
  statCard: {
    width: '48%', // Two cards per row
    height: 120,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: Spacing.md, // Space between rows
  },
  statCardContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  statCardOrange: {
    backgroundColor: '#FB923C',
  },
  statCardBlue: {
    backgroundColor: '#60A5FA',
  },
  statCardPurple: {
    backgroundColor: '#A78BFA',
  },
  statCardYellow: {
    backgroundColor: '#FACC15',
  },
  statCardLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    marginTop: 4,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: Spacing.lg,
    backgroundColor: '#FFFFFF',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
    alignSelf: 'stretch',
  },
  bodyMetricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  bodyMetricsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bodyMetricsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.foreground,
  },
  bodyMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  bodyMetricItem: {
    width: (width - Spacing.lg * 4 - Spacing.lg) / 2,
    alignItems: 'flex-start',
  },
  bodyMetricValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 4,
  },
  bodyMetricLabel: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metricItem: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    padding: Spacing.md,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  achievementCard: {
    width: '31%', // Use percentage for 3 columns (31% * 3 = 93% + gaps)
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  achievementCardUnlocked: {
    borderColor: '#FACC15',
    backgroundColor: '#FFFBEB',
  },
  achievementEmoji: {
    fontSize: 32,
  },
  achievementTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
  },
  achievementsTapHint: {
    fontSize: 12,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  achievementsLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  achievementsLoadingText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: Spacing.md,
  },
  levelCardContainer: {
    marginBottom: Spacing.lg,
  },
  levelCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  levelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  levelBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  levelCardTitle: {
    ...TextStyles.h3,
    color: Colors.foreground,
    flex: 1,
  },
  levelPointsContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  levelPointsValue: {
    ...TextStyles.h1,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  levelPointsLabel: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  levelProgressSection: {
    marginBottom: Spacing.lg,
  },
  levelProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  levelProgressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  levelProgressText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  levelMaxSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  levelMaxText: {
    ...TextStyles.bodyMedium,
    color: Colors.success,
    fontWeight: '600',
  },
  levelTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  levelTapHintText: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  pointsInfoSection: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  pointsInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pointsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsInfoTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    flex: 1,
  },
  pointsIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsList: {
    gap: Spacing.sm,
  },
  pointsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pointsItemText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  socialPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl * 3,
  },
  socialPlaceholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  socialPlaceholderSubtext: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  settingsTabContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 30, // Section gap 28-32 (using 30 for middle value)
  },
  settingsSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
  },
  dangerTitle: {
    color: '#EF4444',
  },
  settingsCard: {
    padding: Spacing.md,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  settingsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingsButtonText: {
    ...TextStyles.body,
    color: Colors.gray900,
  },
  settingsInfoCard: {
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  settingsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  settingsInfoLabel: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  settingsInfoValue: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
  },
  settingsLabel: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginBottom: 4,
  },
  settingsValue: {
    fontSize: 16,
    color: Colors.foreground,
    fontWeight: '500',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
});
