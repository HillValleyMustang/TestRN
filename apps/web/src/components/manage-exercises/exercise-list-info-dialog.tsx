"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, PlusCircle, Heart, Home, LayoutTemplate, Edit, Trash2, Filter } from 'lucide-react'; // Added Filter icon
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExerciseListInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'my-exercises' | 'global-library';
}

export const ExerciseListInfoDialog = ({ open, onOpenChange, type }: ExerciseListInfoDialogProps) => {
  const title = type === 'my-exercises' ? "Getting the Most from My Exercises" : "Getting the Most from the Global Library";
  const description = type === 'my-exercises' ?
    "This section displays exercises you've created. Here's how to use it:" : // Corrected text
    "This section contains a comprehensive library of exercises. Here's how to use it:";

  const content = type === 'my-exercises' ? (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-sm mb-1">Add New Exercises:</h4>
        <p className="text-sm text-muted-foreground">
          Use the "Add New Exercise" form at the top to create your own custom exercises.
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-1">Manage Your Exercises:</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li className="flex items-center"><Info className="h-4 w-4 mr-2 flex-shrink-0" /> View detailed information about an exercise.</li>
          <li className="flex items-center"><Heart className="h-4 w-4 mr-2 flex-shrink-0" /> Mark/unmark as a favourite.</li>
          <li className="flex items-center"><PlusCircle className="h-4 w-4 mr-2 flex-shrink-0" /> Add to one of your workout templates (T-Paths).</li>
          <li className="flex items-center"><Home className="h-4 w-4 mr-2 flex-shrink-0" /> Manage which of your gyms this exercise is available in.</li>
          <li className="flex items-center"><Edit className="h-4 w-4 mr-2 flex-shrink-0" /> Edit the exercise details.</li>
          <li className="flex items-center"><Trash2 className="h-4 w-4 mr-2 flex-shrink-0" /> Delete your custom exercise.</li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-1">Filter Exercises:</h4> {/* NEW POINT */}
        <p className="text-sm text-muted-foreground">
          Use the <Filter className="inline-block h-4 w-4 align-text-bottom" /> button at the top to filter exercises by muscle group or gym.
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-1">AI Gym Analysis:</h4>
        <p className="text-sm text-muted-foreground">
          Use the "Analyse Gym Photo" button to upload pictures of your gym. Our AI will identify equipment and suggest exercises you can add to your custom list.
        </p>
      </div>
    </div>
  ) : (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-sm mb-1">Explore Exercises:</h4>
        <p className="text-sm text-muted-foreground">
          Browse a wide range of exercises, including bodyweight, timed, and weight training.
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-1">Utilise Global Exercises:</h4> {/* English spelling */}
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li className="flex items-center"><Info className="h-4 w-4 mr-2 flex-shrink-0" /> View detailed information about an exercise.</li>
          <li className="flex items-center"><Heart className="h-4 w-4 mr-2 flex-shrink-0" /> Mark/unmark as a favourite.</li>
          <li className="flex items-center"><PlusCircle className="h-4 w-4 mr-2 flex-shrink-0" /> Add to one of your workout templates (T-Paths).</li>
          <li className="flex items-center"><Home className="h-4 w-4 mr-2 flex-shrink-0" /> Manage which of your gyms this exercise is available in.</li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-1">Customisation:</h4> {/* English spelling */}
        <p className="text-sm text-muted-foreground">
          You cannot directly edit or delete global exercises. If you want to customise a global exercise, create a new copy in My Exercises using the 'Add New Exercise' feature.
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-1">Filter Exercises:</h4> {/* NEW POINT */}
        <p className="text-sm text-muted-foreground">
          Use the <Filter className="inline-block h-4 w-4 align-text-bottom" /> button at the top to filter exercises by muscle group or gym.
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 mb-2"> {/* Increased line spacing */}
            <Info className="h-5 w-5" /> {title}
          </DialogTitle>
          <DialogDescription className="mb-2">{description}</DialogDescription> {/* Increased line spacing */}
        </DialogHeader>
        <ScrollArea className="flex-grow overflow-y-auto py-4 pr-4">
          {content}
        </ScrollArea>
        <div className="flex justify-center pt-4">
          <Button onClick={() => onOpenChange(false)}>Got It!</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};