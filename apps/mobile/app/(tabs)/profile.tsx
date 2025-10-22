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
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../_contexts/auth-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
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
import { DataExportCard } from '../../components/profile/DataExportCard';
import { ManageGymWorkoutsDialog } from '../../components/profile/ManageGymWorkoutsDialog';
import { PhotoJourneyTab } from '../../components/profile/PhotoJourneyTab';
import { PhotoCaptureFlow } from '../../components/profile/PhotoCaptureFlow';
import { UploadPhotoDialog } from '../../components/profile/UploadPhotoDialog';
import { PhotoComparisonDialog } from '../../components/profile/PhotoComparisonDialog';
import { PhotoSourceSelectionModal } from '../../components/profile/PhotoSourceSelectionModal';

const { width } = Dimensions.get('window');

const HEADER_MAX_HEIGHT = 270; // Increased to accommodate full header and tabs
const HEADER_MIN_HEIGHT = 0;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
const TAB_BAR_HEIGHT = 56; // Approximate height of the tab bar
const HEADER_OFFSET = 60; // Additional offset to move nav bar below page header

type Tab = 'overview' | 'stats' | 'photo' | 'media' | 'social' | 'settings';

const PROFILE_TAB_KEY = 'profile_active_tab';

const TABS_ORDER: Tab[] = ['overview', 'stats', 'photo', 'media', 'social', 'settings'];

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
  const router = useRouter();
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
  const [manageWorkoutsVisible, setManageWorkoutsVisible] = useState(false);
  const [selectedGymId, setSelectedGymId] = useState<string>('');
  const [selectedGymName, setSelectedGymName] = useState<string>('');

  // Animation values for tab icons
  const tabScales = useRef<Record<Tab, Animated.Value>>(
    TABS_ORDER.reduce((acc, tab) => ({
      ...acc,
      [tab]: new Animated.Value(tab === 'overview' ? 1.1 : 1),
    }), {} as Record<Tab, Animated.Value>)
  ).current;

  // Scroll animation for header
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  // Content should move up with the header to stay attached to nav bar
  const contentTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  // PagerView ref for programmatic navigation
  const pagerRef = useRef<PagerView>(null);

  const levelInfo = useLevelFromPoints(profile?.total_points || 0);

  useEffect(() => {
    loadProfile();
    loadSavedTab();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Load profile data
      const profileRes = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profileRes.error) throw profileRes.error;

      // Load gyms data
      const gymsRes = await supabase.from('gyms').select('*').eq('user_id', userId).order('created_at', { ascending: true });

      // Load workout statistics
      const [totalWorkoutsRes, uniqueExercisesRes, workoutDatesRes] = await Promise.all([
        // Total workouts: count completed workout_sessions
        supabase
          .from('workout_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('completed_at', 'is', null),

        // Total unique exercises: count distinct exercise_ids from completed sessions
        supabase
          .from('set_logs')
          .select(`
            exercise_id,
            workout_sessions!inner (
              user_id,
              completed_at
            )
          `)
          .eq('workout_sessions.user_id', userId)
          .not('workout_sessions.completed_at', 'is', null),

        // Get workout dates for streak calculation
        supabase
          .from('workout_sessions')
          .select('completed_at')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(30) // Get last 30 workouts to calculate streak
      ]);

      if (totalWorkoutsRes.error) throw totalWorkoutsRes.error;
      if (uniqueExercisesRes.error) throw uniqueExercisesRes.error;
      if (workoutDatesRes.error) throw workoutDatesRes.error;

      // Get unique exercise count
      const uniqueExerciseIds = new Set(uniqueExercisesRes.data?.map(log => log.exercise_id) || []);
      const uniqueExercisesCount = uniqueExerciseIds.size;

      // Calculate current streak
      const workoutDates = workoutDatesRes.data?.map(session =>
        new Date(session.completed_at).toDateString()
      ) || [];

      let currentStreak = 0;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

      // Check if worked out today or yesterday (to handle timezone issues)
      const hasRecentWorkout = workoutDates.includes(today) || workoutDates.includes(yesterday);

      if (hasRecentWorkout) {
        // Calculate consecutive days
        const uniqueDates = [...new Set(workoutDates)].sort((a, b) =>
          new Date(b).getTime() - new Date(a).getTime()
        );

        for (let i = 0; i < uniqueDates.length; i++) {
          const expectedDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toDateString();
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

      setProfile(profileData);

      if (gymsRes.data) {
        setGyms(gymsRes.data);
      }
    } catch (error) {
      console.error('[Profile] Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updates: any) => {
    if (!userId) return;

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

    // Update local state optimistically
    setProfile({ ...profile, ...updates });
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
      if (saved && ['overview', 'stats', 'photo', 'media', 'social', 'settings'].includes(saved)) {
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
    const name = profile?.display_name || session?.user?.user_metadata?.full_name || 
                 session?.user?.email?.split('@')[0] || 'A';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getMemberSince = () => {
    if (!profile?.created_at) return 'New Member';
    const date = new Date(profile.created_at);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const renderAvatar = () => {
    if (profile?.avatar_url) {
      return (
        <Image 
          source={{ uri: profile.avatar_url }} 
          style={styles.avatar}
        />
      );
    }
    return (
      <View style={[styles.avatar, styles.avatarFallback]}>
        <Text style={styles.avatarText}>{getInitials()}</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {renderAvatar()}
      
      <Text style={styles.displayName}>
        {profile?.display_name || session?.user?.user_metadata?.full_name || 'Athlete'}
      </Text>

      <View style={styles.metaRow}>
        <View style={[styles.levelPill, { backgroundColor: levelInfo.backgroundColor }]}>
          <Text style={[styles.levelText, { color: levelInfo.color }]}>
            {levelInfo.levelName}
          </Text>
        </View>
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
                  backgroundColor: levelInfo.color 
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(levelInfo.progressToNext)}% to {levelInfo.nextThreshold} pts
          </Text>
        </View>
      )}
    </View>
  );


  const achievements = [
    { id: 1, emoji: '🏃', title: 'First Workout', description: 'Complete your first workout.', progress: 1, total: 1, unlocked: true },
    { id: 2, emoji: '🤖', title: 'AI Apprentice', description: 'Use AI coaching during a workout.', progress: 0, total: 1, unlocked: false },
    { id: 3, emoji: '🔥', title: '10 Day Streak', description: 'Log an activity for 10 consecutive days.', progress: profile?.current_streak || 0, total: 10, unlocked: (profile?.current_streak || 0) >= 10 },
    { id: 4, emoji: '👑', title: 'Consistency King', description: 'Log an activity for 30 consecutive days.', progress: profile?.current_streak || 0, total: 30, unlocked: (profile?.current_streak || 0) >= 30 },
    { id: 5, emoji: '💪', title: '25 Workouts', description: 'Complete 25 total workouts.', progress: profile?.total_workouts || 0, total: 25, unlocked: (profile?.total_workouts || 0) >= 25 },
    { id: 6, emoji: '🏆', title: '50 Workouts', description: 'Complete 50 total workouts.', progress: profile?.total_workouts || 0, total: 50, unlocked: (profile?.total_workouts || 0) >= 50 },
    { id: 7, emoji: '💯', title: 'Century Club', description: 'Complete 100 total workouts.', progress: profile?.total_workouts || 0, total: 100, unlocked: (profile?.total_workouts || 0) >= 100 },
    { id: 8, emoji: '📅', title: 'Perfect Week', description: 'Complete 7 workouts in a single week.', progress: 0, total: 7, unlocked: false },
    { id: 9, emoji: '💥', title: 'Beast Mode', description: 'Set 10 personal records in a single month.', progress: 0, total: 10, unlocked: false },
    { id: 10, emoji: '🎉', title: 'Weekend Warrior', description: 'Complete 10 weekend workouts.', progress: 0, total: 10, unlocked: false },
    { id: 11, emoji: '🌅', title: 'Early Bird', description: 'Complete 10 workouts before 7 AM.', progress: 0, total: 10, unlocked: false },
    { id: 12, emoji: '🏋️', title: 'Volume Master', description: 'Lift 100,000 kg total volume.', progress: 0, total: 100000, unlocked: false },
  ];

  const handleAchievementPress = (achievement: typeof achievements[0]) => {
    setSelectedAchievement(achievement);
    setAchievementModalVisible(true);
  };


  const renderTabs = () => (
    <View style={styles.tabBar}>
      {TABS_ORDER.map((tab) => (
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
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
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
              <Text style={styles.statCardValue}>{profile?.current_streak || 0} Days</Text>
            </View>
          </View>
          <View style={[styles.statCard, styles.statCardBlue]}>
            <View style={styles.statCardContent}>
              <Ionicons name="fitness" size={20} color="#FFFFFF" />
              <Text style={styles.statCardLabel}>Total Workouts</Text>
              <Text style={styles.statCardValue}>{profile?.total_workouts || 0}</Text>
            </View>
          </View>
          <View style={[styles.statCard, styles.statCardPurple]}>
            <View style={styles.statCardContent}>
              <Ionicons name="barbell" size={20} color="#FFFFFF" />
              <Text style={styles.statCardLabel}>Total Unique{'\n'}Exercises</Text>
              <Text style={styles.statCardValue}>{profile?.unique_exercises || 0}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardYellow]}
            onPress={() => setPointsModalVisible(true)}
          >
            <View style={styles.statCardContent}>
              <Ionicons name="star" size={20} color="#FFFFFF" />
              <Text style={styles.statCardLabel}>Total Points</Text>
              <Text style={styles.statCardValue}>{profile?.total_points || 0}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Body Metrics */}
        <View style={styles.section}>
          <View style={styles.bodyMetricsHeader}>
            <View style={styles.bodyMetricsTitleRow}>
              <Ionicons name="bar-chart" size={20} color={Colors.foreground} />
              <Text style={styles.bodyMetricsTitle}>Body Metrics</Text>
            </View>
            <TouchableOpacity onPress={() => setBodyMetricsModalVisible(true)}>
              <Ionicons name="create-outline" size={20} color={Colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.bodyMetricsGrid}>
            <View style={styles.bodyMetricItem}>
              <Text style={styles.bodyMetricValue}>
                {profile?.height_cm && profile?.weight_kg
                  ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)
                  : '--'}
              </Text>
              <Text style={styles.bodyMetricLabel}>BMI</Text>
            </View>
            <View style={styles.bodyMetricItem}>
              <Text style={styles.bodyMetricValue}>{profile?.height_cm || '--'}cm</Text>
              <Text style={styles.bodyMetricLabel}>Height</Text>
            </View>
            <View style={styles.bodyMetricItem}>
              <Text style={styles.bodyMetricValue}>{profile?.weight_kg || '--'}kg</Text>
              <Text style={styles.bodyMetricLabel}>Weight</Text>
            </View>
            <View style={styles.bodyMetricItem}>
              <Text style={styles.bodyMetricValue}>
                {profile?.height_cm && profile?.weight_kg
                  ? Math.round((profile.weight_kg * 24) + (profile.height_cm * 10)).toLocaleString()
                  : '--'}
              </Text>
              <Text style={styles.bodyMetricLabel}>Daily Cal (est.)</Text>
            </View>
            <View style={styles.bodyMetricItem}>
              <Text style={styles.bodyMetricValue}>{profile?.body_fat_pct || '--'}%</Text>
              <Text style={styles.bodyMetricLabel}>Body Fat</Text>
            </View>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {renderAchievements()}
          </View>
          <Text style={styles.achievementsTapHint}>Tap to see requirements</Text>
        </View>
      </View>
    );
  };

  const renderAchievements = () => {
    return achievements.map((achievement) => (
      <TouchableOpacity
        key={achievement.id}
        style={[
          styles.achievementCard,
          achievement.unlocked && styles.achievementCardUnlocked
        ]}
        onPress={() => handleAchievementPress(achievement)}
      >
        <Text style={styles.achievementEmoji}>{achievement.emoji}</Text>
        <Text style={styles.achievementTitle}>{achievement.title}</Text>
      </TouchableOpacity>
    ));
  };


  const renderStatsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Stats</Text>
      <Text style={styles.sectionSubtext}>Track your progress and performance</Text>
      
      {/* Fitness Level Card */}
      <View style={[styles.levelCard, { backgroundColor: levelInfo.backgroundColor }]}>
        <Ionicons name="trophy" size={48} color={levelInfo.color} />
        <Text style={[styles.levelCardTitle, { color: levelInfo.color }]}>
          {levelInfo.levelName}
        </Text>
        {levelInfo.nextThreshold && (
          <>
            <View style={styles.levelProgressBar}>
              <View 
                style={[
                  styles.levelProgressFill, 
                  { 
                    width: `${levelInfo.progressToNext}%`,
                    backgroundColor: levelInfo.color 
                  }
                ]} 
              />
            </View>
            <Text style={styles.levelProgressText}>
              {Math.round(levelInfo.progressToNext)}% to next level
            </Text>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>Performance Metrics</Text>
      <Text style={styles.sectionSubtext}>Coming soon: Momentum charts and weekly progress</Text>
    </View>
  );

  const [photos, setPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [isCaptureFlowOpen, setIsCaptureFlowOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [selectedPhotosForComparison, setSelectedPhotosForComparison] = useState<any[]>([]);
  const [comparisonSourcePhoto, setComparisonSourcePhoto] = useState<any>(null);
  const [comparisonComparisonPhoto, setComparisonComparisonPhoto] = useState<any>(null);
  const [isPhotoSourceModalOpen, setIsPhotoSourceModalOpen] = useState(false);
  const [isGalleryPhoto, setIsGalleryPhoto] = useState(false);

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
                console.error('[Profile] Storage deletion error:', storageError);
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

              // Refresh photos list
              fetchPhotos();

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
    if (activeTab === 'photo') {
      fetchPhotos();
    }
  }, [activeTab, fetchPhotos]);

  const handlePhotoCaptured = (uri: string) => {
    setCapturedPhotoUri(uri);
    setIsCaptureFlowOpen(false);
    setIsUploadDialogOpen(true);
  };

  const handleGalleryPick = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery access is required to select photos.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square crop for progress photos
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // Check file size (5MB limit)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('File too large', 'Please select an image smaller than 5MB.');
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
  };

  const renderPhotoTab = () => (
    <View style={styles.tabContent}>
      <PhotoJourneyTab
        photos={photos}
        loading={loadingPhotos}
        onPhotoPress={(photo: any) => {
          Toast.show({
            type: 'info',
            text1: 'Photo Details',
            text2: `Taken on ${new Date(photo.created_at).toLocaleDateString()}`,
            position: 'bottom',
            visibilityTime: 3000,
          });
        }}
        onPhotoDelete={handlePhotoDelete}
        onComparisonOpen={() => setIsComparisonOpen(true)}
        onComparisonClose={() => setIsComparisonOpen(false)}
        onPhotosSelected={(selectedPhotos: any[]) => {
          setSelectedPhotosForComparison(selectedPhotos);
          setComparisonSourcePhoto(selectedPhotos[0]);
          setComparisonComparisonPhoto(selectedPhotos[1]);
          setIsComparisonOpen(true);
        }}
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
        <Text style={styles.emptyStateSubtext}>
          Share your workout moments
        </Text>
      </View>
    </View>
  );

  const renderSocialTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.socialPlaceholder}>
        <Ionicons name="people" size={64} color={Colors.mutedForeground} />
        <Text style={styles.socialPlaceholderText}>Social features coming soon!</Text>
        <Text style={styles.socialPlaceholderSubtext}>
          Connect with friends and share your fitness journey
        </Text>
      </View>
    </View>
  );

  const renderSettingsTab = () => (
    <View style={styles.tabContent}>
      <PersonalInfoCard
        profile={profile}
        onUpdate={handleUpdateProfile}
      />

      <WorkoutPreferencesCard
        profile={profile}
        onUpdate={handleUpdateProfile}
      />

      <ProgrammeTypeCard
        profile={profile}
        onUpdate={handleUpdateProfile}
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
          <Ionicons name="chevron-forward" size={20} color={Colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Security Actions */}
      <View style={styles.settingsSection}>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: async () => {
                    await supabase.auth.signOut();
                  },
                },
              ]
            );
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
      <ScreenContainer scroll={false}>
        <Animated.View style={[styles.headerWrapper, { transform: [{ translateY: headerTranslateY }] }]}>
          <View style={styles.headerContainer}>
            {renderHeader()}
          </View>
        </Animated.View>

        {/* The tab bar needs to be a separate interactive layer */}
        <Animated.View style={[styles.tabBarInteractiveWrapper, { transform: [{ translateY: headerTranslateY }] }]}>
          <View style={styles.tabsContainer}>
            {renderTabs()}
          </View>
        </Animated.View>

        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={0}
          onPageSelected={(e) => handlePageChange(e.nativeEvent.position)}
          scrollEnabled={!isComparisonOpen}
        >
          {TABS_ORDER.map((tab) => (
            <View key={tab} style={styles.page}>
              <Animated.ScrollView
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
        onSuccess={(newName) => {
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
        onSuccess={(metrics) => {
          setProfile({ ...profile, ...metrics });
        }}
      />
      <AvatarUploadModal
        visible={avatarModalVisible}
        onClose={() => setAvatarModalVisible(false)}
        userId={userId || ''}
        currentAvatarUrl={profile?.avatar_url}
        onSuccess={(avatarUrl) => {
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
          t_path_type: profile?.t_path_type,
          default_session_length: profile?.default_session_length,
        }}
        onSuccess={(prefs) => {
          setProfile({ ...profile, ...prefs });
        }}
        onTPathTypeChange={(newType) => {
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
          setSelectedPhotosForComparison([]);
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
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  headerWrapper: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    zIndex: -1, // Behind everything
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    pointerEvents: 'none', // Prevents interaction with the header background
  },
  headerScrollView: {
    flex: 1,
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
    paddingBottom: Spacing.xl * 2,
  },
  tabContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    marginTop: Spacing.lg * 9 + HEADER_OFFSET + 20, // Try *9
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
    fontSize: 36,
    fontWeight: '700',
  },
  displayName: {
    fontSize: 28,
    fontWeight: '600',
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  memberSince: {
    fontSize: 14,
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
    fontSize: 12,
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
  levelCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  levelCardTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  levelProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  levelProgressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  levelProgressText: {
    fontSize: 14,
    fontWeight: '600',
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
