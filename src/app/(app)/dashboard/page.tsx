"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Trophy, Dumbbell, CalendarDays, Plus } from 'lucide-react';
import { WeeklyVolumeChart } from '@/components/dashboard/weekly-volume-chart';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';

type WorkoutTemplate = Tables<'workout_templates'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;
type WorkoutSession = Tables<'workout_sessions'>;
type SetLog = Tables<'set_logs'>;
type ActivityLog = Tables<'activity_logs'>;

type TemplateExerciseJoin = Tables<'template_exercises'> & {
  exercise_definitions: Tables<'exercise_definitions'> | null;
};

type WorkoutTemplateDisplay = WorkoutTemplate & {
  exercises: ExerciseDefinition[];
  lastCompleted: string;
};

type SetLogWithExerciseDefinition = SetLog & {
  exercise_definitions: ExerciseDefinition | null;
};

export default function DashboardPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [myWorkouts, setMyWorkouts] = useState<WorkoutTemplateDisplay[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);

  const [dynamicWeeklyVolume, setDynamicWeeklyVolume] = useState<number>(0);
  const [dynamicPersonalRecords, setDynamicPersonalRecords] = useState<number>(0);
  const [workoutStreak, setWorkoutStreak] = useState<number>(0);
  const [loadingKPIs, setLoadingKPIs] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchDashboardData = async () => {
      setLoadingWorkouts(true);
      setLoadingKPIs(true);
      try {
        const { data: templatesData, error: templatesError } = await supabase
          .from('workout_templates')
          .select(`
            *,
            template_exercises (
              order_index,
              exercise_definitions (
                id, name, main_muscle, type, category, description, pro_tip, video_url
              )
            )
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (templatesError) {
          throw new Error(templatesError.message);
        }

        const { data: sessionsData, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select('template_name, session_date, id')
          .eq('user_id', session.user.id)
          .order('session_date', { ascending: false });

        if (sessionsError) {
          throw new Error(sessionsError.message);
        }

        const lastCompletedMap = new Map<string, string>();
        sessionsData.forEach(session => {
          if (session.template_name && !lastCompletedMap.has(session.template_name)) {
            lastCompletedMap.set(session.template_name, new Date(session.session_date).toLocaleDateString());
          }
        });

        const processedWorkouts: WorkoutTemplateDisplay[] = templatesData.map(template => {
          const exercises = (template.template_exercises as TemplateExerciseJoin[] || [])
            .filter((te: TemplateExerciseJoin) => te.exercise_definitions !== null)
            .map((te: TemplateExerciseJoin) => te.exercise_definitions as ExerciseDefinition)
            .sort((a: ExerciseDefinition, b: ExerciseDefinition) => {
              const orderA = (template.template_exercises as TemplateExerciseJoin[])?.find((te: TemplateExerciseJoin) => te.exercise_definitions?.id === a.id)?.order_index || 0;
              const orderB = (template.template_exercises as TemplateExerciseJoin[])?.find((te: TemplateExerciseJoin) => te.exercise_definitions?.id === b.id)?.order_index || 0;
              return orderA - orderB;
            });

          return {
            ...template,
            exercises: exercises,
            lastCompleted: lastCompletedMap.get(template.template_name || '') || 'Never',
          };
        });

        setMyWorkouts(processedWorkouts);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        let totalWeeklyVolume = 0;
        const recentSessionIds = sessionsData
          .filter(session => new Date(session.session_date) >= sevenDaysAgo)
          .map(session => session.id);

        if (recentSessionIds.length > 0) {
          const { data: recentSetLogs, error: setLogsError } = await supabase
            .from('set_logs')
            .select(`*, exercise_definitions (*)`)
            .in('session_id', recentSessionIds);

          if (setLogsError) {
            console.error("Error fetching recent set logs for volume:", setLogsError.message);
          } else {
            totalWeeklyVolume = (recentSetLogs as SetLogWithExerciseDefinition[]).reduce((sum, log) => {
              const exerciseType = log.exercise_definitions?.type;
              if (exerciseType === 'weight') {
                const weight = log.weight_kg || 0;
                const reps = log.reps || 0;
                return sum + (weight * reps);
              }
              return sum;
            }, 0);
          }
        }
        setDynamicWeeklyVolume(totalWeeklyVolume);

        const { data: prActivityLogs, error: prError } = await supabase
          .from('activity_logs')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('is_pb', true);

        if (prError) {
          console.error("Error fetching PR activity logs:", prError.message);
        } else {
          setDynamicPersonalRecords(prActivityLogs.length);
        }

        let currentWorkoutStreak = 0;
        const { data: allUserSessions, error: allUserSessionsError } = await supabase
          .from('workout_sessions')
          .select('session_date')
          .eq('user_id', session.user.id)
          .order('session_date', { ascending: false });

        if (allUserSessionsError) {
          console.error("Error fetching all sessions for streak:", allUserSessionsError.message);
        } else if (allUserSessions && allUserSessions.length > 0) {
          const uniqueDates = new Set(allUserSessions.map(s => new Date(s.session_date).toISOString().split('T')[0]));
          const sortedUniqueDates = Array.from(uniqueDates).sort();

          let streak = 0;
          let lastDate: Date | null = null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          for (let i = sortedUniqueDates.length - 1; i >= 0; i--) {
            const sessionDate = new Date(sortedUniqueDates[i]);
            sessionDate.setHours(0, 0, 0, 0);

            if (i === sortedUniqueDates.length - 1) {
              const diffFromToday = Math.round(Math.abs(today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
              if (diffFromToday <= 1) {
                streak = 1;
                lastDate = sessionDate;
              } else {
                break;
              }
            } else if (lastDate) {
              const diffDays = Math.round(Math.abs(lastDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays === 1) {
                streak++;
                lastDate = sessionDate;
              } else {
                break;
              }
            }
          }
          currentWorkoutStreak = streak;
        }
        setWorkoutStreak(currentWorkoutStreak);

      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        toast.error(err.message || "Failed to load dashboard data.");
      } finally {
        setLoadingWorkouts(false);
        setLoadingKPIs(false);
      }
    };

    fetchDashboardData();
  }, [session, router, supabase]);

  if (!session) {
    return null;
  }

  const weeklyVolumeChange = 5;

  const upNextWorkout = myWorkouts.length > 0 ? {
    id: myWorkouts[0].id,
    name: myWorkouts[0].template_name,
    exercises: myWorkouts[0].exercises.map(ex => ex.name),
    lastCompleted: myWorkouts[0].lastCompleted,
  } : null;

  const handleStartWorkout = (templateId: string) => {
    router.push(`/workout-session/${templateId}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Welcome back, {session.user?.user_metadata?.first_name || session.user?.email?.split('@')[0] || 'Athlete'}!</h1>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium">Workout Streak</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3">
            {loadingKPIs ? <p className="text-sm text-muted-foreground">Loading...</p> : (
              <>
                <div className="text-xl font-bold">{workoutStreak} Days</div>
                <p className="text-xs text-muted-foreground">Keep it up!</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium">Weekly Volume</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3">
            {loadingKPIs ? <p className="text-sm text-muted-foreground">Loading...</p> : (
              <>
                <div className="text-xl font-bold">{dynamicWeeklyVolume.toLocaleString()} kg</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  {weeklyVolumeChange > 0 ? <ArrowUp className="h-4 w-4 text-green-500 mr-1" /> : <ArrowDown className="h-4 w-4 text-red-500 mr-1" />}
                  {Math.abs(weeklyVolumeChange)}% from last week
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium">Personal Records</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3">
            {loadingKPIs ? <p className="text-sm text-muted-foreground">Loading...</p> : (
              <>
                <div className="text-xl font-bold">{dynamicPersonalRecords} PRs</div>
                <p className="text-xs text-muted-foreground">New milestones achieved!</p>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <WeeklyVolumeChart />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">My Workout Templates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingWorkouts ? <p className="text-muted-foreground">Loading templates...</p> : myWorkouts.length === 0 ? (
            <Card className="sm:col-span-2 lg:col-span-3">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No workout templates found. Create one from the sidebar!</p>
              </CardContent>
            </Card>
          ) : (
            myWorkouts.map((workout) => (
              <Card key={workout.id}>
                <CardHeader>
                  <CardTitle>{workout.template_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2 h-10 overflow-hidden">
                    Exercises: {workout.exercises.map(ex => ex.name).join(', ')}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">Last completed: {workout.lastCompleted}</p>
                  <Button onClick={() => handleStartWorkout(workout.id)} className="w-full">Start Workout</Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <MadeWithDyad />
    </div>
  );
}