import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useAuth } from "./_contexts/auth-context";
import { useData } from "./_contexts/data-context";
import { useRouter } from "expo-router";
import type { TPath } from "@data/storage/models";

export default function TPathsScreen() {
  const { userId } = useAuth();
  const { getTPaths, deleteTPath } = useData();
  const router = useRouter();
  const [tPaths, setTPaths] = useState<TPath[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTPaths = useCallback(async () => {
    if (!userId) {
      return;
    }
    setLoading(true);
    try {
      const data = await getTPaths(userId, true);
      setTPaths(data);
    } catch {
      Alert.alert("Error", "Failed to load workout programs");
    } finally {
      setLoading(false);
    }
  }, [getTPaths, userId]);

  useEffect(() => {
    loadTPaths();
  }, [userId, loadTPaths]);

  const handleDelete = (tPath: TPath) => {
    Alert.alert(
      "Delete Program",
      `Are you sure you want to delete "${tPath.template_name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTPath(tPath.id);
              await loadTPaths();
              Alert.alert("Success", "Program deleted");
            } catch {
              Alert.alert("Error", "Failed to delete program");
            }
          },
        },
      ],
    );
  };

  const handleViewDetails = (tPath: TPath) => {
    router.push({
      pathname: "/t-path-detail",
      params: { tPathId: tPath.id },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout Programs</Text>
        <Text style={styles.subtitle}>
          {tPaths.length} program{tPaths.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading programs...</Text>
        </View>
      ) : tPaths.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No workout programs yet</Text>
          <Text style={styles.emptySubtext}>
            AI-generated workout programs will appear here
          </Text>
        </View>
      ) : (
        tPaths.map((tPath) => (
          <TouchableOpacity
            key={tPath.id}
            style={styles.tPathCard}
            onPress={() => handleViewDetails(tPath)}
          >
            <View style={styles.tPathHeader}>
              <View style={styles.tPathInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.tPathName}>{tPath.template_name}</Text>
                  {tPath.is_ai_generated && (
                    <View style={styles.aiTag}>
                      <Text style={styles.aiTagText}>AI</Text>
                    </View>
                  )}
                </View>
                {tPath.description && (
                  <Text style={styles.tPathDescription}>
                    {tPath.description}
                  </Text>
                )}
                <Text style={styles.tPathMeta}>
                  {tPath.is_main_program ? "Main Program" : "Workout"}
                </Text>
              </View>
            </View>

            <View style={styles.tPathActions}>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => handleViewDetails(tPath)}
              >
                <Text style={styles.viewButtonText}>View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(tPath)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    paddingTop: 60,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: "#888",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  tPathCard: {
    backgroundColor: "#1a1a1a",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  tPathHeader: {
    marginBottom: 16,
  },
  tPathInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tPathName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  aiTag: {
    backgroundColor: "#0a0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  aiTagText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "bold",
  },
  tPathDescription: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 8,
  },
  tPathMeta: {
    fontSize: 12,
    color: "#666",
  },
  tPathActions: {
    flexDirection: "row",
    gap: 12,
  },
  viewButton: {
    flex: 1,
    backgroundColor: "#0a0",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  viewButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "#2a2a2a",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: "#f44",
    fontSize: 16,
  },
  backButton: {
    margin: 16,
    padding: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    alignItems: "center",
  },
  backButtonText: {
    color: "#0a0",
    fontSize: 16,
    fontWeight: "bold",
  },
});
