"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/components/session-context-provider";
import { Tables } from '@/types/supabase';
import { toast } from "sonner";
import { Info, Check, Sparkles } from "lucide-react";
import { LoadingOverlay } from '../loading-overlay';
import { Badge } from "@/components/ui/badge";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ExerciseSubstitutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentExercise: ExerciseDefinition;
  onSubstitute: (newExercise: ExerciseDefinition) => void;
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void; // NEW
}

// Helper function to get YouTube embed URL
const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
  const match = url.match(regExp);
  return match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
};

export const ExerciseSubstitutionDialog = ({
  open,
  onOpenChange,
  currentExercise,
  onSubstitute,
  setTempStatusMessage, // NEW
}: ExerciseSubstitutionDialogProps) => {
  const { session, supabase } = useSession();
  const [substitutions, setSubstitutions] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiGenerationCount, setAiGenerationCount] = useState(0);
  const [newlyGeneratedExerciseIds, setNewlyGeneratedExerciseIds] = useState<Set<string>>(new Set());

  const fetchSubstitutions = async () => {
    if (!session || !open) return;

    setLoading(true);
    try {
      const { data: allMatchingExercises, error: fetchError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite, icon_url')
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .eq('main_muscle', currentExercise.main_muscle)
        .eq('type', currentExercise.type)
        .neq('id', currentExercise.id);

      if (fetchError) throw fetchError;

      // Filter out global exercises if a user-owned copy already exists
      const userOwnedExerciseLibraryIds = new Set(
        allMatchingExercises
          .filter(ex => ex.user_id === session.user.id && ex.library_id)
          .map(ex => ex.library_id)
      );

      const filteredSubstitutions = (allMatchingExercises as ExerciseDefinition[]).filter(ex => {
        if (ex.user_id === null && ex.library_id && userOwnedExerciseLibraryIds.has(ex.library_id)) {
          return false;
        }
        return true;
      });

      setSubstitutions(filteredSubstitutions || []);
    } catch (err: any) {
      console.error("Failed to fetch substitutions:", err);
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSubstitutions();
      setAiGenerationCount(0);
      setNewlyGeneratedExerciseIds(new Set());
    }
  }, [open, session, supabase, currentExercise, setTempStatusMessage]);

  const handleSelectSubstitution = async (exercise: ExerciseDefinition) => {
    try {
      onSubstitute(exercise);
      onOpenChange(false);
      setTempStatusMessage({ message: "Swapped!", type: 'success' });
      setTimeout(() => setTempStatusMessage(null), 3000);
    } catch (err: any) {
      console.error("Failed to substitute exercise:", err);
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
    }
  };

  const handleGenerateAiSuggestion = async () => {
    if (!session) {
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return;
    }
    if (aiGenerationCount >= 2) {
      setTempStatusMessage({ message: "Max 2 suggestions!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return;
    }

    setGeneratingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-exercise-suggestion', {
        body: {
          main_muscle: currentExercise.main_muscle,
          type: currentExercise.type,
          category: currentExercise.category,
          saveScope: 'user', // Save as a user-owned exercise
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        setTempStatusMessage({ message: "Error!", type: 'error' });
        setTimeout(() => setTempStatusMessage(null), 3000);
        return;
      }

      const newAiExercise = data.newExercise;
      if (newAiExercise) {
        setSubstitutions(prev => [...prev, newAiExercise]);
        setTempStatusMessage({ message: "Suggested!", type: 'success' });
        setTimeout(() => setTempStatusMessage(null), 3000);
        setNewlyGeneratedExerciseIds(prev => new Set(prev).add(newAiExercise.id));
        setAiGenerationCount(prev => prev + 1);
      } else {
        setTempStatusMessage({ message: "Error!", type: 'error' });
        setTimeout(() => setTempStatusMessage(null), 3000);
      }
    } catch (err: any) {
      console.error("Failed to generate AI suggestion:", err);
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
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
                {substitutions.map((exercise) => {
                  const embedVideoUrl = getYouTubeEmbedUrl(exercise.video_url);
                  return (
                    <div
                      key={exercise.id}
                      className="p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{exercise.name}</h3>
                            {newlyGeneratedExerciseIds.has(exercise.id) && (
                              <Badge variant="secondary">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {exercise.main_muscle} • {exercise.type}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSelectSubstitution(exercise)}
                          className="flex-shrink-0"
                        >
                          Select
                        </Button>
                      </div>
                      {exercise.description && (
                        <p className="text-sm mt-2">{exercise.description}</p>
                      )}
                      {embedVideoUrl ? (
                        <div className="mt-2">
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
                      ) : exercise.pro_tip && (
                        <div className="mt-2 flex items-start">
                          <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
                          <span className="text-sm text-blue-500">{exercise.pro_tip}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                disabled={generatingAi || aiGenerationCount >= 2}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generatingAi ? "Generating..." : "Generate More"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
      <LoadingOverlay
        isOpen={generatingAi}
        title="Generating AI Suggestion"
        description="Please wait while the AI suggests a new exercise."
      />
    </Dialog>
  );
};