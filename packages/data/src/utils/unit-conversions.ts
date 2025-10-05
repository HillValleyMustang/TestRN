export const KG_TO_LBS = 2.20462;
export const KM_TO_MILES = 0.621371;

export function convertWeight(value: number | null | undefined, fromUnit: 'kg' | 'lbs', toUnit: 'kg' | 'lbs'): number | null {
  if (value === null || value === undefined) return null;
  if (fromUnit === toUnit) return value;

  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return value * KG_TO_LBS;
  } else if (fromUnit === 'lbs' && toUnit === 'kg') {
    return value / KG_TO_LBS;
  }
  return value;
}

export function convertDistance(value: number | null | undefined, fromUnit: 'km' | 'miles', toUnit: 'km' | 'miles'): number | null {
  if (value === null || value === undefined) return null;
  if (fromUnit === toUnit) return value;

  if (fromUnit === 'km' && toUnit === 'miles') {
    return value * KM_TO_MILES;
  } else if (fromUnit === 'miles' && toUnit === 'km') {
    return value / KM_TO_MILES;
  }
  return value;
}

export function formatWeight(value: number | null | undefined, unit: 'kg' | 'lbs', decimals: number = 1): string {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(decimals)} ${unit}`;
}

export function formatDistance(value: number | null | undefined, unit: 'km' | 'miles', decimals: number = 1): string {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(decimals)} ${unit}`;
}

export function formatTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '-';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function cmToFeetAndInches(cm: number | null | undefined): string {
  if (cm === null || cm === undefined) return '';
  const totalInches = cm / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches % 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return `${feet} ft ${inches} in`;
}
