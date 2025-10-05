import { usePreferences } from '../contexts/preferences-context';
import { convertWeight, formatWeight } from '@data/utils/unit-conversions';

export function useUnitConversion() {
  const { unitSystem } = usePreferences();

  const displayWeight = (weightKg: number | null | undefined): string => {
    if (weightKg === null || weightKg === undefined) return '0';
    
    if (unitSystem === 'imperial') {
      const lbs = convertWeight(weightKg, 'kg', 'lbs');
      return formatWeight(lbs, 'lbs');
    }
    
    return formatWeight(weightKg, 'kg');
  };

  const parseWeight = (displayValue: string): number => {
    const value = parseFloat(displayValue) || 0;
    
    if (unitSystem === 'imperial') {
      return convertWeight(value, 'lbs', 'kg');
    }
    
    return value;
  };

  const weightUnit = unitSystem === 'metric' ? 'kg' : 'lbs';

  return {
    displayWeight,
    parseWeight,
    weightUnit,
    unitSystem,
  };
}
