// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// Removed unused import: import { ExerciseDefFromCSV, WorkoutStructureEntry } from './types';

export const toNullOrNumber = (val: string | null | undefined): number | null => {
  if (val === null || val === undefined || val.trim() === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

export const toNullIfEmpty = (str: string | null | undefined): string | null => (str === '' || str === undefined || str === null) ? null : str;

export const getSupabaseClients = (authHeader: string) => {
  // @ts-ignore
  const supabaseUrl = (Deno.env as any).get('SUPABASE_URL') ?? '';
  // @ts-ignore
  const supabaseAnonKey = (Deno.env as any).get('SUPABASE_ANON_KEY') ?? '';
  // @ts-ignore
  const supabaseServiceRoleKey = (Deno.env as any).get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const supabaseServiceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  return { supabaseAuthClient, supabaseServiceRoleClient };
};

export function getMaxMinutes(sessionLength: string | null | undefined): number {
  switch (sessionLength) {
    case '15-30': return 30;
    case '30-45': return 45;
    case '45-60': return 60;
    case '60-90': return 90;
    default: return 90;
  }
}

export function getWorkoutNamesForSplit(workoutSplit: string): string[] {
  if (workoutSplit === 'ulul') return ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
  if (workoutSplit === 'ppl') return ['Push', 'Pull', 'Legs'];
  throw new Error('Unknown workout split type.');
}