"use client";

import React, { useState } from 'react';
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

// Helper function to get YouTube embed URL
const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
  const match = url.match(regExp);
  return match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
};

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

  const embedVideoUrl = getYouTubeEmbedUrl(exercise.video_url);

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
      <DialogContent className="sm:max-w-md p-0"> {/* Adjusted max-width and removed backdrop-blur */}
        <DialogHeader className="p-6 pb-4"> {/* Add padding to header */}
          <DialogTitle>{exercise.name} Information</DialogTitle>
        </DialogHeader>

        {embedVideoUrl && (
          <div className="px-6 pb-4"> {/* Add horizontal padding, some bottom padding */}
            <div className="relative w-full rounded-md overflow-hidden" style={{ paddingBottom: '56.25%' /* 16:9 Aspect Ratio */ }}>
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

        <div className="px-6 pb-6 space-y-4"> {/* Add padding and vertical spacing */}
          {/* Adjusted for consistency */}
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

          <Button variant="outline" onClick={handleGoogleSearch} className="w-full">
            <Search className="h-4 w-4 mr-2" /> Google Search
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};