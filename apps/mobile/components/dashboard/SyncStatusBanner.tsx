import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../ui/Card";
import { Colors, Spacing, BorderRadius } from "../../constants/Theme";
import { TextStyles } from "../../constants/Typography";

interface SyncStatusBannerProps {
  isOnline: boolean;
  isSyncing: boolean;
  queueLength: number;
  onManualSync?: () => void;
}

export function SyncStatusBanner({
  isOnline,
  isSyncing,
  queueLength,
  onManualSync,
}: SyncStatusBannerProps) {
  let title = "All changes synced";
  let subtitle = "Your workouts are safely stored.";
  let iconName: keyof typeof Ionicons.glyphMap = "cloud-done-outline";
  let iconColor = Colors.success;
  let showSpinner = false;

  if (!isOnline) {
    title = "Offline mode";
    subtitle = "Logging locally. We will sync once you reconnect.";
    iconName = "cloud-offline";
    iconColor = Colors.destructive;
  } else if (isSyncing) {
    title = "Syncing changes…";
    subtitle = "Sync in progress, your app will update in the background";
    showSpinner = true;
    iconColor = Colors.actionPrimary;
  } else if (queueLength > 0) {
    title = "Waiting to sync";
    subtitle = `${queueLength} ${queueLength === 1 ? "update" : "updates"} queued`;
    iconName = "refresh-circle";
    iconColor = Colors.actionPrimary;
  }

  return (
    <Card style={styles.container}>
      <View style={styles.content}>
        {showSpinner ? (
          <ActivityIndicator size="small" color={Colors.actionPrimary} />
        ) : (
          <View style={[styles.iconWrapper, { backgroundColor: iconColor }]}>
            <Ionicons name={iconName} size={14} color={Colors.white} />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {queueLength > 0 && !isSyncing && onManualSync && (
          <Pressable
            style={styles.syncButton}
            onPress={onManualSync}
          >
            <Ionicons name="refresh" size={16} color={Colors.actionPrimary} />
            <Text style={styles.syncButtonText}>Sync Now</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...TextStyles.body,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: "600",
    color: Colors.foreground,
  },
  subtitle: {
    ...TextStyles.caption,
    fontFamily: 'Poppins_400Regular',
    color: Colors.mutedForeground,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.sm,
  },
  syncButtonText: {
    ...TextStyles.caption,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: Colors.actionPrimary,
  },
});
