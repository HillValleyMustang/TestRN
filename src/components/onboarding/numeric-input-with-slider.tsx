"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { ArrowLeftRight, ChevronDown, ChevronUp } from 'lucide-react';
import { convertWeight, formatWeight, convertDistance, formatDistance, KG_TO_LBS, KM_TO_MILES } from '@/lib/unit-conversions';

interface NumericInputWithSliderProps {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  unit: 'cm' | 'kg'; // Primary unit for the input
  conversionUnit: 'ft/in' | 'lbs'; // Unit for conversion display
  min: number;
  max: number;
  step: number;
  isFocused: boolean;
  onFocusChange: (id: string, focused: boolean) => void;
  onNext: (currentId: string) => void;
  isLastField: boolean;
  errorMessage?: string;
}

export const NumericInputWithSlider = ({
  id,
  label,
  value,
  onChange,
  unit,
  conversionUnit,
  min,
  max,
  step,
  isFocused,
  onFocusChange,
  onNext,
  isLastField,
  errorMessage,
}: NumericInputWithSliderProps) => {
  const [internalValue, setInternalValue] = useState<string>(value?.toString() || '');
  const [displayUnit, setDisplayUnit] = useState<'primary' | 'converted'>('primary');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInternalValue(value?.toString() || '');
  }, [value]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInternalValue(rawValue);
    const numValue = parseFloat(rawValue);
    if (!isNaN(numValue)) {
      onChange(numValue);
    } else {
      onChange(null);
    }
  }, [onChange]);

  const handleSliderChange = useCallback((sliderValues: number[]) => {
    const sliderValue = sliderValues[0];
    if (displayUnit === 'converted') {
      // Convert sliderValue back to primary unit before calling onChange
      let convertedToPrimary: number | null = null;
      if (unit === 'cm' && conversionUnit === 'ft/in') {
        // Assuming sliderValue is in inches, convert to cm
        convertedToPrimary = sliderValue * 2.54;
      } else if (unit === 'kg' && conversionUnit === 'lbs') {
        convertedToPrimary = convertWeight(sliderValue, 'lbs', 'kg');
      }
      onChange(convertedToPrimary);
      setInternalValue(convertedToPrimary?.toFixed(0) || ''); // Update internal input to primary unit
    } else {
      onChange(sliderValue);
      setInternalValue(sliderValue.toString());
    }
  }, [onChange, displayUnit, unit, conversionUnit]);

  const handleUnitToggle = useCallback(() => {
    setDisplayUnit(prev => (prev === 'primary' ? 'converted' : 'primary'));
  }, []);

  const getConvertedValue = useCallback((val: number | null): string => {
    if (val === null) return '-';
    if (unit === 'cm' && conversionUnit === 'ft/in') {
      const inches = val / 2.54;
      const feet = Math.floor(inches / 12);
      const remainingInches = Math.round(inches % 12);
      return `${feet}' ${remainingInches}"`;
    } else if (unit === 'kg' && conversionUnit === 'lbs') {
      return formatWeight(convertWeight(val, 'kg', 'lbs'), 'lbs', 0);
    }
    return '-';
  }, [unit, conversionUnit]);

  const getSliderValue = useCallback((val: number | null): number[] => {
    if (val === null) return [min];
    if (displayUnit === 'converted') {
      if (unit === 'cm' && conversionUnit === 'ft/in') {
        return [Math.round(val / 2.54)]; // Convert cm to inches for slider
      } else if (unit === 'kg' && conversionUnit === 'lbs') {
        return [Math.round(convertWeight(val, 'kg', 'lbs') || min)]; // Convert kg to lbs for slider
      }
    }
    return [val];
  }, [value, displayUnit, unit, conversionUnit, min]);

  const getSliderMinMaxStep = useCallback(() => {
    if (displayUnit === 'converted') {
      if (unit === 'cm' && conversionUnit === 'ft/in') {
        return {
          min: Math.round(min / 2.54), // Convert cm to inches
          max: Math.round(max / 2.54), // Convert cm to inches
          step: 1,
        };
      } else if (unit === 'kg' && conversionUnit === 'lbs') {
        return {
          min: Math.round(min * KG_TO_LBS), // Convert kg to lbs
          max: Math.round(max * KG_TO_LBS), // Convert kg to lbs
          step: 1,
        };
      }
    }
    return { min, max, step };
  }, [displayUnit, unit, conversionUnit, min, max, step]);

  const { min: sliderMin, max: sliderMax, step: sliderStep } = getSliderMinMaxStep();

  return (
    <div className={cn(
      "relative rounded-lg border-2 transition-all duration-300 ease-in-out",
      isFocused ? "border-onboarding-primary ring-2 ring-onboarding-primary/30 shadow-md" : "border-onboarding-border-light-gray hover:border-onboarding-primary/50",
      errorMessage ? "border-destructive ring-2 ring-destructive/30" : ""
    )}>
      <div 
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => {
          if (!isFocused) {
            onFocusChange(id, true);
            inputRef.current?.focus();
          }
        }}
      >
        <Label htmlFor={id} className="font-medium text-base">{label}</Label>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-onboarding-primary">
            {displayUnit === 'primary' ? `${value ?? '-'} ${unit}` : getConvertedValue(value)}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { e.stopPropagation(); onFocusChange(id, !isFocused); }}
            className="h-8 w-8"
          >
            {isFocused ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {isFocused && (
        <div className="p-4 border-t border-onboarding-border-light-gray space-y-4 animate-fade-in-slide-up">
          <div className="flex items-center gap-2">
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              step={step}
              value={internalValue}
              onChange={handleInputChange}
              onFocus={() => onFocusChange(id, true)}
              onBlur={() => onFocusChange(id, false)}
              className="flex-1 bg-onboarding-background-light-gray border-onboarding-border-light-gray text-base input-focus-glow"
              ref={inputRef}
            />
            <Button variant="outline" onClick={handleUnitToggle} className="flex-shrink-0 h-10 text-sm">
              <ArrowLeftRight className="h-4 w-4 mr-2" /> {displayUnit === 'primary' ? conversionUnit : unit}
            </Button>
          </div>
          <Slider
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            value={getSliderValue(value)}
            onValueChange={handleSliderChange}
            className="w-full"
          />
          {errorMessage && <p className="text-destructive text-sm mt-1">{errorMessage}</p>}
          <Button 
            onClick={() => onNext(id)} 
            className="w-full onboarding-button-gradient"
            disabled={value === null || value < min || value > max}
          >
            {isLastField ? "Done" : "Next"}
          </Button>
        </div>
      )}
    </div>
  );
};