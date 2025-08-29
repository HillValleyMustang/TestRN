"use client";

import React from "react";
import { cn } from "@/lib/utils";

// Arrow icon as a separate component for clarity
function ArrowIcon({ direction, colorClass }: { direction: "up" | "down", colorClass: string }) {
  return (
    <svg
      className={cn("w-4 h-4", colorClass)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      {direction === "up" ? (
        <path d="M12 19V7M5 12l7-7 7 7" />
      ) : (
        <path d="M12 5v12M5 12l7 7 7-7" />
      )}
    </svg>
  );
}

const pillStyles = {
  blue: {
    border: "border-blue-500",
    text: "text-blue-600",
    bg: "bg-blue-500",
    glow: "shadow-[0_0_24px_0_rgba(59,130,246,0.35)]",
  },
  red: {
    border: "border-red-500",
    text: "text-red-600",
    bg: "bg-red-500",
    glow: "shadow-[0_0_24px_0_rgba(239,68,68,0.35)]",
  },
  yellow: {
    border: "border-yellow-400",
    text: "text-yellow-600",
    bg: "bg-yellow-400",
    glow: "shadow-[0_0_24px_0_rgba(245,158,11,0.35)]",
  },
  green: {
    border: "border-green-500",
    text: "text-green-600",
    bg: "bg-green-500",
    glow: "shadow-[0_0_24px_0_rgba(34,197,94,0.35)]",
  },
};

interface WorkoutPillButtonProps {
  name: string;
  time: string;
  accent: 'blue' | 'red' | 'yellow' | 'green';
  selected: boolean;
  direction: 'up' | 'down';
  onClick: () => void;
}

export function WorkoutPillButton({ name, time, accent, selected, direction, onClick }: WorkoutPillButtonProps) {
  const style = pillStyles[accent];

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center w-full max-w-[180px] h-[54px] rounded-full pr-6 pl-4 py-2 text-left",
        selected ? `${style.bg} text-white ${style.glow}` : `bg-white ${style.text}`,
        "transition-shadow transition-colors duration-200"
      )}
    >
      {/* Accent Strip */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-[8px] rounded-l-full",
          style.border,
          selected ? style.bg : "bg-white"
        )}
      />
      {/* Icon Container */}
      <span
        className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full border",
          selected ? "bg-white border-white" : "bg-transparent border-gray-200"
        )}
      >
        <ArrowIcon
          direction={direction}
          colorClass={selected ? style.text : ""} // Use accent color when selected, inherit when not
        />
      </span>
      {/* Text */}
      <div className="ml-3 flex flex-col">
        <span className="font-semibold text-[15px] leading-tight">{name}</span>
        <span className={cn("text-xs", selected ? "text-white opacity-80" : "opacity-60")}>{time}</span>
      </div>
    </button>
  );
}