"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/components/session-context-provider";
import { Tables } from '@/types/supabase';
import { toast } from "sonner";
import { Info, Check, Sparkles } from "lucide-react";

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
  const [generatingAi, setGeneratingAi] = useState(false);

  const fetchSubstitutions = async () => {
    if (!session || !open) return;

    setLoading(true);
    try {
      // Fetch all exercises (user-owned and global) that match criteria
      const { data: allMatchingExercises, error: fetchError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite') // Specify all columns required by ExerciseDefinition
        .or(`user_id.eq.${session.user.id},user_id.is.null`) // User's own or global
        .eq('main_muscle', currentExercise.main_muscle)
        .eq('type', currentExercise.type)
        .neq('id', currentExercise.id); // Exclude the current exercise

      if (fetchError) throw fetchError;

      // Filter out global exercises if a user-owned copy already exists
      const userOwnedExerciseIds = new Set(
        allMatchingExercises
          .filter(ex => ex.user_id === session.user.id && ex.library_id)
          .map(ex => ex.library_id)
      );

      const filteredSubstitutions = (allMatchingExercises as ExerciseDefinition[]).filter(ex => { // Explicitly cast
        if (ex.user_id === null && ex.library_id && userOwnedExerciseIds.has(ex.library_id)) {
          return false; // Exclude global if user has an adopted copy
        }
        return true;
      });

      setSubstitutions(filteredSubstitutions || []);
    } catch (err: any) {
      console.error("Failed to fetch substitutions:", err);
      toast.error("Failed to load substitution options: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSubstitutions();
    }
  }, [open, session, supabase, currentExercise]);

  const adoptExercise = async (exercise: ExerciseDefinition): Promise<ExerciseDefinition> => {
    if (exercise.user_id === session?.user.id) {
      return exercise; // Already user-owned
    }

    // Check if user already has an adopted copy of this global exercise
    if (exercise.library_id) {
      const { data: existingAdopted, error: fetchError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite') // Specify all columns required by ExerciseDefinition
        .eq('user_id', session!.user.id)
        .eq('library_id', exercise.library_id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw fetchError;
      }
      if (existingAdopted) {
        return existingAdopted as ExerciseDefinition; // Explicitly cast
      }
    }

    // If not user-owned and no adopted copy exists, create one
    const { data: newAdoptedExercise, error: insertError } = await supabase
      .from('exercise_definitions')
      .insert({
        name: exercise.name,
        main_muscle: exercise.main_muscle,
        type: exercise.type,
        category: exercise.category,
        description: exercise.description,
        pro_tip: exercise.pro_tip,
        video_url: exercise.video_url,
        user_id: session!.user.id,
        library_id: exercise.library_id || null, // Preserve library_id if it exists
        is_favorite: false, // Default to not favourited on adoption
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }
    return newAdoptedExercise;
  };

  const handleSelectSubstitution = async (exercise: ExerciseDefinition) => {
    try {
      const adoptedExercise = await adoptExercise(exercise);
      onSubstitute(adoptedExercise);
      onOpenChange(false);
      toast.success(`Substituted with ${adoptedExercise.name}`);
    } catch (err: any) {
      console.error("Failed to adopt/substitute exercise:", err);
      toast.error("Failed to substitute exercise: " + err.message);
    }
  };

  const handleGenerateAiSuggestion = async () => {
    if (!session) {
      toast.error("You must be logged in to generate AI suggestions.");
      return;
    }
    setGeneratingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-exercise-suggestion', {
        body: {
          main_muscle: currentExercise.main_muscle,
          type: currentExercise.type,
          category: currentExercise.category,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }
      if (data.error) {
        throw new Error(data.error);
      }

      const newAiExercise = data.newExercise;
      if (newAiExercise) {
        // Add the newly generated exercise to the list of substitutions
        setSubstitutions(prev => [...prev, newAiExercise]);
        toast.success("AI generated a new exercise suggestion!");
      } else {
        toast.error("AI did not return a valid exercise.");
      }
    } catch (err: any) {
      console.error("Failed to generate AI suggestion:", err);
      toast.error("Failed to generate AI suggestion: " + err.message);
    } finally {
      setGeneratingAi(false);
    }
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
          ) : substitutions.length === 0 && !generatingAi ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                No suitable alternative exercises found in your library or global defaults.
              </p>
              <Button onClick={handleGenerateAiSuggestion} disabled={generatingAi}>
                <Sparkles className="h-4 w-4 mr-2" />
                {generatingAi ? "Generating..." : "Generate AI Suggestion"}
              </Button>
            </div>
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
              disabled={generatingAi}
            >
              Cancel
            </Button>
            {substitutions.length > 0 && (
              <Button 
                variant="secondary"
                onClick={handleGenerateAiSuggestion}
                disabled={generatingAi}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generatingAi ? "Generating..." : "Generate More"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};