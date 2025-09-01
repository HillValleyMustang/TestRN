"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Tables, SetLogWithExercise, GetLastExerciseSetsForExerciseReturns } from '@/types/supabase';
import { toast } from 'sonner';
import { WorkoutStatsCard } from '@/components/workout-summary/workout-stats-card';
import { WorkoutRatingCard } from '@/components/workout-summary/workout-rating-card';
import { ExerciseSummaryCard } from '@/components/workout-summary/exercise-summary-card';
import { WorkoutVolumeHistoryCard } from '@/components/workout-summary/workout-volume-history-card'; // Import new component
import { AiSessionAnalysisCard } from '@/components/workout-summary/ai-session-analysis-card'; // Import new component
import { getLevelFromPoints } from '@/lib/utils';
import { ACHIEVEMENT_DISPLAY_INFO } from '@/lib/achievements'; // Import from new utility file
// Removed: import { type PageProps } from 'next'; // Import PageProps from next

type WorkoutSession = Tables<'workout_sessions'>;
type SetLog = Tables<'set_logs'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

// Define a type for the grouped exercise data
type ExerciseGroup = {
  name: string;
  type: ExerciseDefinition['type'] | undefined;
  category: ExerciseDefinition['category'] | null | undefined;
  sets: SetLogWithExercise[];
  id: string;
};

