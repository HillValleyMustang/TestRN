"use client";

import React from 'react';
import { Slider } from "@/components/ui/slider";

interface MetricSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  conversionFn?: (value: number) => string;
}

export const MetricSlider = ({
  value,
  onValueChange,
  min,
  max,
  step,
  unit,
  conversionFn,
}: MetricSliderProps) => {
  return (
    <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
      <div className="text-center mb-3">
        <p className="text-3xl font-bold text-primary">{value} <span className="text-xl">{unit}</span></p>
        {conversionFn && (
          <p className="text-sm text-muted-foreground">{conversionFn(value)}</p>
        )}
      </div>
      <Slider
        value={[value]}
        onValueChange={(values) => onValueChange(values[0])}
        min={min}
        max={max}
        step={step}
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
};