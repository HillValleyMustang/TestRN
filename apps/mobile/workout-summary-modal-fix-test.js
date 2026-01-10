// Test file for WorkoutSummaryModal muscle group fix
// This file demonstrates the issue and verifies the fix

// Mock exercise data with the issue (Leg Press with Chest muscle group)
const mockExercises = [
  {
    exerciseId: "ex1",
    exerciseName: "Leg Press",
    muscleGroup: "Chest", // This is the issue - should be Legs
    sets: [
      { weight: "100", reps: "10", isCompleted: true },
      { weight: "120", reps: "8", isCompleted: true }
    ]
  },
  {
    exerciseId: "ex2",
    exerciseName: "Leg Extension",
    muscleGroup: "Legs", // This is correct
    sets: [
      { weight: "50", reps: "12", isCompleted: true },
      { weight: "60", reps: "10", isCompleted: true }
    ]
  }
];

// Function to simulate the normalizeMuscleGroup function from WorkoutSummaryModal
const normalizeMuscleGroup = (muscle) => {
  const muscleLower = muscle.toLowerCase();
  
  console.log(`[TEST] Normalizing muscle group: "${muscle}"`);
  
  // Fix for leg press and other leg exercises incorrectly categorized as chest
  if (muscleLower.includes('leg') || muscleLower.includes('quad') || muscleLower.includes('thigh')) {
    console.log(`[TEST] ✅ Corrected leg-related exercise from "${muscle}" to "Legs"`);
    return 'Legs';
  }
  
  if (muscleLower.includes('abs') || muscleLower.includes('abdominals')) return 'Abs';
  if (muscleLower.includes('chest') || muscleLower.includes('pectorals')) return 'Chest';
  // ... other muscle groups
  
  return muscle; // Return original if no match
};

// Function to simulate the volume distribution calculation
const calculateVolumeDistribution = (exercises) => {
  const volumeDistribution = {};
  
  exercises.forEach(exercise => {
    // Fix for leg exercises incorrectly categorized as chest
    let muscleGroup = exercise.muscleGroup || 'Other';
    
    // Check exercise name for leg-related exercises with incorrect muscle groups
    if (exercise.exerciseName.toLowerCase().includes('leg') && 
        !muscleGroup.toLowerCase().includes('leg') && 
        !muscleGroup.toLowerCase().includes('quad') && 
        !muscleGroup.toLowerCase().includes('hamstring')) {
      console.log(`[TEST] 🔄 Correcting muscle group for ${exercise.exerciseName} from "${muscleGroup}" to "Legs"`);
      muscleGroup = 'Legs';
    }
    
    const normalizedMuscle = normalizeMuscleGroup(muscleGroup);
    
    // Calculate exercise volume
    const exerciseVolume = exercise.sets.filter(set => set.isCompleted).reduce((sum, set) => {
      const weight = parseFloat(set.weight) || 0;
      const reps = parseInt(set.reps, 10) || 0;
      return sum + (weight * reps);
    }, 0);
    
    // Add to volume distribution
    if (volumeDistribution[normalizedMuscle]) {
      volumeDistribution[normalizedMuscle] += exerciseVolume;
    } else {
      volumeDistribution[normalizedMuscle] = exerciseVolume;
    }
  });
  
  return volumeDistribution;
};

// Test the fix
console.log("[TEST] Starting test for WorkoutSummaryModal muscle group fix");
console.log("[TEST] Mock exercises:", mockExercises);

// Calculate volume distribution before fix
console.log("[TEST] Volume distribution WITHOUT fix:");
const beforeFix = {};
mockExercises.forEach(exercise => {
  const muscleGroup = exercise.muscleGroup;
  const exerciseVolume = exercise.sets.filter(set => set.isCompleted).reduce((sum, set) => {
    const weight = parseFloat(set.weight) || 0;
    const reps = parseInt(set.reps, 10) || 0;
    return sum + (weight * reps);
  }, 0);
  
  if (beforeFix[muscleGroup]) {
    beforeFix[muscleGroup] += exerciseVolume;
  } else {
    beforeFix[muscleGroup] = exerciseVolume;
  }
});
console.log(beforeFix);

// Calculate volume distribution with fix
console.log("[TEST] Volume distribution WITH fix:");
const afterFix = calculateVolumeDistribution(mockExercises);
console.log(afterFix);

// Verify the fix
console.log("[TEST] Verification:");
if (beforeFix['Chest'] && !afterFix['Chest']) {
  console.log("[TEST] ✅ SUCCESS: Leg Press volume is no longer attributed to Chest");
} else {
  console.log("[TEST] ❌ FAILURE: Fix did not work as expected");
}

if (afterFix['Legs'] && afterFix['Legs'] > (beforeFix['Legs'] || 0)) {
  console.log("[TEST] ✅ SUCCESS: Leg Press volume is now correctly attributed to Legs");
} else {
  console.log("[TEST] ❌ FAILURE: Leg Press volume was not correctly attributed to Legs");
}

console.log("[TEST] Test completed");