// Define the props interface explicitly (kept for reference, but not directly used in function signature)
interface WorkoutSummaryPageProps {
  params: { sessionId: string }; 
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function WorkoutSummaryPage({ 
  params, 
  searchParams 
}: any) { // Changed to 'any' to bypass Next.js internal type validation
  const { session, supabase } = useSession();
  const router = useRouter();
  // Safely cast params to its expected object type for runtime use
  const { sessionId } = params as { sessionId: string };

  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null);
  const [setLogs, setSetLogs] = useState<SetLogWithExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalVolume, setTotalVolume] = useState<number>(0);
  const [prsAchieved, setPrsAchieved] = useState<number>(0);
  const [newPrExercises, setNewPrExercises] = useState<string[]>([]); // New state for PR highlights
  const [currentRating, setCurrentRating] = useState<number | null>(null);
  const [isRatingSaved, setIsRatingSaved] = useState(false);
  const [hasShownAchievementToasts, setHasShownAchievementToasts] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchWorkoutSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch workout session details
        const { data: sessionData, error: sessionError } = await supabase
          .from('workout_sessions')
          .select('id, template_name, duration_string, session_date, rating, created_at, user_id')
          .eq('id', sessionId)
          .eq('user_id', session.user.id)
          .single();

        if (sessionError || !sessionData) {
          throw new Error(sessionError?.message || "Workout session not found.");
        }
        setWorkoutSession(sessionData as WorkoutSession);
        setCurrentRating(sessionData.rating);
        setIsRatingSaved(sessionData.rating !== null);

        // Fetch all set logs for this session, joining with exercise definitions
        const { data: setLogsData, error: setLogsError } = await supabase
          .from('set_logs')
          .select(`
            id, exercise_id, weight_kg, reps, reps_l, reps_r, time_seconds, is_pb, created_at, session_id,
            exercise_definitions (
              id, name, main_muscle, type, category
            )
          `)
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (setLogsError) {
          throw new Error(setLogsError.message);
        }

        let volume = 0;
        let prCount = 0;
        const processedSetLogs: SetLogWithExercise[] = [];
        const uniqueExerciseIds = new Set<string>();
        const newPrsThisSession = new Set<string>(); // To collect new PR exercise names

        // First pass: calculate volume, PRs, and collect unique exercise IDs
        (setLogsData as (SetLog & { exercise_definitions: Pick<ExerciseDefinition, 'id' | 'name' | 'main_muscle' | 'type' | 'category'>[] | null })[]).forEach(log => {
          const exerciseDef = (log.exercise_definitions && log.exercise_definitions.length > 0) ? log.exercise_definitions[0] : null;
          if (exerciseDef?.type === 'weight' && log.weight_kg && log.reps) {
            volume += log.weight_kg * log.reps;
          }

          if (log.is_pb) {
            prCount++;
            if (exerciseDef?.name) {
              newPrsThisSession.add(exerciseDef.name);
            }
          }
          if (exerciseDef?.id) {
            uniqueExerciseIds.add(exerciseDef.id);
          }
          processedSetLogs.push({ ...log, exercise_definitions: exerciseDef });
        });
        
        setTotalVolume(volume);
        setPrsAchieved(prCount);
        setNewPrExercises(Array.from(newPrsThisSession));

        // Second pass: Fetch last session's data for each unique exercise
        const lastSetsPromises = Array.from(uniqueExerciseIds).map(async (exerciseId) => {
          const { data: lastExerciseSets, error: rpcError } = await supabase.rpc('get_last_exercise_sets_for_exercise', {
            p_user_id: session.user.id,
            p_exercise_id: exerciseId,
          });
          if (rpcError && rpcError.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error(`Error fetching last sets for exercise ${exerciseId}:`, rpcError);
            return { exerciseId, sets: [] };
          }
          return { exerciseId, sets: lastExerciseSets || [] };
        });

        const lastSetsResults = await Promise.all(lastSetsPromises);
        const lastSetsMap = new Map<string, GetLastExerciseSetsForExerciseReturns>();
        lastSetsResults.forEach(result => lastSetsMap.set(result.exerciseId, result.sets));

        // Third pass: Enrich processedSetLogs with last session's data
        const finalSetLogs = processedSetLogs.map((currentSet, index) => {
          const exerciseId = currentSet.exercise_definitions?.id;
          if (exerciseId) {
            const lastSetsForExercise = lastSetsMap.get(exerciseId);
            const correspondingLastSet = lastSetsForExercise?.[index]; // Match by index (set number)

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

        // Fetch newly unlocked achievements for this session
        if (!hasShownAchievementToasts && session.user.id) {
          const response = await fetch('/api/get-session-achievements', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ userId: session.user.id, sessionId: sessionId }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch session achievements.');
          }

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
        console.error("Failed to fetch workout summary or achievements:", err);
        setError(err.message || "Failed to load workout summary. Please try again.");
        toast.error(err.message || "Failed to load workout summary.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutSummary();
  }, [session, router, sessionId, supabase, hasShownAchievementToasts]);

  const handleRatingChange = (rating: number) => {
    setCurrentRating(rating);
    setIsRatingSaved(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading workout summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  if (!workoutSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Workout session not found.</p>
      </div>
    );
  }

  // Group set logs by exercise
  const exercisesWithGroupedSets = setLogs.reduce((acc, log) => {
    const exerciseName = log.exercise_definitions?.name || 'Unknown Exercise';
    const exerciseId = log.exercise_definitions?.id || 'unknown';
    if (!acc[exerciseId]) {
      acc[exerciseId] = {
        name: exerciseName,
        type: log.exercise_definitions?.type,
        category: log.exercise_definitions?.category,
        sets: [],
        id: exerciseId
      };
    }
    acc[exerciseId].sets.push(log);
    return acc;
  }, {} as Record<string, ExerciseGroup>);

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Workout Summary</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </header>

      <WorkoutStatsCard 
        workoutSession={workoutSession} 
        totalVolume={totalVolume} 
        prsAchieved={prsAchieved} 
        newPrExercises={newPrExercises} // Pass new PR exercises
      />

      {workoutSession.template_name && workoutSession.template_name !== 'Ad Hoc Workout' && (
        <WorkoutVolumeHistoryCard
          workoutTemplateName={workoutSession.template_name}
          currentSessionId={sessionId}
        />
      )}

      <WorkoutRatingCard 
        workoutSession={workoutSession} 
        onRatingChange={handleRatingChange} 
        currentRating={currentRating} 
        isRatingSaved={isRatingSaved} 
      />

      <AiSessionAnalysisCard sessionId={sessionId} /> {/* Integrate the new AI analysis card */}

      <section className="mb-8">
        <h2 className="2xl font-bold mb-4">Exercises Performed</h2>
        {Object.values(exercisesWithGroupedSets).length === 0 ? (
          <p className="text-muted-foreground">No exercises logged for this session.</p>
        ) : (
          (Object.values(exercisesWithGroupedSets) as ExerciseGroup[]).map((exerciseGroup: ExerciseGroup) => (
            <ExerciseSummaryCard 
              key={exerciseGroup.name} 
              exerciseGroup={exerciseGroup} 
              currentSessionId={sessionId}
            />
          ))
        )}
      </section>
    </div>
  );
}