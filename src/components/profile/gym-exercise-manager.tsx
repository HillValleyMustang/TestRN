"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { ExerciseTransferUI } from './exercise-transfer-ui';
import { LoadingOverlay } from '../loading-overlay';

type Gym = Tables<'gyms'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface GymExerciseManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gym: Gym | null;
  onSaveSuccess: () => void;
}

export const GymExerciseManager = ({ open, onOpenChange, gym, onSaveSuccess }: GymExerciseManagerProps) => {
  const { session, supabase } = useSession();
  const [allExercises, setAllExercises] = useState<ExerciseDefinition[]>([]);
  const [initialExerciseIdsInGym, setInitialExerciseIdsInGym] = useState<Set<string>>(new Set());
  const [currentExerciseIdsInGym, setCurrentExerciseIdsInGym] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    if (!session || !gym) return;
    setLoading(true);
    try {
      const [allExRes, gymExRes] = await Promise.all([
        supabase.from('exercise_definitions').select('*').or(`user_id.eq.${session.user.id},user_id.is.null`),
        supabase.from('gym_exercises').select('exercise_id').eq('gym_id', gym.id)
      ]);

      if (allExRes.error) throw allExRes.error;
      if (gymExRes.error) throw gymExRes.error;

      const allExercisesData = (allExRes.data as ExerciseDefinition[]) || [];
      setAllExercises(allExercisesData);
      setMuscleGroups(Array.from(new Set(allExercisesData.map(ex => ex.main_muscle))).sort());

      const exerciseIdsInGym = new Set((gymExRes.data || []).map(link => link.exercise_id));
      setInitialExerciseIdsInGym(exerciseIdsInGym);
      setCurrentExerciseIdsInGym(exerciseIdsInGym);
    } catch (err: any) {
      toast.error("Failed to load exercise data.");
    } finally {
      setLoading(false);
    }
  }, [session, supabase, gym]);

  useEffect(() => {
    if (open) {
      fetchData();
    } else {
      setSearchTerm("");
      setMuscleFilter("all");
    }
  }, [open, fetchData]);

  const { availableExercises, exercisesInGym } = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const available = allExercises
      .filter(ex => !currentExerciseIdsInGym.has(ex.id))
      .filter(ex => muscleFilter === 'all' || ex.main_muscle === muscleFilter)
      .filter(ex => ex.name.toLowerCase().includes(lowerCaseSearchTerm));
    
    const inGym = allExercises
      .filter(ex => currentExerciseIdsInGym.has(ex.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { availableExercises: available, exercisesInGym: inGym };
  }, [allExercises, currentExerciseIdsInGym, searchTerm, muscleFilter]);

  const handleAddExercise = (exerciseId: string) => {
    setCurrentExerciseIdsInGym(prev => new Set(prev).add(exerciseId));
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setCurrentExerciseIdsInGym(prev => {
      const newSet = new Set(prev);
      newSet.delete(exerciseId);
      return newSet;
    });
  };

  const handleSaveChanges = async () => {
    if (!session || !gym) return;
    setIsSaving(true);

    const exercisesToAdd = [...currentExerciseIdsInGym].filter(id => !initialExerciseIdsInGym.has(id));
    const exercisesToRemove = [...initialExerciseIdsInGym].filter(id => !currentExerciseIdsInGym.has(id));

    try {
      if (exercisesToRemove.length > 0) {
        const { error } = await supabase.from('gym_exercises').delete().eq('gym_id', gym.id).in('exercise_id', exercisesToRemove);
        if (error) throw error;
      }
      if (exercisesToAdd.length > 0) {
        const linksToAdd = exercisesToAdd.map(exId => ({ gym_id: gym.id, exercise_id: exId }));
        const { error } = await supabase.from('gym_exercises').insert(linksToAdd);
        if (error) throw error;
      }
      toast.success(`Successfully updated exercises for "${gym.name}"`);
      onSaveSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Exercises for "{gym?.name}"</DialogTitle>
            <DialogDescription>Add or remove exercises available at this gym.</DialogDescription>
          </DialogHeader>
          <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              placeholder="Search available exercises..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select onValueChange={setMuscleFilter} value={muscleFilter}>
              <SelectTrigger><SelectValue placeholder="Filter by muscle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Muscle Groups</SelectItem>
                {muscleGroups.map(muscle => <SelectItem key={muscle} value={muscle}>{muscle}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-grow overflow-hidden">
            {loading ? (
              <p className="text-muted-foreground text-center">Loading...</p>
            ) : (
              <ExerciseTransferUI
                availableExercises={availableExercises}
                exercisesInGym={exercisesInGym}
                onAdd={handleAddExercise}
                onRemove={handleRemoveExercise}
              />
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <LoadingOverlay isOpen={isSaving} title="Saving Changes" />
    </>
  );
};