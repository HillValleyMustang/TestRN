"use client";

import React from 'react';

interface CircularProgressProps {
  progress: number; // 0 to 100
}

export const CircularProgress = ({ progress }: CircularProgressProps) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="w-full h-full" viewBox="0 0 120 120">
        {/* Background Circle */}
        <circle
          className="text-secondary"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="60"
          cy="60"
        />
        {/* Foreground Progress Circle */}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--coral))" />
            <stop offset="100%" stopColor="hsl(var(--teal))" />
          </linearGradient>
        </defs>
        <circle
          stroke="url(#progressGradient)"
          className="transition-all duration-700 ease-out"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx="60"
          cy="60"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <span className="absolute text-2xl font-bold text-foreground">
        {Math.round(progress)}%
      </span>
    </div>
  );
};