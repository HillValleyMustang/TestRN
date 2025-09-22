"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import *as z from "zod";
import { toast } from 'sonner';
import { Profile as ProfileType, ProfileUpdate, Tables, LocalUserAchievement } from '@/types/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart2, User, Settings, ChevronLeft, ChevronRight, Flame, Dumbbell, Trophy, Star, Footprints, ListChecks } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, getLevelFromPoints } from '@/lib/utils';
import { AchievementDetailDialog } from '@/components/profile/achievement-detail-dialog';
import useEmblaCarousel from 'embla-carousel-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useCacheAndRevalidate } from '@/hooks/use-cache-and-revalidate';

import { ProfileHeader } from '@/components/profile/profile-header';
import { ProfileOverviewTab } from '@/components/profile/profile-overview-tab';
import { ProfileStatsTab } from '@/components/profile/profile-stats-tab';
import { ProfileSettingsTab } from '@/components/profile/profile-settings-tab';
import { PointsExplanationModal } from '@/components/profile/points-explanation-modal';
import { achievementsList } from '@/lib/achievements';
import { LoadingOverlay } from '@/components/loading-overlay';
import { FloatingSaveEditButton } from '@/components/profile/floating-save-edit-button';

type Profile = ProfileType;
type TPath = Tables<'t_paths'>;

const mainMuscleGroups = [
  "Pectorals", "Deltoids", "Lats", "Traps", "Biceps", 
  "Triceps", "Quadriceps", "Hamstrings", "Glutes", "Calves", 
  "Abdominals", "Core", "Full Body"
];

const profileSchema = z.object({
  full_name: z.string().min(1, "Your name is required."),
  height_cm: z.coerce.number()
    .int("Height must be a whole number.")
    .positive("Height must be positive.")
    .optional().nullable(),
  weight_kg: z.coerce.number()
    .int("Weight must be a whole number.")
    .positive("Weight must be positive.")
    .optional().nullable(),
  body_fat_pct: z.coerce.number()
    .int("Body Fat % must be a whole number.")
    .min(0, "Cannot be negative.")
    .max(100, "Cannot exceed 100.")
    .optional().nullable(),
  primary_goal: z.string().optional().nullable(),
  health_notes: z.string().optional().nullable(),
  preferred_session_length: z.string().optional().nullable(),
  preferred_muscles: z.array(z.string()).optional().nullable(),
  programme_type: z.string().optional().nullable(), // Added programme_type
});

