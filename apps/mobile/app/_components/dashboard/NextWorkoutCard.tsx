import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Colors, Spacing } from "../../../constants/design-system";
import { Skeleton } from "../ui/Skeleton";

interface Props {
  workoutName?: string;
  lastCompletedAt?: string | null;
  estimatedDuration?: string | null;
  onStart: () => void;
  loading?: boolean;
}

export const NextWorkoutCard: React.FC<Props> = ({
  workoutName,
  lastCompletedAt,
  estimatedDuration,
  onStart,
  loading,
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Next Workout</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton height={24} />
          <Skeleton width="60%" />
        </CardContent>
      </Card>
    );
  }

  if (!workoutName) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Next Workout</CardTitle>
        </CardHeader>
        <CardContent style={styles.emptyContent}>
          <Text style={styles.emptyText}>
            No workout plans found. Create a template or start an ad-hoc
            session.
          </Text>
          <Button onPress={onStart}>Create Workout</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Next Workout</CardTitle>
      </CardHeader>
      <CardContent style={styles.content}>
        <View style={styles.textBlock}>
          <Text style={styles.workoutName}>{workoutName}</Text>
          {estimatedDuration ? (
            <Text style={styles.detail}>Estimated: {estimatedDuration}</Text>
          ) : null}
          {lastCompletedAt ? (
            <Text style={styles.detail}>Last completed: {lastCompletedAt}</Text>
          ) : null}
        </View>
        <Button onPress={onStart}>Start Workout</Button>
      </CardContent>
    </Card>
  );
};

export default NextWorkoutCard;

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
  },
  textBlock: {
    gap: Spacing.sm,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.foreground,
  },
  detail: {
    color: Colors.gray400,
    fontSize: 14,
  },
  emptyContent: {
    gap: Spacing.md,
  },
  emptyText: {
    color: Colors.gray400,
    fontSize: 14,
  },
});
