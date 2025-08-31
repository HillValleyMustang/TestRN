"use client";

import * as React from "react";
import { cn, getWorkoutColorClass, getWorkoutIcon } from "@/lib/utils";
import { Badge, BadgeProps } from "@/components/ui/badge";

interface WorkoutBadgeProps extends BadgeProps {
  workoutName: string;
}

const WorkoutBadge = ({ workoutName, className, ...props }: WorkoutBadgeProps) => {
  const bgColorClass = getWorkoutColorClass(workoutName, 'bg');
  const textColorClass = getWorkoutColorClass(workoutName, 'text'); // This is now unused as we force text-white
  const Icon = getWorkoutIcon(workoutName);

  return (
    <Badge
      className={cn(
        "px-2 py-0.5 text-xs flex items-center gap-1",
        bgColorClass, // Apply background color
        "text-white", // Force text to white for contrast on colored backgrounds
        "transition-transform duration-200 ease-out group-hover:scale-105", // Add scale animation
        className
      )}
      // Removed default variant to allow direct class application to control colors
      {...props}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {workoutName}
    </Badge>
  );
};

export { WorkoutBadge };