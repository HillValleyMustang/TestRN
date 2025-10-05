"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSession } from "@/components/session-context-provider";
import { Tables, FetchedExerciseDefinition } from '@/types/supabase';
import { ScrollArea } from "@/components/ui/scroll-area";

type Gym = Tables<'gyms'>;

interface ManageExerciseGymsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: FetchedExerciseDefinition;
  userGyms: Tables<'gyms'>[]; // NEW: Receive userGyms as a prop
  initialSelectedGymIds: Set<string>;
  onSaveSuccess: () => void;
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void; // NEW
}

export const ManageExerciseGymsDialog = ({
  open,
  onOpenChange,
  exercise,
  userGyms, // Use the prop
  initialSelectedGymIds,
  onSaveSuccess,
  setTempStatusMessage, // NEW
}: ManageExerciseGymsDialogProps) => {
  const { session, supabase, memoizedSessionUserId } = useSession();
  const [selectedGymIds, setSelectedGymIds] = useState<Set<string>>(initialSelectedGymIds);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedGymIds(initialSelectedGymIds);
  }, [initialSelectedGymIds, open]);

  const handleToggleGym = (gymId: string) => {
    setSelectedGymIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gymId)) {
        newSet.delete(gymId);
      } else {
        newSet.add(gymId);
      }
      return newSet;
    });
  };

  const handleSaveChanges = async () => {
    if (!memoizedSessionUserId || !exercise.id) {
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return;
    }
    setIsSaving(true);

    const gymsToAdd = [...selectedGymIds].filter(id => !initialSelectedGymIds.has(id));
    const gymsToRemove = [...initialSelectedGymIds].filter(id => !selectedGymIds.has(id));

    try {
      if (gymsToRemove.length > 0) {
        const { error } = await supabase
          .from('gym_exercises')
          .delete()
          .eq('exercise_id', exercise.id)
          .in('gym_id', gymsToRemove);
        if (error) throw error;
      }

      if (gymsToAdd.length > 0) {
        const linksToAdd = gymsToAdd.map(gymId => ({
          gym_id: gymId,
          exercise_id: exercise.id!,
        }));
        const { error } = await supabase.from('gym_exercises').insert(linksToAdd);
        if (error) throw error;
      }

      setTempStatusMessage({ message: "Updated!", type: 'success' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      onSaveSuccess(); // This will trigger the refresh in the parent.
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to update gym associations:", err);
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Gyms for "{exercise.name}"</DialogTitle>
          <DialogDescription>
            Select the gyms where this exercise is available.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-64 py-4">
          <div className="space-y-3">
            {userGyms.length === 0 ? (
              <p className="text-muted-foreground text-sm">You haven't created any gyms yet. Go to your profile settings to add one.</p>
            ) : (
              userGyms.map(gym => (
                <div key={gym.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`gym-${gym.id}`}
                    checked={selectedGymIds.has(gym.id)}
                    onCheckedChange={() => handleToggleGym(gym.id)}
                  />
                  <Label htmlFor={`gym-${gym.id}`} className="font-normal">
                    {gym.name}
                  </Label>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveChanges} disabled={isSaving || userGyms.length === 0}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};