"use client";

import * as React from "react";
import { cn, getWorkoutColorClass } from "@/lib/utils";
import { Badge, BadgeProps } from "@/components/ui/badge";

interface WorkoutBadgeProps extends BadgeProps {
  workoutName: string;
}

const WorkoutBadge = ({ workoutName, className, ...props }: WorkoutBadgeProps) => {
  const bgColorClass = getWorkoutColorClass(workoutName, 'bg');
  const textColorClass = getWorkoutColorClass(workoutName, 'text');
  const borderColorClass = getWorkoutColorClass(workoutName, 'border');

  return (
    <Badge
      variant="outline" // Use outline variant as it's less opinionated about bg/text
      className={cn(
        "px-2 py-0.5 text-xs",
        bgColorClass,
        textColorClass,
        borderColorClass,
        className
      )}
      {...props}
    />
  );
};

export { WorkoutBadge };