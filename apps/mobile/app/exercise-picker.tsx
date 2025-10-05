import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { EXERCISES, EXERCISE_CATEGORIES, type Exercise } from "@data/exercises";
import { canPerformExercise } from "@data/utils/equipment-mapping";
import { useAuth } from "./_contexts/auth-context";
import { useData } from "./_contexts/data-context";
import type { Gym } from "@data/storage/models";

export default function ExercisePickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userId } = useAuth();
  const { getActiveGym } = useData();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAvailableOnly, setShowAvailableOnly] = useState(true);
  const [activeGym, setActiveGym] = useState<Gym | null>(null);

  useEffect(() => {
    loadActiveGym();
  }, [userId]);

  const loadActiveGym = async () => {
    if (!userId) {
      return;
    }
    const gym = await getActiveGym(userId);
    setActiveGym(gym);
    setShowAvailableOnly(!!gym);
  };

  const filteredExercises = EXERCISES.filter((exercise) => {
    const matchesCategory =
      !selectedCategory || exercise.category === selectedCategory;
    const matchesSearch = exercise.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesEquipment =
      !showAvailableOnly ||
      !activeGym ||
      canPerformExercise(exercise.equipment, activeGym.equipment);
    return matchesCategory && matchesSearch && matchesEquipment;
  });

  const handleSelectExercise = (exercise: Exercise) => {
    router.navigate({
      pathname: "/workout",
      params: { selectedExerciseId: exercise.id },
    });
  };

  const renderCategory = ({
    item,
  }: {
    item: (typeof EXERCISE_CATEGORIES)[0];
  }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item.id && styles.categoryButtonActive,
      ]}
      onPress={() =>
        setSelectedCategory(selectedCategory === item.id ? null : item.id)
      }
    >
      <Text style={styles.categoryEmoji}>{item.emoji}</Text>
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.id && styles.categoryTextActive,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderExercise = ({ item }: { item: Exercise }) => {
    const isAvailable =
      !activeGym || canPerformExercise(item.equipment, activeGym.equipment);

    return (
      <TouchableOpacity
        style={[
          styles.exerciseCard,
          !isAvailable && styles.exerciseCardUnavailable,
        ]}
        onPress={() => handleSelectExercise(item)}
        disabled={!isAvailable}
      >
        <View style={styles.exerciseInfo}>
          <View style={styles.exerciseHeader}>
            <Text
              style={[
                styles.exerciseName,
                !isAvailable && styles.exerciseNameUnavailable,
              ]}
            >
              {item.name}
            </Text>
            {!isAvailable && (
              <View style={styles.unavailableBadge}>
                <Text style={styles.unavailableBadgeText}>No Equipment</Text>
              </View>
            )}
          </View>
          <Text style={styles.exerciseDetails}>
            {item.equipment} • {item.primaryMuscles.join(", ")}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {activeGym && (
        <View style={styles.filterContainer}>
          <View style={styles.gymInfo}>
            <Text style={styles.gymLabel}>
              Gym: <Text style={styles.gymName}>{activeGym.name}</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setShowAvailableOnly(!showAvailableOnly)}
          >
            <Text style={styles.filterToggleText}>
              {showAvailableOnly ? "Available Only" : "Show All"}
            </Text>
            <View
              style={[styles.toggle, showAvailableOnly && styles.toggleActive]}
            >
              <View
                style={[
                  styles.toggleCircle,
                  showAvailableOnly && styles.toggleCircleActive,
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={EXERCISE_CATEGORIES}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        style={styles.categoriesList}
      />

      <FlatList
        data={filteredExercises}
        renderItem={renderExercise}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.exercisesContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No exercises found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
  },
  categoriesList: {
    flexGrow: 0,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: "#0a0",
    borderColor: "#0a0",
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  categoryTextActive: {
    color: "#000",
  },
  exercisesContainer: {
    padding: 16,
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  exerciseName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  exerciseNameUnavailable: {
    color: "#888",
  },
  exerciseCardUnavailable: {
    opacity: 0.6,
  },
  unavailableBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unavailableBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  exerciseDetails: {
    color: "#888",
    fontSize: 14,
  },
  arrow: {
    color: "#888",
    fontSize: 24,
    fontWeight: "300",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1a1a1a",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  gymInfo: {
    flex: 1,
  },
  gymLabel: {
    color: "#888",
    fontSize: 14,
  },
  gymName: {
    color: "#10b981",
    fontWeight: "600",
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterToggleText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#333",
    padding: 2,
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: "#10b981",
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#666",
  },
  toggleCircleActive: {
    backgroundColor: "#fff",
    alignSelf: "flex-end",
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "#888",
    fontSize: 16,
  },
});
