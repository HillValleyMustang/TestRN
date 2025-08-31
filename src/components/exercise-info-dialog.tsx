"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, Youtube, Search, Trash2 } from "lucide-react";
import { Tables } from '@/types/supabase';
import { toast } from "sonner";
import { useSession } from "@/components/session-context-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ExerciseInfoDialogProps {
  open?: boolean; // Make open prop optional for controlled/uncontrolled usage
  onOpenChange?: (open: boolean) => void; // Make onOpenChange prop optional
  exercise: ExerciseDefinition;
  trigger?: React.ReactNode;
  exerciseWorkouts?: { id: string; name: string; isUserOwned: boolean }[];
  onRemoveFromWorkout?: (workoutId: string, exerciseId: string) => void;
  onDeleteExercise?: (exercise: ExerciseDefinition) => void;
}

// Helper function to get YouTube embed URL
const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
  const match = url.match(regExp);
  return match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
};

export const ExerciseInfoDialog = ({ open, onOpenChange, exercise, trigger, exerciseWorkouts = [], onRemoveFromWorkout, onDeleteExercise }: ExerciseInfoDialogProps) => {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { session } = useSession();

  // Determine if the dialog is controlled or uncontrolled
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const currentOpen = isControlled ? open : useState(false)[0]; // Use internal state if uncontrolled
  const setCurrentOpen = isControlled ? onOpenChange : useState(false)[1]; // Use internal state if uncontrolled

  const handleGoogleSearch = () => {
    const searchQuery = encodeURIComponent(`${exercise.name} exercise`);
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
  };

  const handleRemoveFromWorkoutClick = async (workoutId: string) => {
    if (!session) {
      toast.error("You must be logged in to remove exercises from workouts.");
      return;
    }
    if (onRemoveFromWorkout) {
      onRemoveFromWorkout(workoutId, exercise.id);
    }
  };

  const handleDeleteExerciseClick = () => {
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteExercise = () => {
    if (onDeleteExercise) {
      onDeleteExercise(exercise);
      setCurrentOpen(false); // Close info dialog after deletion
    }
    setIsDeleteConfirmOpen(false);
  };

  const embedVideoUrl = getYouTubeEmbedUrl(exercise.video_url);
  // Only allow deletion if the exercise is user-created
  const canDeleteExercise = session && exercise.user_id === session.user.id && onDeleteExercise;

  return (
    <Dialog open={currentOpen} onOpenChange={setCurrentOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>} {/* Only render trigger if provided */}
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{exercise.name} Information</DialogTitle>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-6 pb-6 space-y-4">
          {embedVideoUrl && (
            <div className="pb-4">
              <div className="relative w-full rounded-md overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={embedVideoUrl}
                  title={`${exercise.name} video`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-sm mb-1">Main Muscle:</h4>
            <p className="text-sm text-muted-foreground">{exercise.main_muscle}</p>
          </div>
          {exercise.category && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Category:</h4>
              <p className="text-sm text-muted-foreground">{exercise.category}</p>
            </div>
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
                        onClick={() => handleRemoveFromWorkoutClick(workout.id)}
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

          <Button variant="outline" onClick={handleGoogleSearch} className="w-full">
            <Search className="h-4 w-4 mr-2" /> Google Search
          </Button>

          {canDeleteExercise && (
            <Button variant="destructive" onClick={handleDeleteExerciseClick} className="w-full mt-4">
              <Trash2 className="h-4 w-4 mr-2" /> Delete Exercise
            </Button>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the exercise "{exercise.name}" from your custom library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExercise}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};