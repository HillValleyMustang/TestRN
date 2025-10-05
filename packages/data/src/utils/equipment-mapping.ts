import { EquipmentId } from '../constants/equipment';

export const EXERCISE_EQUIPMENT_MAP: Record<string, EquipmentId[]> = {
  'Barbell': ['barbell'],
  'Dumbbell': ['dumbbell'],
  'Kettlebell': ['kettlebell'],
  'EZ Bar': ['ez_bar'],
  'Trap Bar': ['trap_bar'],
  'Machine': ['leg_press', 'leg_extension', 'leg_curl', 'chest_press', 'shoulder_press', 'pec_deck', 'smith_machine', 'hack_squat', 'calf_raise'],
  'Cable': ['cable_machine', 'lat_pulldown', 'cable_crossover'],
  'Bodyweight': ['bodyweight', 'pull_up_bar', 'dip_station'],
  'Treadmill': ['treadmill'],
  'Rowing Machine': ['rowing_machine'],
  'Stationary Bike': ['stationary_bike'],
  'Elliptical': ['elliptical'],
  'Bench': ['bench'],
  'Pull-up Bar': ['pull_up_bar'],
  'Dip Station': ['dip_station'],
};

export function canPerformExercise(exerciseEquipment: string | undefined, availableEquipment: string[]): boolean {
  if (!exerciseEquipment) {
    return true;
  }

  const requiredEquipmentIds = EXERCISE_EQUIPMENT_MAP[exerciseEquipment] || [];
  
  if (requiredEquipmentIds.length === 0) {
    return true;
  }

  return requiredEquipmentIds.some(reqId => availableEquipment.includes(reqId));
}

export function getExerciseEquipmentIds(exerciseEquipment: string | undefined): EquipmentId[] {
  if (!exerciseEquipment) return [];
  return EXERCISE_EQUIPMENT_MAP[exerciseEquipment] || [];
}
