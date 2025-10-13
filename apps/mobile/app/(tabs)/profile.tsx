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
  PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../_contexts/auth-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { useLevelFromPoints } from '../../hooks/useLevelFromPoints';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
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
import { MyGymsCard } from '../../components/profile/MyGymsCard';

const { width } = Dimensions.get('window');

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

  // Animation values for tab icons
  const tabScales = useRef<Record<Tab, Animated.Value>>(
    TABS_ORDER.reduce((acc, tab) => ({
      ...acc,
      [tab]: new Animated.Value(tab === 'overview' ? 1.1 : 1),
    }), {} as Record<Tab, Animated.Value>)
  ).current;

  // Swipe gesture handler for tab navigation
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentIndex = TABS_ORDER.indexOf(activeTab);
        
        // Swipe right -> previous tab
        if (gestureState.dx > 50 && currentIndex > 0) {
          handleTabChange(TABS_ORDER[currentIndex - 1]);
        }
        // Swipe left -> next tab
        else if (gestureState.dx < -50 && currentIndex < TABS_ORDER.length - 1) {
          handleTabChange(TABS_ORDER[currentIndex + 1]);
        }
      },
    })
  ).current;

  const levelInfo = useLevelFromPoints(profile?.total_points || 0);

  useEffect(() => {
    loadProfile();
    loadSavedTab();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const [profileRes, gymsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('gyms').select('*').eq('user_id', userId).order('created_at', { ascending: true })
      ]);

      if (profileRes.error) throw profileRes.error;
      setProfile(profileRes.data);
      
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
      .update(updates)
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
    try {
      await AsyncStorage.setItem(PROFILE_TAB_KEY, tab);
    } catch (error) {
      console.error('[Profile] Error saving tab:', error);
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

  const renderOverviewTab = () => (
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
            <Ionicons name="create-outline" size={20} color={Colors.blue600} />
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

  const renderPhotoTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Progress Journey</Text>
      <Text style={styles.sectionSubtext}>Track your transformation visually</Text>
      
      <View style={styles.emptyState}>
        <Ionicons name="camera" size={64} color={Colors.mutedForeground} />
        <Text style={styles.emptyStateText}>No progress photos yet</Text>
        <Text style={styles.emptyStateSubtext}>
          Start your progress journey by capturing your first photo
        </Text>
      </View>
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
    <View style={styles.settingsTabContainer}>
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
      
      <MyGymsCard
        userId={userId!}
        gyms={gyms}
        activeGymId={profile?.active_gym_id}
        onRefresh={handleRefreshGyms}
        supabase={supabase}
      />

      {/* Security Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Security</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setPasswordModalVisible(true)}
        >
          <View style={styles.settingsButtonContent}>
            <Ionicons name="lock-closed" size={20} color={Colors.gray700} />
            <Text style={styles.settingsButtonText}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
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
          <Ionicons name="log-out" size={20} color="#EF4444" />
          <Text style={styles.dangerButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
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
    <ScreenContainer scroll={false}>
      <ScrollView 
        {...panResponder.panHandlers}
        style={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mainScrollContent}
      >
        {renderHeader()}
        {renderTabs()}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>
      </ScrollView>

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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: Spacing.xl,
  },
  tabContent: {
    paddingHorizontal: Spacing.lg,
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    marginBottom: Spacing.sm,
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
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  tabContent: {
    padding: Spacing.lg,
    backgroundColor: '#F3F4F6',
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
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    height: 120,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    width: (width - Spacing.lg * 4 - Spacing.sm * 2) / 3,
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
});
