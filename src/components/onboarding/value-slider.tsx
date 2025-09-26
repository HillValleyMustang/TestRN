"use client";

import React from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface ValueSliderProps {
  label: string;
  value: number | null;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  secondaryUnit?: string;
  secondaryValue?: string;
}

export const ValueSlider = ({
  label,
  value,
  onValueChange,
  min,
  max,
  step,
  unit,
  secondaryUnit,
  secondaryValue,
}: ValueSliderProps) => {
  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-end justify-center gap-2 text-center">
        <span className="text-5xl font-bold text-primary tracking-tighter w-32">
          {value ?? '-'}
        </span>
        <div className="flex flex-col items-start pb-1">
          <span className="font-semibold text-lg leading-none">{unit}</span>
          {secondaryUnit && secondaryValue && (
            <span className="text-xs text-muted-foreground leading-none">{secondaryValue} {secondaryUnit}</span>
          )}
        </div>
      </div>
      <Slider
        value={[value ?? min]}
        onValueChange={(vals) => onValueChange(vals[0])}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
};