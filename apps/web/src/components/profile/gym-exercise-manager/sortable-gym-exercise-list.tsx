"use client";

import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkoutExerciseWithDetails } from '../gym-exercise-manager';
import { SortableGymExerciseItem } from './sortable-gym-exercise-item';
import { cn } from '@/lib/utils';

interface SortableGymExerciseListProps {
  id: string; // Unique ID for this sortable list (e.g., 'core-exercises', 'bonus-exercises')
  title: string;
  exercises: WorkoutExerciseWithDetails[];
  onDragEnd: (event: DragEndEvent) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onOpenInfoDialog: (exercise: WorkoutExerciseWithDetails) => void;
  emptyMessage: string;
  className?: string;
}

export const SortableGymExerciseList = ({
  id,
  title,
  exercises,
  onDragEnd,
  onRemoveExercise,
  onOpenInfoDialog,
  emptyMessage,
  className,
}: SortableGymExerciseListProps) => {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-lg font-semibold text-muted-foreground">{title}</h3>
      <ScrollArea className="h-auto max-h-[250px] border rounded-md p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext id={id} items={exercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1">
              {exercises.length === 0 ? (
                <p className="text-muted-foreground text-center p-4 text-sm">{emptyMessage}</p>
              ) : (
                exercises.map(exercise => (
                  <SortableGymExerciseItem
                    key={exercise.id}
                    exercise={exercise}
                    onRemove={onRemoveExercise}
                    onOpenInfo={onOpenInfoDialog}
                  />
                ))
              )}
            </ul>
          </SortableContext>
        </DndContext>
      </ScrollArea>
    </div>
  );
};