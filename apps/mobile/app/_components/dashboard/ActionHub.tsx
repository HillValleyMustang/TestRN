import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Colors, Spacing } from "../../../constants/design-system";
import { Ionicons } from "@expo/vector-icons";

type ActionVariant = "primary" | "success" | "outline";

interface ActionItem {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: ActionVariant;
}

interface Props {
  actions: ActionItem[];
}

export const ActionHub: React.FC<Props> = ({ actions }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Action Hub</CardTitle>
      </CardHeader>
      <CardContent style={styles.content}>
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant ?? "outline"}
            style={styles.button}
            onPress={action.onPress}
          >
            <View style={styles.buttonContent}>
              <Ionicons
                name={action.icon}
                size={20}
                color={Colors.foreground}
              />
              <View style={styles.buttonTextWrapper}>
                <Text style={styles.buttonTitle}>{action.title}</Text>
                {action.subtitle ? (
                  <Text style={styles.buttonSubtitle}>{action.subtitle}</Text>
                ) : null}
              </View>
            </View>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
  },
  button: {
    alignItems: "stretch",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  buttonTextWrapper: {
    flex: 1,
  },
  buttonTitle: {
    color: Colors.foreground,
    fontWeight: "600",
    fontSize: 16,
  },
  buttonSubtitle: {
    color: Colors.gray400,
    fontSize: 14,
    marginTop: 2,
  },
});
