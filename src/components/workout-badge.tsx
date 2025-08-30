"use client";

import * as React from "react";
import { cn, getWorkoutColorClass, getWorkoutIcon } from "@/lib/utils";
import { Badge, BadgeProps } from "@/components/ui/badge";

interface WorkoutBadgeProps extends BadgeProps {
  workoutName: string;
}

const WorkoutBadge = ({ workoutName, className, ...props }: WorkoutBadgeProps) => {
  const bgColorClass = getWorkoutColorClass(workoutName, 'bg');
  const textColorClass = getWorkoutColorClass(workoutName, 'text'); // Get text color class
  const Icon = getWorkoutIcon(workoutName);

  return (
    <Badge
      className={cn(
        "px-2 py-0.5 text-xs flex items-center gap-1",
        "bg-card", // Force white background
        textColorClass, // Apply the workout-specific text color
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {workoutName}
    </Badge>
  );
};

export { WorkoutBadge };