"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, Youtube, Search, Trash2 } from "lucide-react";
import { Tables } from '@/types/supabase';
import { toast } from "sonner";
import { useSession } from "@/components/session-context-provider";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ExerciseInfoDialogProps {
  exercise: ExerciseDefinition;
  trigger?: React.ReactNode;
  exerciseWorkouts?: { id: string; name: string; isUserOwned: boolean }[]; // New prop
  onRemoveFromWorkout?: (workoutId: string, exerciseId: string) => void; // New prop
}

export const ExerciseInfoDialog = ({ exercise, trigger, exerciseWorkouts = [], onRemoveFromWorkout }: ExerciseInfoDialogProps) => {
  const [open, setOpen] = useState(false);
  const { session } = useSession();

  const handleGoogleSearch = () => {
    const searchQuery = encodeURIComponent(`${exercise.name} exercise`);
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
  };

  const handleRemove = async (workoutId: string) => {
    if (!session) {
      toast.error("You must be logged in to remove exercises from workouts.");
      return;
    }
    if (onRemoveFromWorkout) {
      onRemoveFromWorkout(workoutId, exercise.id);
      setOpen(false); // Close dialog after removal attempt
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" title="Info">
            <Info className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{exercise.name} Information</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">Main Muscle:</span> {exercise.main_muscle}
          </p>
          {exercise.category && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold">Category:</span> {exercise.category}
            </p>
          )}
          {exercise.description && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Description:</h4>
              <p className="text-sm text-muted-foreground">{exercise.description}</p>
            </div>
          )}
          {exercise.pro_tip && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Pro Tip:</h4>
              <p className="text-sm text-muted-foreground">{exercise.pro_tip}</p>
            </div>
          )}

          {exerciseWorkouts.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Included in Workouts:</h4>
              <ul className="space-y-1">
                {exerciseWorkouts.map(workout => (
                  <li key={workout.id} className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{workout.name}</span>
                    {workout.isUserOwned && onRemoveFromWorkout && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemove(workout.id)}
                        className="h-auto p-1 text-destructive hover:text-destructive"
                        title={`Remove from ${workout.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {exercise.video_url && (
            <Button asChild variant="outline" className="mt-2">
              <a href={exercise.video_url} target="_blank" rel="noopener noreferrer">
                <Youtube className="h-4 w-4 mr-2" /> Watch Video
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={handleGoogleSearch} className="mt-2">
            <Search className="h-4 w-4 mr-2" /> Google Search
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};