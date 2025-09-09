"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Button } from '@/components/ui/button';
import { Tables, SetLogWithExercise } from '@/types/supabase';
import { toast } from 'sonner';
import { WorkoutStatsCard } from '@/components/workout-summary/workout-stats-card';
import { WorkoutRatingCard } from '@/components/workout-summary/workout-rating-card';
import { WorkoutVolumeHistoryCard } from '@/components/workout-summary/workout-volume-history-card';
import { AiSessionAnalysisCard } from '@/components/workout-summary/ai-session-analysis-card';
import { ACHIEVEMENT_DISPLAY_INFO } from '@/lib/achievements';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Trophy } from 'lucide-react';
import { db, LocalWorkoutSession, LocalSetLog, LocalExerciseDefinition } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatWeight, formatTime } from '@/lib/unit-conversions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type WorkoutSession = Tables<'workout_sessions'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

type ExerciseGroup = {
  name: string;
  type: ExerciseDefinition['type'] | undefined;
  category: ExerciseDefinition['category'] | null | undefined;
  sets: SetLogWithExercise[];
  id: string;
};

interface WorkoutSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
}

export const WorkoutSummaryModal = ({ open, onOpenChange, sessionId }: WorkoutSummaryModalProps) => {
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
      setHasShownAchievementToasts(false); // Reset this state when modal closes or session/ID changes
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
          
          // Explicitly pick properties for exercise_definitions to match SetLogWithExercise type
          processedSetLogs.push({ 
            ...log, 
            exercise_definitions: exerciseDef ? { 
              id: exerciseDef.id, 
              name: exerciseDef.name, 
              main_muscle: exerciseDef.main_muscle, 
              type: exerciseDef.type, 
              category: exerciseDef.category 
            } : null 
          });
        });
        
        setTotalVolume(volume);
        setPrsAchieved(prCount);
        setNewPrExercises(Array.from(newPrsThisSession));
        setSetLogs(processedSetLogs);

        // Only show achievement toasts if they haven't been shown for this session yet
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
          setHasShownAchievementToasts(true); // Mark as shown
        }
      } catch (err: any) {
        setError(err.message || "Failed to load workout summary. Please try again.");
        toast.error(err.message || "Failed to load workout summary.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutSummary();
  }, [session, sessionId, supabase, hasShownAchievementToasts, open]); // Added 'open' to dependencies to re-trigger on modal open

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

  const getBestSetString = (exerciseGroup: ExerciseGroup): string => {
    if (exerciseGroup.sets.length === 0) return '-';
    if (exerciseGroup.type === 'timed') {
      const bestSet = Math.max(...exerciseGroup.sets.map(s => s.time_seconds || 0));
      return formatTime(bestSet);
    } else {
      const bestSet = exerciseGroup.sets.reduce((best, current) => {
        const currentVolume = (current.weight_kg || 0) * (current.reps || 0);
        const bestVolume = (best.weight_kg || 0) * (best.reps || 0);
        return currentVolume > bestVolume ? current : best;
      });
      return `${formatWeight(bestSet.weight_kg, 'kg')} x ${bestSet.reps}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">Workout Summary</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-grow overflow-y-auto px-6 pb-6">
          <div className="space-y-6">
            {loading && <p>Loading workout summary...</p>}
            {error && <p className="text-destructive">{error}</p>}
            {!loading && !error && workoutSession && (
              <>
                <WorkoutStatsCard 
                  workoutSession={workoutSession} 
                  totalVolume={totalVolume} 
                  prsAchieved={prsAchieved} 
                  newPrExercises={newPrExercises}
                  exercisesPerformed={Object.keys(exercisesWithGroupedSets).length}
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Exercises Performed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.values(exercisesWithGroupedSets).length === 0 ? (
                      <p className="text-muted-foreground">No exercises logged for this session.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Exercise</TableHead>
                            <TableHead className="text-center">Sets</TableHead>
                            <TableHead>Best Set</TableHead>
                            <TableHead className="text-center">PB</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.values(exercisesWithGroupedSets).map((group) => (
                            <TableRow key={group.id}>
                              <TableCell className="font-medium">{group.name}</TableCell>
                              <TableCell className="text-center">{group.sets.length}</TableCell>
                              <TableCell>{getBestSetString(group)}</TableCell>
                              <TableCell className="text-center">
                                {group.sets.some(s => s.is_pb) ? <Trophy className="h-4 w-4 text-yellow-500 mx-auto" /> : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};