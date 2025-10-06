import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Typography, Spacing } from "../../../constants/design-system";

interface Props {
  name: string;
  subtitle?: string;
}

export const WelcomeHeader: React.FC<Props> = ({ name, subtitle }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back, {name}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing["2xl"],
  },
  title: {
    fontSize: Typography["3xl"],
    fontWeight: "700",
    color: Colors.foreground,
  },
  subtitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.lg,
    color: Colors.gray400,
  },
});
