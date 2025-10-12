/**
 * Profile Screen - Complete implementation with 6 tabs
 * Tabs: Overview | Stats | Photo | Media | Social | Settings
 * Reference: MOBILE_SPEC_05_PROFILE_FULL.md
 */

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../_contexts/auth-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { useLevelFromPoints } from '../../hooks/useLevelFromPoints';
import { supabase } from '../_lib/supabase';
import { ScreenContainer } from '../../components/layout/ScreenContainer';

const { width } = Dimensions.get('window');

type Tab = 'overview' | 'stats' | 'photo' | 'media' | 'social' | 'settings';

export default function ProfileScreen() {
  const { session, userId } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const levelInfo = useLevelFromPoints(profile?.total_points || 0);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('[Profile] Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
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

      <TouchableOpacity style={styles.changeAvatarButton}>
        <Ionicons name="camera" size={16} color={Colors.primary} />
        <Text style={styles.changeAvatarText}>Change Avatar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabBar}>
      {(['overview', 'stats', 'photo', 'media', 'social', 'settings'] as Tab[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.tabActive]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Overview</Text>
      <Text style={styles.sectionSubtext}>Your fitness journey at a glance</Text>
      
      {/* Stat Cards Grid */}
      <View style={styles.statGrid}>
        <View style={[styles.statCard, styles.statCardPurple]}>
          <Ionicons name="flame" size={24} color="#A855F7" />
          <Text style={styles.statValue}>{profile?.current_streak || 0}</Text>
          <Text style={styles.statLabel}>Current Streak</Text>
        </View>
        <View style={[styles.statCard, styles.statCardBlue]}>
          <Ionicons name="fitness" size={24} color="#3B82F6" />
          <Text style={styles.statValue}>{profile?.total_workouts || 0}</Text>
          <Text style={styles.statLabel}>Total Workouts</Text>
        </View>
        <View style={[styles.statCard, styles.statCardCyan]}>
          <Ionicons name="barbell" size={24} color="#06B6D4" />
          <Text style={styles.statValue}>{profile?.unique_exercises || 0}</Text>
          <Text style={styles.statLabel}>Unique Exercises</Text>
        </View>
        <View style={[styles.statCard, styles.statCardYellow]}>
          <Ionicons name="trophy" size={24} color="#EAB308" />
          <Text style={styles.statValue}>{profile?.total_points || 0}</Text>
          <Text style={styles.statLabel}>Total Points</Text>
        </View>
      </View>

      {/* Body Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Body Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Height</Text>
            <Text style={styles.metricValue}>{profile?.height_cm || '--'} cm</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Weight</Text>
            <Text style={styles.metricValue}>{profile?.weight_kg || '--'} kg</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Body Fat</Text>
            <Text style={styles.metricValue}>{profile?.body_fat_pct || '--'}%</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>BMI</Text>
            <Text style={styles.metricValue}>
              {profile?.height_cm && profile?.weight_kg
                ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)
                : '--'}
            </Text>
          </View>
        </View>
      </View>

      {/* Achievements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <Text style={styles.sectionSubtext}>Tap a badge to see requirements</Text>
        <View style={styles.achievementsGrid}>
          {/* Placeholder achievements */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.achievementBadge}>
              <Ionicons name="medal" size={32} color={Colors.mutedForeground} />
            </View>
          ))}
        </View>
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
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Settings</Text>
      
      {/* Personal Info Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Personal Information</Text>
        <View style={styles.settingsCard}>
          <Text style={styles.settingsLabel}>Display Name</Text>
          <Text style={styles.settingsValue}>{profile?.display_name || 'Not set'}</Text>
        </View>
        <View style={styles.settingsCard}>
          <Text style={styles.settingsLabel}>Email</Text>
          <Text style={styles.settingsValue}>{session?.user?.email}</Text>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.settingsSection}>
        <Text style={[styles.settingsSectionTitle, styles.dangerTitle]}>Danger Zone</Text>
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
    <ScreenContainer>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderTabs()}
        {renderTabContent()}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  changeAvatarText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
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
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statCardPurple: {
    backgroundColor: '#F3E8FF',
  },
  statCardBlue: {
    backgroundColor: '#DBEAFE',
  },
  statCardCyan: {
    backgroundColor: '#CFFAFE',
  },
  statCardYellow: {
    backgroundColor: '#FEF9C3',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.foreground,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
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
    gap: Spacing.md,
  },
  achievementBadge: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
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
  settingsSection: {
    marginBottom: Spacing.xl,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing.md,
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
