"use client";

import * as React from "react";
import { cn, getWorkoutColorClass, getWorkoutIcon } from "@/lib/utils";
import { Badge, BadgeProps } from "@/components/ui/badge";

interface WorkoutBadgeProps extends BadgeProps {
  workoutName: string;
}

const WorkoutBadge = ({ workoutName, className, ...props }: WorkoutBadgeProps) => {
  const bgColorClass = getWorkoutColorClass(workoutName, 'bg');
  const Icon = getWorkoutIcon(workoutName);

  return (
    <Badge
      className={cn(
        "px-2 py-0.5 text-xs flex items-center gap-1",
        bgColorClass, // Apply the background color
        "text-white", // Force text to white for readability on dark backgrounds
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