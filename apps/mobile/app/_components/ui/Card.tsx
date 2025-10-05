import React from "react";
import { View, Text, StyleSheet, ViewProps } from "react-native";
import { Colors, BorderRadius, Spacing } from "../../constants/design-system";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padded = true,
  ...rest
}) => {
  return (
    <View style={[styles.card, padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );
};

interface SectionProps {
  children: React.ReactNode;
  style?: any;
}

export const CardHeader: React.FC<SectionProps> = ({ children, style }) => (
  <View style={[styles.header, style]}>{children}</View>
);

export const CardTitle: React.FC<{
  children: React.ReactNode;
  style?: any;
}> = ({ children, style }) => (
  <Text style={[styles.title, style]}>{children}</Text>
);

export const CardSubtitle: React.FC<{
  children: React.ReactNode;
  style?: any;
}> = ({ children, style }) => (
  <Text style={[styles.subtitle, style]}>{children}</Text>
);

export const CardContent: React.FC<SectionProps> = ({ children, style }) => (
  <View style={[styles.content, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: "hidden",
  },
  padded: {
    padding: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Spacing["2xl"],
    fontWeight: "600",
    color: Colors.foreground,
  },
  subtitle: {
    marginTop: Spacing.xs,
    color: Colors.gray400,
    fontSize: Spacing.lg,
    fontWeight: "400",
  },
  content: {
    gap: Spacing.md,
  },
});
