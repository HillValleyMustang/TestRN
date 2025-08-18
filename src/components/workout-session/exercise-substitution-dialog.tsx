"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/components/session-context-provider";
import { Tables } from '@/types/supabase';
import { toast } from "sonner";
import { Info, Check } from "lucide-react";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ExerciseSubstitutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentExercise: ExerciseDefinition;
  onSubstitute: (newExercise: ExerciseDefinition) => void;
}

export const ExerciseSubstitutionDialog = ({ 
  open, 
  onOpenChange, 
  currentExercise, 
  onSubstitute 
}: ExerciseSubstitutionDialogProps) => {
  const { session, supabase } = useSession();
  const [substitutions, setSubstitutions] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubstitutions = async () => {
      if (!session || !open) return;

      setLoading(true);
      try {
        // First, try to find exercises from user's library with same muscle group
        const { data: userExercises, error: userError } = await supabase
          .from('exercise_definitions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('main_muscle', currentExercise.main_muscle)
          .neq('id', currentExercise.id)
          .limit(2);

        if (userError) throw userError;

        // If we don't have 2 substitutions from user's library, get some from global exercises
        let allSubstitutions = userExercises || [];
        if (allSubstitutions.length < 2) {
          const needed = 2 - allSubstitutions.length;
          const { data: globalExercises, error: globalError } = await supabase
            .from('exercise_definitions')
            .select('*')
            .eq('main_muscle', currentExercise.main_muscle)
            .neq('user_id', session.user.id)
            .limit(needed);

          if (globalError) throw globalError;
          
          allSubstitutions = [...allSubstitutions, ...(globalExercises || [])];
        }

        setSubstitutions(allSubstitutions);
      } catch (err: any) {
        console.error("Failed to fetch substitutions:", err);
        toast.error("Failed to load substitution options: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchSubstitutions();
    }
  }, [open, session, supabase, currentExercise]);

  const handleSelectSubstitution = (exercise: ExerciseDefinition) => {
    onSubstitute(exercise);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Substitute Exercise</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Replace <span className="font-semibold">{currentExercise.name}</span> with one of these alternatives:
          </p>
          
          {loading ? (
            <p className="text-center text-muted-foreground">Loading substitutions...</p>
          ) : substitutions.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No substitutions found. You can create a custom exercise.
            </p>
          ) : (
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-3">
                {substitutions.map((exercise) => (
                  <div 
                    key={exercise.id} 
                    className="p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{exercise.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {exercise.main_muscle} • {exercise.type}
                        </p>
                        {exercise.description && (
                          <p className="text-sm mt-1">{exercise.description}</p>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleSelectSubstitution(exercise)}
                      >
                        Select
                      </Button>
                    </div>
                    {exercise.pro_tip && (
                      <div className="mt-2 flex items-start">
                        <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-blue-500">{exercise.pro_tip}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          <div className="mt-4 flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="secondary"
              onClick={() => {
                // TODO: Implement custom exercise creation
                toast.info("Custom exercise creation coming soon!");
              }}
            >
              Create Custom Exercise
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};