import { useMemo } from 'react';
import strings from './settings.en.json';

type SettingsStrings = typeof strings;

export function useSettingsStrings(): SettingsStrings {
  return useMemo(() => strings, []);
}
