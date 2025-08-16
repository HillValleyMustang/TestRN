"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Trophy, Dumbbell, CalendarDays, LinkIcon } from 'lucide-react';

export default function DashboardPage() {
  const { session, supabase } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.push('/login');
    }
  }, [session, router]);

  if (!session) {
    return null; // Or a loading spinner while redirecting
  }

  // Placeholder data for KPI and workouts
  const userName = session.user?.user_metadata?.full_name || session.user?.email?.split('@')[0] || 'Athlete';
  const workoutStreak = 7;
  const weeklyVolume = 12500; // kg
  const weeklyVolumeChange = 5; // percentage change
  const personalRecords = 12;

  const upNextWorkout = {
    name: "Full Body Blast",
    exercises: ["Squats", "Bench Press", "Deadlifts"],
    lastCompleted: "2 days ago",
  };

  const myWorkouts = [
    { name: "Upper Body A", lastCompleted: "5 days ago" },
    { name: "Lower Body B", lastCompleted: "3 days ago" },
    { name: "Push Day", lastCompleted: "1 day ago" },
    { name: "Pull Day", lastCompleted: "Never" },
  ];

  const quickLinks = [
    { name: "Log Activity", href: "#", icon: <CalendarDays className="h-4 w-4" /> },
    { name: "Manage Exercises", href: "#", icon: <Dumbbell className="h-4 w-4" /> },
    { name: "My Profile", href: "#", icon: <LinkIcon className="h-4 w-4" /> },
  ];

  const handleStartWorkout = (workoutName: string) => {
    // Implement navigation to workout logging interface
    console.log(`Starting workout: ${workoutName}`);
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
            <h3 className="text-xl font-semibold mb-2">{upNextWorkout.name}</h3>
            <p className="text-muted-foreground mb-4">
              Exercises: {upNextWorkout.exercises.join(', ')}
            </p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Last completed: {upNextWorkout.lastCompleted}</span>
              <Button onClick={() => handleStartWorkout(upNextWorkout.name)}>Start Workout</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            {quickLinks.map((link) => (
              <Button key={link.name} variant="ghost" className="justify-start" asChild>
                <a href={link.href} className="flex items-center">
                  {link.icon}
                  <span className="ml-2">{link.name}</span>
                </a>
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">My Workouts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myWorkouts.map((workout) => (
            <Card key={workout.name}>
              <CardHeader>
                <CardTitle>{workout.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Last completed: {workout.lastCompleted}</p>
                <Button onClick={() => handleStartWorkout(workout.name)} className="w-full">Start Workout</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <MadeWithDyad />
    </div>
  );
}