import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

interface Step2Data {
  tPathType: "ppl" | "ulul" | null;
  experience: "beginner" | "intermediate" | null;
}

interface Step2Props {
  data: Step2Data;
  onDataChange: (data: Step2Data) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2TrainingSetup({
  data,
  onDataChange,
  onNext,
  onBack,
}: Step2Props) {
  const isValid = data.tPathType && data.experience;

  const splitOptions = [
    {
      id: "ppl" as const,
      title: "3-Day Push/Pull/Legs",
      subtitle: "PPL",
      frequency: "3 days per week",
      pros: ["Time efficient", "Better recovery", "Logical grouping"],
      color: "#10B981",
    },
    {
      id: "ulul" as const,
      title: "4-Day Upper/Lower",
      subtitle: "ULUL",
      frequency: "4 days per week",
      pros: ["Higher frequency", "Muscle growth", "Flexible scheduling"],
      color: "#3B82F6",
    },
  ];

  const experienceOptions = [
    {
      id: "beginner" as const,
      title: "Beginner",
      description: "New to structured training or returning after a long break",
    },
    {
      id: "intermediate" as const,
      title: "Intermediate",
      description: "Some experience with structured training programs",
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Training Setup</Text>
      <Text style={styles.subtitle}>
        Select the workout structure and your experience level
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workout Split</Text>
        {splitOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.card,
              data.tPathType === option.id && {
                borderColor: option.color,
                borderWidth: 2,
              },
            ]}
            onPress={() => onDataChange({ ...data, tPathType: option.id })}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={[styles.cardSubtitle, { color: option.color }]}>
                  {option.subtitle}
                </Text>
              </View>
              {data.tPathType === option.id && (
                <View
                  style={[styles.checkmark, { backgroundColor: option.color }]}
                >
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.frequency}>{option.frequency}</Text>
            <View style={styles.prosContainer}>
              {option.pros.map((pro, idx) => (
                <Text key={idx} style={styles.proText}>
                  ✓ {pro}
                </Text>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experience Level</Text>
        {experienceOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.experienceCard,
              data.experience === option.id && styles.experienceCardActive,
            ]}
            onPress={() => onDataChange({ ...data, experience: option.id })}
          >
            <View style={styles.experienceHeader}>
              <Text
                style={[
                  styles.experienceTitle,
                  data.experience === option.id && styles.experienceTitleActive,
                ]}
              >
                {option.title}
              </Text>
              {data.experience === option.id && (
                <View style={styles.experienceCheckmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.experienceDesc,
                data.experience === option.id && styles.experienceDescActive,
              ]}
            >
              {option.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!isValid}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  frequency: {
    fontSize: 13,
    color: "#888",
    marginBottom: 12,
  },
  prosContainer: {
    gap: 4,
  },
  proText: {
    fontSize: 13,
    color: "#10B981",
  },
  experienceCard: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
  },
  experienceCardActive: {
    borderColor: "#10B981",
    borderWidth: 2,
    backgroundColor: "#0a1a14",
  },
  experienceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  experienceTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  experienceTitleActive: {
    color: "#10B981",
  },
  experienceCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  experienceDesc: {
    fontSize: 14,
    color: "#888",
  },
  experienceDescActive: {
    color: "#10B981",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  backButton: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    flex: 1,
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