export default function ProfilePage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiCoachUsageToday, setAiCoachUsageToday] = useState(0);
  
  const [isAchievementDetailOpen, setIsAchievementDetailOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [isPointsExplanationOpen, setIsPointsExplanationOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const AI_COACH_DAILY_LIMIT = 2;

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { 
      full_name: "", 
      height_cm: null, 
      weight_kg: null, 
      body_fat_pct: null, 
      primary_goal: null, 
      health_notes: null,
      preferred_session_length: null, 
      preferred_muscles: [],
      programme_type: null, // Added programme_type
    },
  });

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  const { data: cachedProfile, loading: loadingProfile, error: profileError, refresh: refreshProfileCache } = useCacheAndRevalidate<Profile>({
    cacheTable: 'profiles_cache',
    supabaseQuery: useCallback(async (client) => {
      if (!session?.user.id) return { data: [], error: null };
      const { data, error } = await client.from('profiles').select('*').eq('id', session.user.id);
      return { data: data || [], error };
    }, [session?.user.id]),
    queryKey: 'user_profile_page',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });
  const profile = cachedProfile?.[0] || null;

  const { data: cachedAchievements, loading: loadingAchievements, error: achievementsError, refresh: refreshAchievementsCache } = useCacheAndRevalidate<LocalUserAchievement>({
    cacheTable: 'user_achievements_cache',
    supabaseQuery: useCallback(async (client) => {
      if (!session?.user.id) return { data: [], error: null };
      const { data, error } = await client.from('user_achievements').select('id, user_id, achievement_id, unlocked_at').eq('user_id', session.user.id);
      return { data: data as LocalUserAchievement[] || [], error };
    }, [session?.user.id]),
    queryKey: 'user_achievements_page',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });
  const unlockedAchievements = useMemo(() => new Set((cachedAchievements || []).map(a => a.achievement_id)), [cachedAchievements]);

  const { refresh: refreshTPathsCache } = useCacheAndRevalidate<TPath>({
    cacheTable: 't_paths_cache',
    supabaseQuery: useCallback(async (client) => {
      if (!session?.user.id) return { data: [], error: null };
      return client.from('t_paths').select('*').eq('user_id', session.user.id);
    }, [session?.user.id]),
    queryKey: 't_paths_profile_page',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const { refresh: refreshTPathExercisesCache } = useCacheAndRevalidate<Tables<'t_path_exercises'>>({
    cacheTable: 't_path_exercises_cache',
    supabaseQuery: useCallback(async (client) => {
      if (!session?.user.id) return { data: [], error: null };
      const { data: userTPaths, error: tPathsError } = await client.from('t_paths').select('id').eq('user_id', session.user.id);
      if (tPathsError) throw tPathsError; // Throw error if fetching t_paths fails
      if (!userTPaths) return { data: [], error: null };
      const tpathIds = userTPaths.map(p => p.id);
      return client.from('t_path_exercises').select('*').in('template_id', tpathIds);
    }, [session?.user.id]),
    queryKey: 't_path_exercises_profile_page',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const totalWorkoutsCount = useLiveQuery(async () => {
    if (!session?.user.id) return 0;
    try {
      const count = await db.workout_sessions
        .where('user_id').equals(session.user.id)
        .and(s => s.completed_at !== null)
        .count();
      return count;
    } catch (error) {
      console.error("[ProfilePage] Error fetching total workouts count from IndexedDB:", error);
      toast.error("Failed to load total workouts count.");
      return 0;
    }
  }, [session?.user.id]) || 0;

  const totalExercisesCount = useLiveQuery(async () => {
    if (!session?.user.id) return 0;
    try {
      const uniqueExerciseInstances = new Set<string>();
      const setLogs = await db.set_logs.toArray();
      const workoutSessions = await db.workout_sessions.toArray();
      const userSessionIds = new Set(workoutSessions.filter(ws => ws.user_id === session.user.id && ws.completed_at !== null).map(ws => ws.id));

      setLogs.forEach(sl => {
        if (sl.session_id && userSessionIds.has(sl.session_id) && sl.exercise_id) {
          uniqueExerciseInstances.add(`${sl.session_id}-${sl.exercise_id}`);
        }
      });
      return uniqueExerciseInstances.size;
    } catch (error) {
      console.error("[ProfilePage] Error fetching total exercises count from IndexedDB:", error);
      toast.error("Failed to load total exercises count.");
      return 0;
    }
  }, [session?.user.id]) || 0;

  const refreshProfileData = useCallback(async () => {
    console.log("[ProfilePage] refreshProfileData called.");
    await refreshProfileCache();
    await refreshAchievementsCache();
    await refreshTPathsCache();
    await refreshTPathExercisesCache();
  }, [refreshProfileCache, refreshAchievementsCache, refreshTPathsCache, refreshTPathExercisesCache]);

  useEffect(() => {
    if (loadingProfile || loadingAchievements || !session?.user.id) {
      return;
    }

    if (profile) {
      console.log("[ProfilePage] Profile data loaded, setting form defaults:", profile);

      form.reset({
        full_name: [profile.first_name, profile.last_name].filter(Boolean).join(' '),
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        body_fat_pct: profile.body_fat_pct,
        primary_goal: profile.primary_goal,
        health_notes: profile.health_notes,
        preferred_session_length: profile.preferred_session_length,
        preferred_muscles: profile.preferred_muscles ? profile.preferred_muscles.split(',').map((m: string) => m.trim()) : [],
        programme_type: profile.programme_type, // Added programme_type
      });

      if (profile.last_ai_coach_use_at) {
        const lastUsedDate = new Date(profile.last_ai_coach_use_at).toDateString();
        const today = new Date().toDateString();
        setAiCoachUsageToday(lastUsedDate === today ? 1 : 0);
      } else {
        setAiCoachUsageToday(0);
      }

    } else {
      form.reset();
      setAiCoachUsageToday(0);
      console.log("[ProfilePage] No profile data found, resetting form.");
    }
  }, [profile, loadingProfile, loadingAchievements, session?.user.id, form, supabase, setAiCoachUsageToday]);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    
    refreshProfileData(); 

    const tabParam = searchParams.get('tab');
    const editParam = searchParams.get('edit');

    if (tabParam) {
      setActiveTab(tabParam);
    }
    if (editParam === 'true') {
      setIsEditing(true);
    } else if (editParam === 'false') {
      setIsEditing(false);
    }
  }, [session, router, refreshProfileData, searchParams]);

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
    const { level, color } = getLevelFromPoints(totalPoints);

    let progress = 0;
    let nextLevelPoints = 0;

    if (level === 'Rookie') {
      nextLevelPoints = 100;
      progress = (totalPoints / nextLevelPoints) * 100;
    } else if (level === 'Warrior') {
      nextLevelPoints = 300;
      progress = ((totalPoints - 100) / 200) * 100;
    } else {
      nextLevelPoints = 600;
      progress = ((totalPoints - 300) / 300) * 100;
      if (level === 'Legend') {
        progress = 100;
      }
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
    console.log("[ProfilePage] onSubmit called with values:", values);
    if (!session || !profile) {
      console.error("[ProfilePage] Cannot save profile: session or profile data missing.");
      toast.error("Cannot save profile: session or profile data missing.");
      return;
    }

    // Always set saving state when onSubmit is called
    setIsSaving(true);

    // Always attempt to update profile in DB with current form values if in editing mode
    if (isEditing) {
      const nameParts = values.full_name.split(' ');
      const firstName = nameParts.shift() || '';
      const lastName = nameParts.join(' ');

      const updateData: ProfileUpdate = {
        ...values,
        first_name: firstName,
        last_name: lastName,
        preferred_muscles: values.preferred_muscles?.join(', ') || null,
        updated_at: new Date().toISOString()
      };
      
      console.log("[ProfilePage] Attempting to update profile with data:", updateData);
      const { error } = await supabase.from('profiles').update(updateData).eq('id', session.user.id);
      if (error) {
        console.error("[ProfilePage] Failed to update profile:", error);
        toast.error("Failed to update profile.");
        setIsSaving(false);
        return;
      }
      toast.success("Profile updated successfully!");
    } else {
      console.log("[ProfilePage] Not in editing mode, skipping profile DB update.");
      // This case should ideally not be hit if the save button is only visible in editing mode.
      // If it is hit, it means the user clicked save without being in edit mode, or there's a UI bug.
      toast.info("No profile changes to save.");
    }

    // Always trigger plan regeneration if currently in editing mode AND an active T-Path exists.
    // The backend function is idempotent and will only regenerate if necessary.
    if (isEditing && profile.active_t_path_id) {
      console.log(`[ProfilePage] Initiating workout plan update because in editing mode and active T-Path exists. Active T-Path: ${profile.active_t_path_id}.`);
      try {
        const response = await fetch(`/api/generate-t-path`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ 
            tPathId: profile.active_t_path_id,
            preferred_session_length: values.preferred_session_length // Use the value from the form
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[ProfilePage] Failed to initiate T-Path workout regeneration API:", errorText);
          throw new Error(`Failed to initiate T-Path workout regeneration: ${errorText}`);
        }
        console.log("[ProfilePage] Successfully initiated T-Path workout regeneration API call.");
      } catch (err: any) {
        console.error("[ProfilePage] Error initiating workout plan update:", err);
        toast.error("Error initiating workout plan update.");
      }
    } else if (!profile.active_t_path_id) {
      console.log("[ProfilePage] No active T-Path, skipping workout plan regeneration.");
    } else {
      console.log("[ProfilePage] Not in editing mode or no active T-Path, skipping workout plan regeneration.");
    }

    console.log("[ProfilePage] Refreshing profile data after save/regeneration trigger.");
    await refreshProfileData();
    setIsEditing(false);
    setIsSaving(false);
  }

  const handleAchievementClick = (achievement: { id: string; name: string; icon: string }) => {
    setSelectedAchievement(achievement);
    setIsAchievementDetailOpen(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    if (emblaApi) {
      const index = ["overview", "stats", "settings"].indexOf(value);
      if (index !== -1) {
        emblaApi.scrollTo(index);
      }
    }
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const selectedIndex = emblaApi.selectedScrollSnap();
      const tabNames = ["overview", "stats", "settings"];
      setActiveTab(tabNames[selectedIndex]);
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => {
    emblaApi && emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi && emblaApi.scrollNext();
  }, [emblaApi]);

  if (loadingProfile || loadingAchievements) return <div className="p-4"><Skeleton className="h-screen w-full" /></div>;
  if (!profile) return <div className="p-4">Could not load profile.</div>;

  const userInitial = profile.first_name ? profile.first_name[0].toUpperCase() : (session?.user.email ? session.user.email[0].toUpperCase() : '?');

  return (
    <>
      <div className="p-2 sm:p-4 max-w-4xl mx-auto">
        <ProfileHeader
          isEditing={isEditing}
          onEditToggle={() => setIsEditing(prev => !prev)}
          onSave={form.handleSubmit(onSubmit)}
          isSaving={isSaving}
        />

        <div className="text-center mb-8">
          <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-primary/20">
            <AvatarFallback className="text-4xl font-bold">{userInitial}</AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold">{profile.first_name} {profile.last_name}</h1>
          <div className="flex items-center justify-center space-x-2 mt-2">
            <span className={cn("px-3 py-1 rounded-full text-xs font-bold !text-white", fitnessLevel.color)}>{fitnessLevel.level}</span>
            <span className="text-muted-foreground text-sm">•</span>
            <span className="text-muted-foreground text-sm">Member since {new Date(profile.created_at!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="overview"><User className="h-4 w-4 mr-2" />Overview</TabsTrigger>
            <TabsTrigger value="stats"><BarChart2 className="h-4 w-4 mr-2" />Stats</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-2" />Settings</TabsTrigger>
          </TabsList>
          
          <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 pt-0">
                  <ProfileOverviewTab
                    profile={profile}
                    bmi={bmi}
                    dailyCalories={dailyCalories}
                    achievements={achievementsList}
                    unlockedAchievements={unlockedAchievements}
                    onAchievementClick={handleAchievementClick}
                    onOpenPointsExplanation={() => setIsPointsExplanationOpen(true)}
                    totalWorkoutsCount={totalWorkoutsCount}
                    totalExercisesCount={totalExercisesCount}
                  />
                </div>

                <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 pt-0">
                  <ProfileStatsTab
                    fitnessLevel={fitnessLevel}
                    profile={profile}
                  />
                </div>

                <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 pt-0">
                  <FormProvider {...form}>
                    <ProfileSettingsTab
                      form={form}
                      isEditing={isEditing}
                      mainMuscleGroups={mainMuscleGroups}
                      aiCoachUsageToday={aiCoachUsageToday}
                      AI_COACH_DAILY_LIMIT={AI_COACH_DAILY_LIMIT}
                      onSignOut={handleSignOut}
                      onSubmit={onSubmit}
                      profile={profile}
                      onDataChange={refreshProfileData}
                    />
                  </FormProvider>
                </div>
              </div>
            </div>
            
            <button
              onClick={scrollPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden sm:flex p-2 rounded-full bg-background/50 hover:bg-background/70 transition-colors"
              disabled={activeTab === "overview"}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden sm:flex p-2 rounded-full bg-background/50 hover:bg-background/70 transition-colors"
              disabled={activeTab === "settings"}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </Tabs>
      </div>

      <AchievementDetailDialog
        open={isAchievementDetailOpen}
        onOpenChange={setIsAchievementDetailOpen}
        achievementId={selectedAchievement?.id || null}
        isUnlocked={selectedAchievement ? unlockedAchievements.has(selectedAchievement.id) : false}
        profile={profile}
        session={session}
        supabase={supabase}
        achievementInfo={selectedAchievement}
      />
      <PointsExplanationModal
        open={isPointsExplanationOpen}
        onOpenChange={setIsPointsExplanationOpen}
      />
      <LoadingOverlay 
        isOpen={isSaving} 
        title="Saving Profile" 
        description="Please wait while we update your profile and workout plan." 
      />
      <FloatingSaveEditButton 
        isEditing={isEditing} 
        onSave={form.handleSubmit(onSubmit)} 
        isSaving={isSaving} 
      />
    </>
  );
}