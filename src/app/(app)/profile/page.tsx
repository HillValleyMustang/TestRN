"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from 'sonner';
import { Profile as ProfileType, ProfileUpdate, Tables } from '@/types/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Edit, Save, LogOut, ArrowLeft, BarChart2, User, Settings, Flame, Dumbbell, Trophy, Star, Footprints, Bot } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { TPathSwitcher } from '@/components/t-path-switcher';
import { cn, getLevelFromPoints } from '@/lib/utils'; // New import

type Profile = ProfileType;
type TPath = Tables<'t_paths'>;
type WorkoutSession = Tables<'workout_sessions'>;

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required."),
  height_cm: z.coerce.number().positive("Height must be positive.").optional().nullable(),
  weight_kg: z.coerce.number().positive("Weight must be positive.").optional().nullable(),
  body_fat_pct: z.coerce.number().min(0, "Cannot be negative.").max(100, "Cannot exceed 100.").optional().nullable(),
  primary_goal: z.string().optional().nullable(),
  health_notes: z.string().optional().nullable(),
  preferred_session_length: z.string().optional().nullable(),
});

export default function ProfilePage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTPath, setActiveTPath] = useState<TPath | null>(null);
  const [aiCoachUsageToday, setAiCoachUsageToday] = useState(0);
  const [perfectWeekCompleted, setPerfectWeekCompleted] = useState(false); // New state
  const [beastModeCompleted, setBeastModeCompleted] = useState(false);     // New state
  const AI_COACH_LIMIT_PER_SESSION = 2;

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: "", height_cm: null, weight_kg: null, body_fat_pct: null, primary_goal: null, health_notes: "", preferred_session_length: "" },
  });

  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      if (profileData) {
        setProfile(profileData as Profile);
        form.reset({
          full_name: [profileData.first_name, profileData.last_name].filter(Boolean).join(' '),
          height_cm: profileData.height_cm,
          weight_kg: profileData.weight_kg,
          body_fat_pct: profileData.body_fat_pct,
          primary_goal: profileData.primary_goal,
          health_notes: profileData.health_notes,
          preferred_session_length: profileData.preferred_session_length,
        });

        let activeTPathType: string | null = null;
        if (profileData.active_t_path_id) {
          const { data: tpathData, error: tpathError } = await supabase.from('t_paths').select('*, settings').eq('id', profileData.active_t_path_id).single();
          if (tpathError) toast.error("Failed to load active T-Path");
          else {
            setActiveTPath(tpathData as TPath);
            if (tpathData?.settings && typeof tpathData.settings === 'object' && 'tPathType' in tpathData.settings) {
              activeTPathType = (tpathData.settings as { tPathType: string }).tPathType;
            }
          }
        }

        // AI Coach Usage
        if (profileData.last_ai_coach_use_at) {
          const lastUsedDate = new Date(profileData.last_ai_coach_use_at).toDateString();
          const today = new Date().toDateString();
          setAiCoachUsageToday(lastUsedDate === today ? 1 : 0); // Simplified: 1 use if used today, else 0
        } else {
          setAiCoachUsageToday(0);
        }

        // --- Achievements Logic ---
        const { data: workoutSessions, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select('session_date, template_name')
          .eq('user_id', session.user.id)
          .order('session_date', { ascending: true });

        if (sessionsError) throw sessionsError;

        const sessionsByDate = new Map<string, WorkoutSession[]>();
        (workoutSessions as WorkoutSession[] || []).forEach(sessionItem => {
          const dateKey = new Date(sessionItem.session_date).toISOString().split('T')[0];
          if (!sessionsByDate.has(dateKey)) {
            sessionsByDate.set(dateKey, []);
          }
          sessionsByDate.get(dateKey)?.push(sessionItem);
        });

        // Beast Mode: 2+ T-path workouts on the same day
        let beastModeAchieved = false;
        for (const [, sessionsOnDay] of sessionsByDate) {
          if (sessionsOnDay.length >= 2) {
            beastModeAchieved = true;
            break;
          }
        }
        setBeastModeCompleted(beastModeAchieved);

        // Perfect Week: All required workouts from active T-Path within 7 days
        let perfectWeekAchieved = false;
        if (activeTPathType) {
          let requiredWorkoutNames: string[] = [];
          if (activeTPathType === 'ulul') {
            requiredWorkoutNames = ['Upper Body A', 'Upper Body B', 'Lower Body A', 'Lower Body B'];
          } else if (activeTPathType === 'ppl') {
            requiredWorkoutNames = ['Push', 'Pull', 'Legs'];
          }

          if (requiredWorkoutNames.length > 0) {
            const sortedDates = Array.from(sessionsByDate.keys()).sort();

            for (let i = 0; i < sortedDates.length; i++) {
              const startDate = new Date(sortedDates[i]);
              const endDate = new Date(startDate);
              endDate.setDate(startDate.getDate() + 6); // 7-day window (inclusive)

              const workoutsInWindow = new Set<string>();
              for (let j = i; j < sortedDates.length; j++) {
                const currentDate = new Date(sortedDates[j]);
                if (currentDate <= endDate) {
                  sessionsByDate.get(sortedDates[j])?.forEach(sessionItem => {
                    if (sessionItem.template_name) {
                      workoutsInWindow.add(sessionItem.template_name);
                    }
                  });
                } else {
                  break;
                }
              }

              const allRequiredFound = requiredWorkoutNames.every(requiredName => workoutsInWindow.has(requiredName));
              if (allRequiredFound) {
                perfectWeekAchieved = true;
                break;
              }
            }
          }
        }
        setPerfectWeekCompleted(perfectWeekAchieved);
      }
    } catch (err: any) {
      toast.error("Failed to load profile data: " + err.message);
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [session, supabase, form]);

  useEffect(() => {
    if (!session) router.push('/login'); else fetchData();
  }, [session, router, fetchData]);

  const { bmi, dailyCalories } = useMemo(() => {
    const weight = profile?.weight_kg;
    const height = profile?.height_cm;
    if (!weight || !height) return { bmi: null, dailyCalories: null };
    const heightInMeters = height / 100;
    const bmiValue = (weight / (heightInMeters * heightInMeters)).toFixed(1);
    const bmr = (10 * weight) + (6.25 * height) - (5 * 30) + 5;
    const caloriesValue = Math.round(bmr * 1.375);
    return { bmi: bmiValue, dailyCalories: caloriesValue.toLocaleString() };
  }, [profile]);

  const getFitnessLevel = useCallback(() => {
    const totalPoints = profile?.total_points || 0;
    const { level, color } = getLevelFromPoints(totalPoints); // Use the utility function

    let progress = 0;
    let nextLevelPoints = 0;

    if (level === 'Rookie') {
      nextLevelPoints = 100;
      progress = (totalPoints / nextLevelPoints) * 100;
    } else if (level === 'Warrior') {
      nextLevelPoints = 300;
      progress = ((totalPoints - 100) / 200) * 100;
    } else if (level === 'Champion') {
      nextLevelPoints = 600;
      progress = ((totalPoints - 300) / 300) * 100;
    } else { // Legend
      progress = 100;
      nextLevelPoints = 600; // No next level, but keep for display consistency
    }

    let icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
    switch (level) {
      case 'Rookie': icon = <Footprints className="h-8 w-8" />; break;
      case 'Warrior': icon = <Dumbbell className="h-8 w-8" />; break;
      case 'Champion': icon = <Trophy className="h-8 w-8" />; break;
      case 'Legend': icon = <Star className="h-8 w-8" />; break;
      default: icon = <Footprints className="h-8 w-8" />;
    }

    return { level, color, progress, icon, nextLevelPoints };
  }, [profile?.total_points]);

  const fitnessLevel = getFitnessLevel();

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    if (!session) return;
    const nameParts = values.full_name.split(' ');
    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ');

    const updateData: ProfileUpdate = { 
      ...values, 
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString() 
    };
    
    const { error } = await supabase.from('profiles').update(updateData).eq('id', session.user.id);
    if (error) {
      toast.error("Failed to update profile: " + error.message);
    } else {
      toast.success("Profile updated successfully!");
      await fetchData();
      setIsEditing(false);
    }
  }

  const achievements = [
    { name: 'First Workout', icon: '🏃', completed: (profile?.total_points || 0) >= 10 },
    { name: '10 Day Streak', icon: '🔥', completed: (profile?.current_streak || 0) >= 10 },
    { name: '25 Workouts', icon: '💪', completed: (profile?.total_points || 0) >= 250 },
    { name: '50 Workouts', icon: '🏆', completed: (profile?.total_points || 0) >= 500 },
    { name: 'Perfect Week', icon: '🗓️', completed: perfectWeekCompleted }, // Updated
    { name: 'Beast Mode', icon: '💥', completed: beastModeCompleted }, // Updated
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="p-4"><Skeleton className="h-screen w-full" /></div>;
  if (!profile) return <div className="p-4">Could not load profile.</div>;

  const userInitial = profile.first_name ? profile.first_name[0].toUpperCase() : (session?.user.email ? session.user.email[0].toUpperCase() : '?');

  return (
    <div className="p-2 sm:p-4 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <Button onClick={() => isEditing ? form.handleSubmit(onSubmit)() : setIsEditing(true)}>
          {isEditing ? <><Save className="h-4 w-4 mr-2" /> Save</> : <><Edit className="h-4 w-4 mr-2" /> Edit</>}
        </Button>
      </header>

      <div className="text-center mb-8">
        <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-primary/20">
          <AvatarFallback className="text-4xl font-bold">{userInitial}</AvatarFallback>
        </Avatar>
        <h1 className="text-3xl font-bold">{profile.first_name} {profile.last_name}</h1>
        <div className="flex items-center justify-center space-x-2 mt-2">
          <span className={cn("px-3 py-1 rounded-full text-xs font-bold text-white", fitnessLevel.color)}>{fitnessLevel.level}</span>
          <span className="text-muted-foreground text-sm">•</span>
          <span className="text-muted-foreground text-sm">Member since {new Date(profile.created_at!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview"><User className="h-4 w-4 mr-2" />Overview</TabsTrigger>
          <TabsTrigger value="stats"><BarChart2 className="h-4 w-4 mr-2" />Stats</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-2" />Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-orange-400 to-orange-500 text-primary-foreground shadow-lg"><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Current Streak</CardTitle><Flame className="h-4 w-4" /></CardHeader><CardContent><div className="text-2xl font-bold">{profile.current_streak || 0} Days</div></CardContent></Card>
            <Card className="bg-gradient-to-br from-blue-400 to-blue-500 text-primary-foreground shadow-lg"><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Workouts</CardTitle><Dumbbell className="h-4 w-4" /></CardHeader><CardContent><div className="text-2xl font-bold">{(profile.total_points || 0) / 10}</div></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" /> Body Metrics</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
              <div><p className="text-2xl font-bold">{bmi || 'N/A'}</p><p className="text-xs text-muted-foreground">BMI</p></div>
              <div><p className="text-2xl font-bold">{profile.height_cm || 'N/A'}<span className="text-base">cm</span></p><p className="text-xs text-muted-foreground">Height</p></div>
              <div><p className="text-2xl font-bold">{profile.weight_kg || 'N/A'}<span className="text-base">kg</span></p><p className="text-xs text-muted-foreground">Weight</p></div>
              <div><p className="text-2xl font-bold">{dailyCalories || 'N/A'}</p><p className="text-xs text-muted-foreground">Daily Cal (Est.)</p></div>
              <div><p className="text-2xl font-bold">{profile.body_fat_pct || 'N/A'}%</p><p className="text-xs text-muted-foreground">Body Fat</p></div>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Achievements</CardTitle></CardHeader><CardContent className="grid grid-cols-3 sm:grid-cols-6 gap-3">{achievements.map((a, i) => (<div key={i} className={cn("text-center p-3 rounded-xl border-2", a.completed ? 'bg-yellow-400/20 border-yellow-500/50 text-yellow-600' : 'bg-muted/50 border-border text-muted-foreground')}><div className="text-2xl mb-1">{a.icon}</div><div className="text-xs font-medium">{a.name}</div></div>))}</CardContent></Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-6 space-y-6">
          <Card className={cn("relative overflow-hidden p-6 text-center text-primary-foreground shadow-lg group", fitnessLevel.color, "transition-all duration-300 ease-in-out hover:scale-[1.01] hover:shadow-xl")}>
            <div className="absolute inset-0 opacity-20" style={{
              background: `linear-gradient(45deg, ${fitnessLevel.color.replace('bg-', 'var(--')} / 0.8), transparent)`,
              filter: 'blur(50px)',
              transform: 'scale(1.5)'
            }}></div>
            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className="mb-4 text-white transition-transform duration-300 ease-in-out group-hover:scale-110">
                {React.cloneElement(fitnessLevel.icon, { className: "h-12 w-12" })}
              </div>
              <CardTitle className="text-4xl font-extrabold tracking-tight text-white mb-2">
                {fitnessLevel.level}
              </CardTitle>
              <CardDescription className="text-base text-white/90 mb-4">
                {fitnessLevel.level === 'Legend' ? "You've reached the pinnacle of fitness!" : `Keep pushing to reach ${fitnessLevel.nextLevelPoints / 10} workouts for the next level!`}
              </CardDescription>
              <Progress value={fitnessLevel.progress} className="w-full h-3 bg-white/30" indicatorClassName={cn(fitnessLevel.color.replace('bg-', 'bg-'))} />
              <p className="text-sm text-white/80 mt-2">{Math.round(fitnessLevel.progress)}% to next level</p>
            </div>
          </Card>
          <Card><CardHeader><CardTitle>Weekly Progress</CardTitle></CardHeader><CardContent className="flex items-end justify-between space-x-2 h-24">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (<div key={i} className="flex-1 flex flex-col items-center gap-2"><div className="w-full bg-gradient-to-t from-blue-400 to-purple-400 rounded-t-lg" style={{ height: `${[60, 80, 45, 90, 70, 0, 30][i]}%` }} /><div className="text-muted-foreground text-xs">{day}</div></div>))}</CardContent></Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Personal Info</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="full_name" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input {...field} disabled={!isEditing} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="height_cm" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl><Input type="number" inputMode="numeric" {...field} value={field.value ?? ''} disabled={!isEditing} className="w-full sm:max-w-[120px]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="weight_kg" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl><Input type="number" step="0.1" inputMode="numeric" {...field} value={field.value ?? ''} disabled={!isEditing} className="w-full sm:max-w-[120px]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="body_fat_pct" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body Fat (%)</FormLabel>
                      <FormControl><Input type="number" step="0.1" inputMode="numeric" {...field} value={field.value ?? ''} disabled={!isEditing} className="w-full sm:max-w-[120px]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
              <Card><CardHeader><CardTitle>Workout Preferences</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="primary_goal" render={({ field }) => (<FormItem><FormLabel>Primary Goal</FormLabel><Select onValueChange={field.onChange} value={field.value || ''} disabled={!isEditing}><FormControl><SelectTrigger><SelectValue placeholder="Select your goal" /></SelectTrigger></FormControl><SelectContent><SelectItem value="muscle_gain">Muscle Gain</SelectItem><SelectItem value="fat_loss">Fat Loss</SelectItem><SelectItem value="strength_increase">Strength Increase</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="preferred_session_length" render={({ field }) => (<FormItem><FormLabel>Preferred Session Length</FormLabel><Select onValueChange={field.onChange} value={field.value || ''} disabled={!isEditing}><FormControl><SelectTrigger><SelectValue placeholder="Select length" /></SelectTrigger></FormControl><SelectContent><SelectItem value="15-30">15-30 mins</SelectItem><SelectItem value="30-45">30-45 mins</SelectItem><SelectItem value="45-60">45-60 mins</SelectItem><SelectItem value="60-90">60-90 mins</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} /></CardContent></Card>
              <Card>
                <CardHeader><CardTitle>Active T-Path</CardTitle><CardDescription>Your Transformation Path is a pre-designed workout program tailored to your goals. Changing it here will regenerate your entire workout plan on the 'Workout' page, replacing your current set of exercises with a new one based on your preferences.</CardDescription></CardHeader>
                <CardContent>{activeTPath && <TPathSwitcher currentTPathId={activeTPath.id} onTPathChange={(newId) => { toast.info("T-Path changed! Refreshing data..."); fetchData(); }} disabled={!isEditing} />}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> AI Coach Usage</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">You have used the AI Coach <span className="font-semibold">{aiCoachUsageToday}</span> time(s) today.</p>
                  <p className="text-sm">Limit: <span className="font-semibold">{AI_COACH_LIMIT_PER_SESSION}</span> uses per session.</p>
                  <p className="text-xs text-muted-foreground">The AI Coach needs at least 3 workouts in the last 30 days to provide advice.</p>
                </CardContent>
              </Card>
            </form>
          </Form>
          
          <div className="flex justify-end mt-6">
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      <MadeWithDyad />
    </div>
  );
}