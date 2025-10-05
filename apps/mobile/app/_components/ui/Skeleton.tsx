import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { Colors, BorderRadius } from "../../constants/design-system";

interface SkeletonProps extends ViewProps {
  width?: number | string;
  height?: number | string;
  rounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  rounded = false,
  style,
  ...rest
}) => {
  return (
    <View
      style={[
        styles.base,
        { width, height },
        rounded && { borderRadius: BorderRadius.full },
        style,
      ]}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.gray800,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
});
