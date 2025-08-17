"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Trophy, Dumbbell } from 'lucide-react';
import { WeeklyVolumeChart } from '@/components/dashboard/weekly-volume-chart';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';

type WorkoutTemplate = Tables<'workout_templates'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;
type WorkoutSession = Tables<'workout_sessions'>;
type SetLog = Tables<'set_logs'>;

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

  const [athleteInitials, setAthleteInitials] = useState<string>('');
  const [weeklyVolume, setWeeklyVolume] = useState<number>(0);
  const [weeklyPRs, setWeeklyPRs] = useState<number>(0);
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
        // Fetch profile for initials
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', session.user.id)
          .single();
        
        const firstName = profileData?.first_name;
        const lastName = profileData?.last_name;
        const userInitials = `${firstName ? firstName[0] : ''}${lastName ? lastName[0] : ''}`.toUpperCase();
        setAthleteInitials(userInitials || session.user?.email?.[0].toUpperCase() || 'X');

        // Fetch workout templates
        const { data: templatesData, error: templatesError } = await supabase
          .from('workout_templates')
          .select(`*, template_exercises (*, exercise_definitions (*))`)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (templatesError) throw new Error(templatesError.message);

        // Fetch all sessions for last completed date and KPIs
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select('template_name, session_date, id')
          .eq('user_id', session.user.id)
          .order('session_date', { ascending: false });

        if (sessionsError) throw new Error(sessionsError.message);

        const lastCompletedMap = new Map<string, string>();
        sessionsData.forEach(session => {
          if (session.template_name && !lastCompletedMap.has(session.template_name)) {
            lastCompletedMap.set(session.template_name, new Date(session.session_date).toLocaleDateString());
          }
        });

        const processedWorkouts: WorkoutTemplateDisplay[] = templatesData.map(template => ({
          ...template,
          exercises: (template.template_exercises as any[] || [])
            .map(te => te.exercise_definitions)
            .filter(Boolean),
          lastCompleted: lastCompletedMap.get(template.template_name) || 'Never',
        }));
        setMyWorkouts(processedWorkouts);

        // Calculate KPIs for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recentSessionIds = sessionsData
          .filter(session => new Date(session.session_date) >= sevenDaysAgo)
          .map(session => session.id);

        let totalWeeklyVolume = 0;
        if (recentSessionIds.length > 0) {
          const { data: recentSetLogs, error: setLogsError } = await supabase
            .from('set_logs')
            .select(`*, exercise_definitions (type)`)
            .in('session_id', recentSessionIds);

          if (setLogsError) console.error("Error fetching recent set logs:", setLogsError.message);
          else {
            totalWeeklyVolume = (recentSetLogs as SetLogWithExerciseDefinition[]).reduce((sum, log) => {
              if (log.exercise_definitions?.type === 'weight') {
                return sum + ((log.weight_kg || 0) * (log.reps || 0));
              }
              return sum;
            }, 0);
          }
        }
        setWeeklyVolume(totalWeeklyVolume);

        let workoutPRs = 0;
        if (recentSessionIds.length > 0) {
            const { count } = await supabase
                .from('set_logs')
                .select('id', { count: 'exact', head: true })
                .in('session_id', recentSessionIds)
                .eq('is_pb', true);
            workoutPRs = count || 0;
        }

        const { count: activityPRs } = await supabase
            .from('activity_logs')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('is_pb', true)
            .gte('log_date', sevenDaysAgo.toISOString());

        setWeeklyPRs(workoutPRs + (activityPRs || 0));

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

  const weeklyVolumeChange = 5; // Placeholder for change calculation

  const handleStartWorkout = (templateId: string) => {
    router.push(`/workout-session/${templateId}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Welcome Back, Athlete {athleteInitials}</h1>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium">Weekly Volume</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3">
            {loadingKPIs ? <p className="text-sm text-muted-foreground">Loading...</p> : (
              <>
                <div className="text-xl font-bold">{weeklyVolume.toLocaleString()} kg</div>
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
            <CardTitle className="text-sm font-medium">Weekly PR's</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3">
            {loadingKPIs ? <p className="text-sm text-muted-foreground">Loading...</p> : (
              <>
                <div className="text-xl font-bold">{weeklyPRs} PRs</div>
                <p className="text-xs text-muted-foreground">New milestones this week!</p>
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