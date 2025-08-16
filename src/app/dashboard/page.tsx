"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Trophy, Dumbbell, CalendarDays, LinkIcon, LayoutTemplate } from 'lucide-react';
import { ActivityLoggingDialog } from '@/components/activity-logging-dialog';
import { ManageExercisesDialog } from '@/components/manage-exercises-dialog';
import { ManageWorkoutTemplatesDialog } from '@/components/manage-workout-templates-dialog';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';

type WorkoutTemplate = Tables<'workout_templates'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;
type WorkoutSession = Tables<'workout_sessions'>;

// Extend the WorkoutTemplate type to include exercise name and last completed date for display
type WorkoutTemplateDisplay = WorkoutTemplate & {
  exercise_name: string;
  lastCompleted: string;
};

export default function DashboardPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [myWorkouts, setMyWorkouts] = useState<WorkoutTemplateDisplay[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchDashboardData = async () => {
      setLoadingWorkouts(true);
      try {
        // Fetch workout templates with associated exercise details
        const { data: templatesData, error: templatesError } = await supabase
          .from('workout_templates')
          .select('*, exercise_definitions(*)') // Select template data and joined exercise
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (templatesError) {
          throw new Error(templatesError.message);
        }

        // Fetch workout sessions to determine last completed dates
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select('template_name, session_date')
          .eq('user_id', session.user.id)
          .order('session_date', { ascending: false });

        if (sessionsError) {
          throw new Error(sessionsError.message);
        }

        const lastCompletedMap = new Map<string, string>(); // template_name -> last_session_date
        sessionsData.forEach(session => {
          if (session.template_name && !lastCompletedMap.has(session.template_name)) {
            lastCompletedMap.set(session.template_name, new Date(session.session_date).toLocaleDateString());
          }
        });

        const processedWorkouts: WorkoutTemplateDisplay[] = templatesData.map(template => ({
          ...template,
          exercise_name: (template.exercise_definitions as ExerciseDefinition)?.name || 'N/A',
          lastCompleted: lastCompletedMap.get(template.template_name || '') || 'Never',
        }));

        setMyWorkouts(processedWorkouts);

      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        toast.error(err.message || "Failed to load dashboard data.");
      } finally {
        setLoadingWorkouts(false);
      }
    };

    fetchDashboardData();
  }, [session, router, supabase]);

  if (!session) {
    return null; // Or a loading spinner while redirecting
  }

  // Placeholder data for KPI
  const userName = session.user?.user_metadata?.first_name || session.user?.email?.split('@')[0] || 'Athlete';
  const workoutStreak = 7;
  const weeklyVolume = 12500; // kg
  const weeklyVolumeChange = 5; // percentage change
  const personalRecords = 12;

  // For "Up Next" workout, we'll just take the first one from myWorkouts for now
  const upNextWorkout = myWorkouts.length > 0 ? {
    id: myWorkouts[0].id,
    name: myWorkouts[0].template_name,
    exercises: [myWorkouts[0].exercise_name], // Now correctly shows the exercise name
    lastCompleted: myWorkouts[0].lastCompleted,
  } : null;

  const quickLinks = [
    { name: "Log Activity", component: <ActivityLoggingDialog /> },
    { name: "Manage Exercises", component: <ManageExercisesDialog /> },
    { name: "Manage Templates", component: <ManageWorkoutTemplatesDialog /> },
    // Updated the href for My Profile
    { name: "My Profile", href: "/profile", icon: <LinkIcon className="h-4 w-4" /> },
  ];

  const handleStartWorkout = (templateId: string) => {
    router.push(`/workout-session/${templateId}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, {userName}!</h1>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workout Streak</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workoutStreak} Days</div>
            <p className="text-xs text-muted-foreground">Keep it up!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Volume</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyVolume.toLocaleString()} kg</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {weeklyVolumeChange > 0 ? (
                <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              {Math.abs(weeklyVolumeChange)}% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal Records</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personalRecords} PRs</div>
            <p className="text-xs text-muted-foreground">New milestones achieved!</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Up Next</CardTitle>
          </CardHeader>
          <CardContent>
            {upNextWorkout ? (
              <>
                <h3 className="text-xl font-semibold mb-2">{upNextWorkout.name}</h3>
                <p className="text-muted-foreground mb-4">
                  Exercise: {upNextWorkout.exercises.join(', ')}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last completed: {upNextWorkout.lastCompleted}</span>
                  <Button onClick={() => handleStartWorkout(upNextWorkout.id)}>Start Workout</Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No upcoming workout. Create a new template!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            {quickLinks.map((link) => (
              link.href ? (
                <Button key={link.name} variant="ghost" className="justify-start" asChild>
                  <a href={link.href} className="flex items-center">
                    {link.icon}
                    <span className="ml-2">{link.name}</span>
                  </a>
                </Button>
              ) : (
                <div key={link.name}>
                  {link.component}
                </div>
              )
            ))}
            <Button variant="ghost" className="justify-start" onClick={() => router.push('/activity-logs')}>
              <CalendarDays className="h-4 w-4 mr-2" /> View All Activities
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">My Workout Templates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingWorkouts ? (
            <p className="text-muted-foreground">Loading templates...</p>
          ) : myWorkouts.length === 0 ? (
            <p className="text-muted-foreground">No workout templates found. Create one!</p>
          ) : (
            myWorkouts.map((workout) => (
              <Card key={workout.id}>
                <CardHeader>
                  <CardTitle>{workout.template_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">Exercise: {workout.exercise_name}</p>
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