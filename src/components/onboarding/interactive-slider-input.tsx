"use client";

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface InteractiveSliderInputProps {
  id: string;
  label?: string;
  value: number | null;
  onValueChange: (value: number | null) => void;
  unit: string;
  subtitle?: string;
  min: number;
  max: number;
  step: number;
  className?: string;
}

export const InteractiveSliderInput = ({
  id,
  label,
  value,
  onValueChange,
  unit,
  subtitle,
  min,
  max,
  step,
  className,
}: InteractiveSliderInputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = e.target.value === '' ? null : parseInt(e.target.value, 10);
    onValueChange(numValue);
  };

  const handleSliderChange = (values: number[]) => {
    onValueChange(values[0]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {(label || subtitle) && (
        <div className="flex justify-between items-baseline">
          {label && <Label htmlFor={id} className="text-sm font-medium">{label}</Label>}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      )}
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        step={step}
        placeholder={`e.g., ${Math.round((min + max) / 2)}`}
        value={value ?? ''}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 300)}
        className="mt-1 text-sm"
      />
      <div className="h-10 pt-2">
        {isFocused && (
          <div className="animate-in slide-in-from-top-4 duration-300">
            <Slider
              value={[value ?? min]}
              onValueChange={handleSliderChange}
              min={min}
              max={max}
              step={step}
              indicatorClassName="bg-gradient-to-r from-workout-lower-body-b to-workout-upper-body-b"
            />
          </div>
        )}
      </div>
    </div>
  );
};