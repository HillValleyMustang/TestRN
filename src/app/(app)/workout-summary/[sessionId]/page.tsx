"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Tables, SetLogWithExercise } from '@/types/supabase';
import { toast } from 'sonner';
import { WorkoutStatsCard } from '@/components/workout-summary/workout-stats-card';
import { WorkoutRatingCard } from '@/components/workout-summary/workout-rating-card';
import { ExerciseSummaryCard } from '@/components/workout-summary/exercise-summary-card';
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

        (setLogsData as (SetLog & { exercise_definitions: Pick<ExerciseDefinition, 'id' | 'name' | 'main_muscle' | 'type' | 'category'>[] | null })[]).forEach(log => {
          const exerciseDef = (log.exercise_definitions && log.exercise_definitions.length > 0) ? log.exercise_definitions[0] : null;
          if (exerciseDef?.type === 'weight' && log.weight_kg && log.reps) {
            volume += log.weight_kg * log.reps;
          }

          if (log.is_pb) {
            prCount++;
          }
          processedSetLogs.push({ ...log, exercise_definitions: exerciseDef });
        });
        
        setSetLogs(processedSetLogs);
        setTotalVolume(volume);
        setPrsAchieved(prCount);

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
      />

      <WorkoutRatingCard 
        workoutSession={workoutSession} 
        onRatingChange={handleRatingChange} 
        currentRating={currentRating} 
        isRatingSaved={isRatingSaved} 
      />

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