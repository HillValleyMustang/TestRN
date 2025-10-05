"use client";

import React, { createContext, useContext } from 'react';
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';
import { useRouter } from 'next/navigation';

// Define the context type based on the return type of the hook
type WorkoutFlowContextType = ReturnType<typeof useWorkoutFlowManager>;

// Create the context
const WorkoutFlowContext = createContext<WorkoutFlowContextType | undefined>(undefined);

// Create the provider component
export const WorkoutFlowProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const workoutFlowManager = useWorkoutFlowManager({ router });

  return (
    <WorkoutFlowContext.Provider value={workoutFlowManager}>
      {children}
    </WorkoutFlowContext.Provider>
  );
};

// Create a custom hook to consume the context
export const useWorkoutFlow = () => {
  const context = useContext(WorkoutFlowContext);
  if (context === undefined) {
    throw new Error('useWorkoutFlow must be used within a WorkoutFlowProvider');
  }
  return context;
};