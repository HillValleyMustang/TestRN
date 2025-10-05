import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "./_contexts/auth-context";
import { useData, type UserAchievement } from "./_contexts/data-context";
import {
  ACHIEVEMENTS,
  getAchievementById,
  type AchievementCategory,
} from "@data/achievements";

export default function AchievementsScreen() {
  const { userId } = useAuth();
  const { getUserAchievements, checkAndUnlockAchievements } = useData();
  const [unlockedAchievements, setUnlockedAchievements] = useState<
    UserAchievement[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<AchievementCategory | "all">("all");

  const loadAchievements = useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      await checkAndUnlockAchievements(userId);
      const unlocked = await getUserAchievements(userId);
      setUnlockedAchievements(unlocked);
    } catch (error) {
      console.error("Error loading achievements:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, getUserAchievements, checkAndUnlockAchievements]);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAchievements();
  };

  const isUnlocked = (achievementId: string): boolean => {
    return unlockedAchievements.some((a) => a.achievement_id === achievementId);
  };

  const getUnlockDate = (achievementId: string): string | null => {
    const achievement = unlockedAchievements.find(
      (a) => a.achievement_id === achievementId,
    );
    return achievement
      ? new Date(achievement.unlocked_at).toLocaleDateString()
      : null;
  };

  const getTierColor = (tier: string): string => {
    const colors: Record<string, string> = {
      bronze: "#CD7F32",
      silver: "#C0C0C0",
      gold: "#FFD700",
      platinum: "#E5E4E2",
    };
    return colors[tier] || "#999";
  };

  const filteredAchievements = ACHIEVEMENTS.filter(
    (a) => filter === "all" || a.category === filter,
  );

  const categories: Array<{ id: AchievementCategory | "all"; label: string }> =
    [
      { id: "all", label: "All" },
      { id: "workouts", label: "Workouts" },
      { id: "strength", label: "Strength" },
      { id: "consistency", label: "Consistency" },
      { id: "volume", label: "Volume" },
    ];

  const renderAchievement = (achievement: (typeof ACHIEVEMENTS)[0]) => {
    const unlocked = isUnlocked(achievement.id);
    const unlockDate = getUnlockDate(achievement.id);
    const tierColor = getTierColor(achievement.tier);

    return (
      <View
        key={achievement.id}
        style={[
          styles.achievementCard,
          unlocked ? styles.achievementUnlocked : styles.achievementLocked,
        ]}
      >
        <View style={styles.achievementHeader}>
          <Text
            style={[styles.achievementIcon, !unlocked && styles.lockedIcon]}
          >
            {achievement.icon}
          </Text>
          <View style={styles.achievementInfo}>
            <Text
              style={[styles.achievementName, !unlocked && styles.lockedText]}
            >
              {achievement.name}
            </Text>
            <Text style={styles.achievementTier} style={{ color: tierColor }}>
              {achievement.tier.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.achievementDescription,
            !unlocked && styles.lockedText,
          ]}
        >
          {achievement.description}
        </Text>

        {unlocked && unlockDate && (
          <Text style={styles.unlockDate}>Unlocked {unlockDate}</Text>
        )}

        {!unlocked && (
          <View style={styles.requirementContainer}>
            <Text style={styles.requirementText}>
              {achievement.requirement.type === "workout_count" &&
                `Complete ${achievement.requirement.value} workouts`}
              {achievement.requirement.type === "streak_days" &&
                `Maintain ${achievement.requirement.value}-day streak`}
              {achievement.requirement.type === "total_volume" &&
                `Lift ${achievement.requirement.value.toLocaleString()} kg total`}
              {achievement.requirement.type === "max_weight" &&
                achievement.requirement.exercise_id &&
                `Lift ${achievement.requirement.value} kg max on ${achievement.requirement.exercise_id.replace(/_/g, " ")}`}
              {achievement.requirement.type === "weight_lost" &&
                `Lose ${achievement.requirement.value} kg`}
              {achievement.requirement.type === "weight_gained" &&
                `Gain ${achievement.requirement.value} kg`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Achievements</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      </View>
    );
  }

  const totalAchievements = ACHIEVEMENTS.length;
  const unlockedCount = unlockedAchievements.length;
  const progress = ((unlockedCount / totalAchievements) * 100).toFixed(0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Achievements</Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {unlockedCount} / {totalAchievements} Unlocked ({progress}%)
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.filterButton,
              filter === cat.id && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(cat.id)}
          >
            <Text
              style={[
                styles.filterText,
                filter === cat.id && styles.filterTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredAchievements.map(renderAchievement)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 60,
    backgroundColor: "#111",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  backButton: {
    color: "#60a5fa",
    fontSize: 16,
    marginRight: 16,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  statsContainer: {
    padding: 16,
    backgroundColor: "#111",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  statsText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#333",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#60a5fa",
  },
  filterScroll: {
    backgroundColor: "#111",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#60a5fa",
  },
  filterText: {
    color: "#999",
    fontSize: 14,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#fff",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  achievementCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  achievementUnlocked: {
    backgroundColor: "#1a2942",
    borderColor: "#60a5fa",
  },
  achievementLocked: {
    backgroundColor: "#1a1a1a",
    borderColor: "#333",
    opacity: 0.6,
  },
  achievementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  achievementIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  lockedIcon: {
    opacity: 0.3,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  achievementTier: {
    fontSize: 12,
    fontWeight: "600",
  },
  achievementDescription: {
    color: "#999",
    fontSize: 14,
    marginBottom: 8,
  },
  lockedText: {
    opacity: 0.5,
  },
  unlockDate: {
    color: "#4ade80",
    fontSize: 12,
    fontWeight: "600",
  },
  requirementContainer: {
    backgroundColor: "#0a0a0a",
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  requirementText: {
    color: "#999",
    fontSize: 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#999",
    fontSize: 16,
  },
});
