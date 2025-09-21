"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingOverlay } from "@/components/loading-overlay";
import { ExerciseInfoDialog } from "@/components/exercise-info-dialog";
import { WorkoutBadge } from "@/components/workout-badge";

// Import new modular components and hook
import { useEditWorkoutExercises } from "@/hooks/use-edit-workout-exercises";
import { AddExerciseSection } from "@/components/manage-t-paths/edit-workout-exercises/add-exercise-section";
import { SortableExerciseList } from "@/components/manage-t-paths/edit-workout-exercises/sortable-exercise-list";
import { WorkoutActionButtons } from "@/components/manage-t-paths/edit-workout-exercises/workout-action-buttons";
import { ConfirmRemoveExerciseDialog } from "@/components/manage-t-paths/edit-workout-exercises/confirm-remove-exercise-dialog";
import { AddAsBonusDialog } from "@/components/manage-t-paths/edit-workout-exercises/add-as-bonus-dialog";
import { ConfirmResetDialog } from "@/components/manage-t-paths/edit-workout-exercises/confirm-reset-dialog";
import { useGlobalStatus } from '@/contexts'; // NEW: Import useGlobalStatus

interface EditWorkoutExercisesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  workoutName: string;
  onSaveSuccess: () => void;
}

export const EditWorkoutExercisesDialog = ({
  open,
  onOpenChange,
  workoutId,
  workoutName,
  onSaveSuccess,
}: EditWorkoutExercisesDialogProps) => {
  const { startLoading, endLoadingSuccess, endLoadingError } = useGlobalStatus(); // NEW: Use global status

  const {
    exercises,
    filteredExercisesForDropdown,
    selectedExerciseToAdd,
    setSelectedExerciseToAdd,
    loading,
    isSaving,
    addExerciseFilter,
    setAddExerciseFilter,
    mainMuscleGroups,
    selectedMuscleFilter,
    setSelectedMuscleFilter,
    userGyms,
    selectedGymFilter,
    setSelectedGymFilter,
    showConfirmRemoveDialog,
    setShowConfirmRemoveDialog,
    exerciseToRemove,
    showAddAsBonusDialog,
    setShowAddAsBonusDialog,
    exerciseToAddDetails,
    showConfirmResetDialog,
    setShowConfirmResetDialog,
    handleDragEnd,
    handleAddExerciseWithBonusStatus,
    handleSelectAndPromptBonus,
    handleRemoveExerciseClick,
    confirmRemoveExercise,
    handleToggleBonusStatus,
    handleResetToDefaults,
    handleSaveOrder,
  } = useEditWorkoutExercises({ workoutId, onSaveSuccess, open });

  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<typeof exercises[0] | null>(null);

  const handleOpenInfoDialog = (exercise: typeof exercises[0]) => {
    setSelectedExerciseForInfo(exercise);
    setIsInfoDialogOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            Manage Exercises for <WorkoutBadge workoutName={workoutName} className="text-xl px-3 py-1" />
          </DialogTitle>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {loading ? (
            <p className="text-muted-foreground">Loading exercises...</p>
          ) : (
            <div className="space-y-6 w-full">
              <AddExerciseSection
                allAvailableExercises={filteredExercisesForDropdown}
                exercisesInWorkout={exercises}
                selectedExerciseToAdd={selectedExerciseToAdd}
                setSelectedExerciseToAdd={setSelectedExerciseToAdd}
                addExerciseFilter={addExerciseFilter}
                setAddExerciseFilter={setAddExerciseFilter}
                handleSelectAndPromptBonus={handleSelectAndPromptBonus}
                isSaving={isSaving}
                mainMuscleGroups={mainMuscleGroups}
                selectedMuscleFilter={selectedMuscleFilter}
                setSelectedMuscleFilter={setSelectedMuscleFilter}
                userGyms={userGyms}
                selectedGymFilter={selectedGymFilter}
                setSelectedGymFilter={setSelectedGymFilter}
              />

              <SortableExerciseList
                exercises={exercises}
                handleDragEnd={handleDragEnd}
                handleRemoveExerciseClick={handleRemoveExerciseClick}
                handleOpenInfoDialog={handleOpenInfoDialog}
                handleToggleBonusStatus={handleToggleBonusStatus}
              />

              <WorkoutActionButtons
                handleSaveOrder={handleSaveOrder}
                handleResetToDefaults={handleResetToDefaults}
                isSaving={isSaving}
                setShowConfirmResetDialog={setShowConfirmResetDialog}
              />
            </div>
          )}
        </div>
      </DialogContent>

      <LoadingOverlay
        isOpen={isSaving}
        title="Updating Workout"
        description="Please wait while your workout exercises are being saved."
      />

      {selectedExerciseForInfo && (
        <ExerciseInfoDialog
          open={isInfoDialogOpen}
          onOpenChange={setIsInfoDialogOpen}
          exercise={selectedExerciseForInfo}
        />
      )}

      <ConfirmRemoveExerciseDialog
        open={showConfirmRemoveDialog}
        onOpenChange={setShowConfirmRemoveDialog}
        exerciseToRemove={exerciseToRemove}
        onConfirm={confirmRemoveExercise}
      />

      <AddAsBonusDialog
        open={showAddAsBonusDialog}
        onOpenChange={setShowAddAsBonusDialog}
        exerciseToAddDetails={exerciseToAddDetails}
        handleAddExerciseWithBonusStatus={handleAddExerciseWithBonusStatus}
        isSaving={isSaving}
      />

      <ConfirmResetDialog
        open={showConfirmResetDialog}
        onOpenChange={setShowConfirmResetDialog}
        workoutName={workoutName}
        onConfirm={handleResetToDefaults}
      />
    </Dialog>
  );
};