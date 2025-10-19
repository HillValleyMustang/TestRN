import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  getCoachingAdvice,
  getFormTips,
  type CoachingContext,
} from "@data/ai/coaching";

interface AICoachingCardProps {
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  targetReps?: string;
}

export function AICoachingCard({
  exerciseName,
  currentSet,
  totalSets,
  targetReps,
}: AICoachingCardProps) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [formTips, setFormTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFormTips, setShowFormTips] = useState(false);

  const handleGetCoaching = async () => {
    setLoading(true);
    try {
      const context: CoachingContext = {
        exerciseName,
        currentSet,
        totalSets,
        targetReps: targetReps || "8-12",
      };

      const response = await getCoachingAdvice(context);
      setAdvice(response.message);
    } catch {
      setAdvice("You've got this! Focus on form and controlled movements.");
    } finally {
      setLoading(false);
    }
  };

  const handleGetFormTips = async () => {
    if (formTips.length > 0) {
      setShowFormTips(!showFormTips);
      return;
    }

    setLoading(true);
    try {
      const tips = await getFormTips(exerciseName);
      setFormTips(tips);
      setShowFormTips(true);
    } catch (error) {
      console.error("Failed to get form tips:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>✨ AI Coach</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleGetCoaching}
            disabled={loading}
          >
            {loading && !showFormTips ? (
              <ActivityIndicator size="small" color="#10b981" />
            ) : (
              <Text style={styles.actionButtonText}>💪 Motivate</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleGetFormTips}
            disabled={loading}
          >
            {loading && showFormTips ? (
              <ActivityIndicator size="small" color="#10b981" />
            ) : (
              <Text style={styles.actionButtonText}>📋 Form Tips</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {advice && !showFormTips && (
        <View style={styles.adviceBox}>
          <Text style={styles.adviceText}>{advice}</Text>
        </View>
      )}

      {showFormTips && formTips.length > 0 && (
        <View style={styles.tipsBox}>
          {formTips.map((tip, index) => (
            <View key={index} style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default AICoachingCard;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0d1f1a",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#10b981",
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerText: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    backgroundColor: "#1a2f26",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: "600",
  },
  adviceBox: {
    backgroundColor: "#1a2f26",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  adviceText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  tipsBox: {
    marginTop: 8,
  },
  tipRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  tipBullet: {
    color: "#10b981",
    fontSize: 16,
    marginRight: 8,
    fontWeight: "bold",
  },
  tipText: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});
