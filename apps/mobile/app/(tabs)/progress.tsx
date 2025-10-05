import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { useAuth } from "../_contexts/auth-context";
import { useData } from "../_contexts/data-context";
import { exerciseList } from "@data/exercises";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 40;
const CHART_HEIGHT = 200;

export default function ProgressScreen() {
  const { userId } = useAuth();
  const {
    getWorkoutStats,
    getWorkoutFrequency,
    getVolumeHistory,
    getPRHistory,
  } = useData();
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalVolume: 0,
    averageVolume: 0,
    currentStreak: 0,
    longestStreak: 0,
  });
  const [frequencyData, setFrequencyData] = useState<
    Array<{ date: string; count: number }>
  >([]);
  const [volumeData, setVolumeData] = useState<
    Array<{ date: string; volume: number }>
  >([]);
  const [prData, setPrData] = useState<Array<{ date: string; weight: number }>>(
    [],
  );
  const [selectedExercise, setSelectedExercise] =
    useState<string>("bench-press");
  const [timeRange, setTimeRange] = useState(30);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userId) {
      return;
    }

    setLoading(true);
    try {
      const [statsData, freqData, volData, prDataResult] = await Promise.all([
        getWorkoutStats(userId, timeRange),
        getWorkoutFrequency(userId, timeRange),
        getVolumeHistory(userId, timeRange),
        getPRHistory(userId, selectedExercise),
      ]);

      setStats(statsData);
      setFrequencyData(freqData);
      setVolumeData(volData);
      setPrData(prDataResult);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [
    getPRHistory,
    getVolumeHistory,
    getWorkoutFrequency,
    getWorkoutStats,
    selectedExercise,
    timeRange,
    userId,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderBarChart = (
    data: Array<{
      date: string;
      count?: number;
      volume?: number;
      weight?: number;
    }>,
    label: string,
  ) => {
    if (data.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No data for this period</Text>
        </View>
      );
    }

    const values = data.map((d) => d.count || d.volume || d.weight || 0);
    const maxValue = Math.max(...values, 1);
    const barWidth = Math.max(CHART_WIDTH / data.length - 4, 8);

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartLabel}>{label}</Text>
        <View style={styles.chart}>
          {data.map((item, idx) => {
            const value = item.count || item.volume || item.weight || 0;
            const heightPercent = (value / maxValue) * 100;

            return (
              <View
                key={idx}
                style={[styles.barContainer, { width: barWidth }]}
              >
                <View style={styles.barWrapper}>
                  <View style={[styles.bar, { height: `${heightPercent}%` }]} />
                </View>
                {data.length <= 14 && idx % 2 === 0 && (
                  <Text style={styles.barLabel}>
                    {new Date(item.date).getDate()}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.chartAxis}>
          <Text style={styles.axisLabel}>
            {data[0]?.weight !== undefined
              ? "All time"
              : `Last ${timeRange} days`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress & Analytics</Text>
      </View>

      <View style={styles.timeRangeSelector}>
        {[7, 14, 30, 90].map((days) => (
          <TouchableOpacity
            key={days}
            style={[
              styles.timeRangeButton,
              timeRange === days && styles.timeRangeButtonActive,
            ]}
            onPress={() => setTimeRange(days)}
          >
            <Text
              style={[
                styles.timeRangeText,
                timeRange === days && styles.timeRangeTextActive,
              ]}
            >
              {days}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {Math.round(stats.totalVolume).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Volume (kg)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {Math.round(stats.averageVolume).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Avg Volume (kg)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, styles.streakValue]}>
                🔥 {stats.currentStreak}
              </Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.longestStreak}</Text>
              <Text style={styles.statLabel}>Longest Streak</Text>
            </View>
          </View>

          <View style={styles.section}>
            {renderBarChart(frequencyData, "Workout Frequency")}
          </View>

          <View style={styles.section}>
            {renderBarChart(volumeData, "Volume Over Time (kg)")}
          </View>

          <View style={styles.section}>
            <Text style={styles.chartLabel}>Personal Record Progression</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.exerciseSelector}
            >
              {exerciseList.slice(0, 8).map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  style={[
                    styles.exercisePill,
                    selectedExercise === ex.id && styles.exercisePillActive,
                  ]}
                  onPress={() => setSelectedExercise(ex.id)}
                >
                  <Text
                    style={[
                      styles.exercisePillText,
                      selectedExercise === ex.id &&
                        styles.exercisePillTextActive,
                    ]}
                  >
                    {ex.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {renderBarChart(
              prData,
              `${exerciseList.find((e) => e.id === selectedExercise)?.name || "Exercise"} Max Weight (kg)`,
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Keep it up! 💪</Text>
            <Text style={styles.sectionSubtext}>
              {stats.currentStreak > 0
                ? `You're on a ${stats.currentStreak}-day streak. Don't break it!`
                : "Start a new workout to build your streak!"}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  timeRangeSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  timeRangeButton: {
    flex: 1,
    backgroundColor: "#111",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  timeRangeButtonActive: {
    backgroundColor: "#0a0",
    borderColor: "#0a0",
  },
  timeRangeText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  timeRangeTextActive: {
    color: "#fff",
  },
  loadingContainer: {
    padding: 48,
    alignItems: "center",
  },
  loadingText: {
    color: "#888",
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  statValue: {
    color: "#0a0",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 32,
  },
  statLabel: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  sectionSubtext: {
    color: "#888",
    fontSize: 14,
  },
  chartContainer: {
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  chartLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
  },
  chart: {
    height: CHART_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  barContainer: {
    height: "100%",
    alignItems: "center",
  },
  barWrapper: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    backgroundColor: "#0a0",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  barLabel: {
    color: "#666",
    fontSize: 10,
    marginTop: 4,
  },
  emptyChart: {
    backgroundColor: "#111",
    padding: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  emptyChartText: {
    color: "#666",
    fontSize: 14,
  },
  chartAxis: {
    marginTop: 8,
    alignItems: "center",
  },
  axisLabel: {
    color: "#666",
    fontSize: 12,
  },
  exerciseSelector: {
    marginBottom: 16,
  },
  exercisePill: {
    backgroundColor: "#111",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  exercisePillActive: {
    backgroundColor: "#0a0",
    borderColor: "#0a0",
  },
  exercisePillText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  exercisePillTextActive: {
    color: "#fff",
  },
});
