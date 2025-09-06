"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tables, SetLogWithExercise, GetLastExerciseSetsForExerciseReturns } from '@/types/supabase';
import { toast } from 'sonner';
import { WorkoutStatsCard } from '@/components/workout-summary/workout-stats-card';
import { WorkoutRatingCard } from '@/components/workout-summary/workout-rating-card';
import { ExerciseSummaryCard } from '@/components/workout-summary/exercise-summary-card';
import { WorkoutVolumeHistoryCard } from '@/components/workout-summary/workout-volume-history-card';
import { AiSessionAnalysisCard } from '@/components/workout-summary/ai-session-analysis-card';
import { ACHIEVEMENT_DISPLAY_INFO } from '@/lib/achievements';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db'; // Import Dexie db

type WorkoutSession = Tables<'workout_sessions'>;
type SetLog = Tables<'set_logs'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

type ExerciseGroup = {
  name: string;
  type: ExerciseDefinition['type'] | undefined;
  category: ExerciseDefinition['category'] | null | undefined;
  sets: SetLogWithExercise[];
  id: string;
};

interface WorkoutSummaryModalProps {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WorkoutSummaryModal = ({ sessionId, open, onOpenChange }: WorkoutSummaryModalProps) => {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null);
  const [setLogs, setSetLogs] = useState<SetLogWithExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalVolume, setTotalVolume] = useState<number>(0);
  const [prsAchieved, setPrsAchieved] = useState<number>(0);
  const [newPrExercises, setNewPrExercises] = useState<string[]>([]);
  const [currentRating, setCurrentRating] = useState<number | null>(null);
  const [isRatingSaved, setIsRatingSaved] = useState(false);
  const [hasShownAchievementToasts, setHasShownAchievementToasts] = useState(false);

  useEffect(() => {
    if (!session || !sessionId || !open) {
      setWorkoutSession(null);
      setSetLogs([]);
      setLoading(true);
      setHasShownAchievementToasts(false);
      if (!sessionId && open) {
        setError("No workout session ID provided for summary.");
        setLoading(false);
      }
      return;
    }

    const fetchWorkoutSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch from local DB first
        const localSession = await db.workout_sessions.get(sessionId);
        if (!localSession) throw new Error("Workout session not found in local database.");
        
        setWorkoutSession(localSession as WorkoutSession);
        setCurrentRating(localSession.rating);
        setIsRatingSaved(localSession.rating !== null);

        const localSetLogs = await db.set_logs.where('session_id').equals(sessionId).toArray();
        const allExerciseDefs = await db.exercise_definitions_cache.toArray();
        const exerciseDefMap = new Map(allExerciseDefs.map(def => [def.id, def]));

        let volume = 0;
        let prCount = 0;
        const processedSetLogs: SetLogWithExercise[] = [];
        const uniqueExerciseIds = new Set<string>();
        const newPrsThisSession = new Set<string>();

        localSetLogs.forEach(log => {
          const exerciseDef = log.exercise_id ? exerciseDefMap.get(log.exercise_id) : null;
          if (exerciseDef?.type === 'weight' && log.weight_kg && log.reps) {
            volume += log.weight_kg * log.reps;
          }
          if (log.is_pb) {
            prCount++;
            if (exerciseDef?.name) newPrsThisSession.add(exerciseDef.name);
          }
          if (exerciseDef?.id) uniqueExerciseIds.add(exerciseDef.id);
          processedSetLogs.push({ ...log, exercise_definitions: exerciseDef || null });
        });
        
        setTotalVolume(volume);
        setPrsAchieved(prCount);
        setNewPrExercises(Array.from(newPrsThisSession));

        // Fetch last sets from Supabase for comparison (this is an enhancement, not core data)
        const lastSetsPromises = Array.from(uniqueExerciseIds).map(async (exerciseId) => {
          const { data: lastExerciseSets, error: rpcError } = await supabase.rpc('get_last_exercise_sets_for_exercise', {
            p_user_id: session.user.id,
            p_exercise_id: exerciseId,
          });
          if (rpcError && rpcError.code !== 'PGRST116') {
            console.error(`Error fetching last sets for exercise ${exerciseId}:`, rpcError);
            return { exerciseId, sets: [] };
          }
          return { exerciseId, sets: lastExerciseSets || [] };
        });

        const lastSetsResults = await Promise.all(lastSetsPromises);
        const lastSetsMap = new Map<string, GetLastExerciseSetsForExerciseReturns>();
        lastSetsResults.forEach(result => lastSetsMap.set(result.exerciseId, result.sets));

        const finalSetLogs = processedSetLogs.map((currentSet, index) => {
          const exerciseId = currentSet.exercise_definitions?.id;
          if (exerciseId) {
            const lastSetsForExercise = lastSetsMap.get(exerciseId);
            const correspondingLastSet = lastSetsForExercise?.[index];
            return {
              ...currentSet,
              last_session_weight_kg: correspondingLastSet?.weight_kg || null,
              last_session_reps: correspondingLastSet?.reps || null,
              last_session_reps_l: correspondingLastSet?.reps_l || null,
              last_session_reps_r: correspondingLastSet?.reps_r || null,
              last_session_time_seconds: correspondingLastSet?.time_seconds || null,
            };
          }
          return currentSet;
        });

        setSetLogs(finalSetLogs);

        // Check for achievements via Supabase function
        if (!hasShownAchievementToasts && session.user.id) {
          const response = await fetch('/api/get-session-achievements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ userId: session.user.id, sessionId: sessionId }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to fetch session achievements.');
          const newlyUnlockedAchievements: string[] = data.newlyUnlockedAchievementIds || [];
          newlyUnlockedAchievements.forEach(achievementId => {
            const displayInfo = ACHIEVEMENT_DISPLAY_INFO[achievementId];
            if (displayInfo) {
              toast.success(`Congrats! Achievement Unlocked: ${displayInfo.name}! ${displayInfo.icon}`);
            }
          });
          setHasShownAchievementToasts(true);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load workout summary. Please try again.");
        toast.error(err.message || "Failed to load workout summary.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutSummary();
  }, [session, sessionId, open, supabase, hasShownAchievementToasts]);

  const handleRatingChange = (rating: number) => {
    setCurrentRating(rating);
    setIsRatingSaved(false);
  };

  const exercisesWithGroupedSets = setLogs
    .filter(log => log.exercise_definitions && log.exercise_definitions.id)
    .reduce((acc, log) => {
      const exerciseId = log.exercise_definitions!.id;
      const exerciseName = log.exercise_definitions!.name || 'Unknown Exercise';
      if (!acc[exerciseId]) {
        acc[exerciseId] = {
          name: exerciseName,
          type: log.exercise_definitions!.type,
          category: log.exercise_definitions!.category,
          sets: [],
          id: exerciseId
        };
      }
      acc[exerciseId].sets.push(log);
      return acc;
    }, {} as Record<string, ExerciseGroup>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>Workout Summary</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-grow overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-4">
            {loading && <p>Loading workout summary...</p>}
            {error && <p className="text-destructive">{error}</p>}
            {!loading && !error && workoutSession && (
              <>
                <WorkoutStatsCard 
                  workoutSession={workoutSession} 
                  totalVolume={totalVolume} 
                  prsAchieved={prsAchieved} 
                  newPrExercises={newPrExercises}
                />
                {workoutSession.template_name && workoutSession.template_name !== 'Ad Hoc Workout' && (
                  <WorkoutVolumeHistoryCard
                    workoutTemplateName={workoutSession.template_name}
                    currentSessionId={sessionId!}
                  />
                )}
                <WorkoutRatingCard 
                  workoutSession={workoutSession} 
                  onRatingChange={handleRatingChange} 
                  currentRating={currentRating} 
                  isRatingSaved={isRatingSaved} 
                />
                <AiSessionAnalysisCard sessionId={sessionId!} />
                <section>
                  <h2 className="text-xl font-bold mb-4">Exercises Performed</h2>
                  {Object.values(exercisesWithGroupedSets).length === 0 ? (
                    <p className="text-muted-foreground">No exercises logged for this session.</p>
                  ) : (
                    (Object.values(exercisesWithGroupedSets) as ExerciseGroup[]).map((exerciseGroup: ExerciseGroup) => (
                      <ExerciseSummaryCard 
                        key={exerciseGroup.name} 
                        exerciseGroup={exerciseGroup} 
                        currentSessionId={sessionId!}
                      />
                    ))
                  )}
                </section>
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="p-4 sm:p-6 pt-4 border-t flex-shrink-0">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};