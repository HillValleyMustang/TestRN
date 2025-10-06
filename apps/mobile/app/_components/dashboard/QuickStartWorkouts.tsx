import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Colors, Spacing } from "../../../constants/design-system";

interface WorkoutTemplateSummary {
  id: string;
  name: string;
  description?: string | null;
}

interface Props {
  templates: WorkoutTemplateSummary[];
  onStartTemplate: (id: string) => void;
  onCreateTemplate: () => void;
}

export const QuickStartWorkouts: React.FC<Props> = ({
  templates,
  onStartTemplate,
  onCreateTemplate,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Start</CardTitle>
      </CardHeader>
      <CardContent style={styles.content}>
        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No saved workouts yet.</Text>
            <Button onPress={onCreateTemplate}>Create a template</Button>
          </View>
        ) : (
          templates.map((template) => (
            <View key={template.id} style={styles.templateRow}>
              <View style={styles.templateInfo}>
                <Text style={styles.templateName}>{template.name}</Text>
                {template.description ? (
                  <Text style={styles.templateDescription} numberOfLines={2}>
                    {template.description}
                  </Text>
                ) : null}
              </View>
              <Button size="sm" onPress={() => onStartTemplate(template.id)}>
                Start
              </Button>
            </View>
          ))
        )}
      </CardContent>
    </Card>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
  },
  emptyState: {
    gap: Spacing.md,
  },
  emptyText: {
    color: Colors.gray400,
    fontSize: 14,
  },
  templateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.cardBorder,
    paddingBottom: Spacing.sm,
  },
  templateInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  templateName: {
    color: Colors.foreground,
    fontSize: 16,
    fontWeight: "600",
  },
  templateDescription: {
    color: Colors.gray500,
    fontSize: 13,
  },
});
