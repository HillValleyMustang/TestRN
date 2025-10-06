import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from "react-native";
import {
  ButtonStyles,
  Colors,
  BorderRadius,
  Spacing,
} from "../../../constants/design-system";

type Variant = "primary" | "success" | "destructive" | "outline" | "ghost";

type Size = "sm" | "md" | "lg";

interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  style,
  disabled,
  ...rest
}) => {
  const variantStyle = buttonVariants[variant] ?? buttonVariants.primary;
  const sizeStyle = sizeVariants[size] ?? sizeVariants.md;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyle,
        sizeStyle,
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "outline" || variant === "ghost"
              ? Colors.foreground
              : Colors.foreground
          }
        />
      ) : (
        <Text style={[styles.text, variantText[variant]]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  text: {
    fontWeight: "600",
    fontSize: 16,
  },
  disabled: {
    opacity: 0.6,
  },
});

const buttonVariants: Record<Variant, any> = {
  primary: {
    ...ButtonStyles.primary,
  },
  success: {
    ...ButtonStyles.success,
  },
  destructive: {
    ...ButtonStyles.destructive,
  },
  outline: {
    ...ButtonStyles.outline,
  },
  ghost: {
    ...ButtonStyles.ghost,
  },
};

const variantText: Record<Variant, any> = {
  primary: { color: Colors.foreground },
  success: { color: Colors.foreground },
  destructive: { color: Colors.foreground },
  outline: { color: Colors.foreground },
  ghost: { color: Colors.gray300 },
};

const sizeVariants: Record<Size, any> = {
  sm: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  md: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  lg: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
  },
};
