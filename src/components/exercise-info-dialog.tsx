"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, Youtube } from "lucide-react";
import { Tables } from '@/types/supabase';

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ExerciseInfoDialogProps {
  exercise: ExerciseDefinition;
}

export const ExerciseInfoDialog = ({ exercise }: ExerciseInfoDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Info">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
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
          {exercise.video_url && (
            <Button asChild variant="outline" className="mt-2">
              <a href={exercise.video_url} target="_blank" rel="noopener noreferrer">
                <Youtube className="h-4 w-4 mr-2" /> Watch Video
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};