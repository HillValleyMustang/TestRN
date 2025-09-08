"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from 'sonner';
import { Profile as ProfileType, ProfileUpdate, Tables } from '@/types/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart2, User, Settings, ChevronLeft, ChevronRight, Flame, Dumbbell, Trophy, Star, Footprints, ListChecks } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, getLevelFromPoints } from '@/lib/utils';
import { AchievementDetailDialog } from '@/components/profile/achievement-detail-dialog';
import useEmblaCarousel from 'embla-carousel-react';

import { ProfileHeader } from '@/components/profile/profile-header';
import { ProfileOverviewTab } from '@/components/profile/profile-overview-tab';
import { ProfileStatsTab } from '@/components/profile/profile-stats-tab';
import { ProfileSettingsTab } from '@/components/profile/profile-settings-tab';
import { PointsExplanationModal } from '@/components/profile/points-explanation-modal';
import { achievementsList } from '@/lib/achievements';
import { LoadingOverlay } from '@/components/loading-overlay';

type Profile = ProfileType;
type TPath = Tables<'t_paths'>;

const mainMuscleGroups = [
  "Pectorals", "Deltoids", "Lats", "Traps", "Biceps", 
  "Triceps", "Quadriceps", "Hamstrings", "Glutes", "Calves", 
  "Abdominals", "Core", "Full Body"
];

const profileSchema = z.object({
  full_name: z.string().min(1, "Your name is required."),
  height_cm: z.coerce.number().positive("Height must be positive.").optional().nullable(),
  weight_kg: z.coerce.number().positive("Weight must be positive.").optional().nullable(),
  body_fat_pct: z.coerce.number().min(0, "Cannot be negative.").max(100, "Cannot exceed 100.").optional().nullable(),
  primary_goal: z.string().optional().nullable(),
  health_notes: z.string().optional().nullable(),
  preferred_session_length: z.string().optional().nullable(),
  preferred_muscles: z.array(z.string()).optional().nullable(),
});

export default function ProfilePage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTPath, setActiveTPath] = useState<TPath | null>(null);
  const [aiCoachUsageToday, setAiCoachUsageToday] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [totalWorkoutsCount, setTotalWorkoutsCount] = useState(0);
  const [totalExercisesCount, setTotalExercisesCount] = useState(0);

  const [isAchievementDetailOpen, setIsAchievementDetailOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [isPointsExplanationOpen, setIsPointsExplanationOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const AI_COACH_LIMIT_PER_SESSION = 2;

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
    },
  });

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  const fetchData = useCallback(async () => {
    console.log("[ProfilePage Debug] fetchData: Starting fetch operation.");
    if (!session) {
      console.log("[ProfilePage Debug] fetchData: No session, returning.");
      return;
    }
    setLoading(true);
    try {
      console.log("[ProfilePage Debug] fetchData: Fetching profile data from Supabase.");
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profileError && profileError.code !== 'PGRST116') {
        console.error("[ProfilePage Debug] fetchData: Profile fetch error:", profileError);
        throw profileError;
      }
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
          preferred_muscles: profileData.preferred_muscles ? profileData.preferred_muscles.split(',').map((m: string) => m.trim()) : [],
        });
        console.log("[ProfilePage Debug] fetchData: Profile data loaded and form reset.");

        if (profileData.active_t_path_id) {
          console.log("[ProfilePage Debug] fetchData: Fetching active T-Path.");
          const { data: tpathData, error: tpathError } = await supabase.from('t_paths').select('*, settings').eq('id', profileData.active_t_path_id).single();
          if (tpathError) console.error("[ProfilePage Debug] fetchData: Failed to load active T-Path:", tpathError);
          else {
            setActiveTPath(tpathData as TPath);
            console.log("[ProfilePage Debug] fetchData: Active T-Path loaded.");
          }
        }

        // AI Coach Usage
        console.log("[ProfilePage Debug] fetchData: Checking AI Coach usage.");
        if (profileData.last_ai_coach_use_at) {
          const lastUsedDate = new Date(profileData.last_ai_coach_use_at).toDateString();
          const today = new Date().toDateString();
          setAiCoachUsageToday(lastUsedDate === today ? 1 : 0);
        } else {
          setAiCoachUsageToday(0);
        }
        console.log("[ProfilePage Debug] fetchData: AI Coach usage checked.");

        // Fetch unlocked achievements
        console.log("[ProfilePage Debug] fetchData: Fetching unlocked achievements.");
        const { data: userAchievements, error: achievementsError } = await supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', session.user.id);

        if (achievementsError) {
          console.error("[ProfilePage Debug] fetchData: Achievements fetch error:", achievementsError);
          throw achievementsError;
        }
        setUnlockedAchievements(new Set((userAchievements || []).map(a => a.achievement_id)));
        console.log("[ProfilePage Debug] fetchData: Unlocked achievements fetched.");

        // Fetch total completed workouts
        console.log("[ProfilePage Debug] fetchData: Fetching total completed workouts.");
        const { count: workoutsCount, error: workoutsCountError } = await supabase
          .from('workout_sessions')
          .select('id', { count: 'exact' })
          .eq('user_id', session.user.id)
          .not('completed_at', 'is', null);
        if (workoutsCountError) {
          console.error("[ProfilePage Debug] fetchData: Workouts count error:", workoutsCountError);
          throw workoutsCountError;
        }
        setTotalWorkoutsCount(workoutsCount || 0);
        console.log(`[ProfilePage Debug] fetchData: Total workouts count: ${workoutsCount}`);

        // Fetch total exercise instances completed via RPC
        console.log("[ProfilePage Debug] fetchData: Fetching total exercise instances completed via RPC.");
        const { data: totalExerciseInstances, error: totalExerciseInstancesError } = await supabase
          .rpc('get_total_completed_exercise_instances', { p_user_id: session.user.id });

        if (totalExerciseInstancesError) {
          console.error("[ProfilePage Debug] fetchData: RPC error fetching total exercise instances count:", totalExerciseInstancesError);
          throw totalExerciseInstancesError;
        }
        setTotalExercisesCount(totalExerciseInstances || 0);
        console.log(`[ProfilePage Debug] fetchData: Total exercise instances from RPC: ${totalExerciseInstances}`);

      }
    } catch (err: any) {
      toast.error("Failed to load profile data: " + err.message);
      console.error("[ProfilePage Debug] fetchData: Caught error during fetch:", err);
    } finally {
      setLoading(false);
      console.log("[ProfilePage Debug] fetchData: Fetch operation finished.");
    }
  }, [session, supabase, form]);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    fetchData();

    const tabParam = searchParams.get('tab');
    const editParam = searchParams.get('edit');

    if (tabParam === 'settings') {
      setActiveTab('settings');
      if (editParam === 'true') {
        setIsEditing(true);
      }
    }
  }, [session, router, fetchData, searchParams]);

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
    console.log("[ProfilePage Debug] onSubmit: Starting save operation.");
    if (!session || !profile) {
      console.log("[ProfilePage Debug] onSubmit: No session or profile, returning.");
      return;
    }
    setIsSaving(true);
    console.log("[ProfilePage Debug] onSubmit: isSaving set to true.");

    const oldSessionLength = profile.preferred_session_length;
    const newSessionLength = values.preferred_session_length;
    const sessionLengthChanged = oldSessionLength !== newSessionLength;
    console.log(`[ProfilePage Debug] onSubmit: Session length changed: ${sessionLengthChanged}`);

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
    
    console.log("[ProfilePage Debug] onSubmit: Attempting to update profile in Supabase with data:", updateData);
    const { error } = await supabase.from('profiles').update(updateData).eq('id', session.user.id);
    if (error) {
      toast.error("Failed to update profile: " + error.message);
      console.error("[ProfilePage Debug] onSubmit: Supabase update error:", error);
      setIsSaving(false);
      return;
    }
    console.log("[ProfilePage Debug] onSubmit: Profile updated successfully in Supabase.");

    toast.success("Profile updated successfully!");

    if (sessionLengthChanged && activeTPath) {
      console.log("[ProfilePage Debug] onSubmit: Session length changed and active T-Path exists. Initiating workout plan regeneration.");
      try {
        console.log("[ProfilePage Debug] onSubmit: Calling /api/generate-t-path API route.");
        const response = await fetch(`/api/generate-t-path`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ tPathId: activeTPath.id })
        });
        console.log("[ProfilePage Debug] onSubmit: Fetch call to /api/generate-t-path completed.");

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[ProfilePage Debug] onSubmit: API Error during T-Path regeneration initiation:", errorText);
          throw new Error(`Failed to initiate T-Path workout regeneration: ${errorText}`);
        }
        console.log("[ProfilePage Debug] onSubmit: T-Path regeneration initiated successfully via API.");
      } catch (err: any) {
        toast.error("Error initiating workout plan update: " + err.message);
        console.error("[ProfilePage Debug] onSubmit: T-Path regeneration initiation error:", err);
      }
    }
    console.log("[ProfilePage Debug] onSubmit: Calling fetchData to refresh profile.");
    await fetchData();
    console.log("[ProfilePage Debug] onSubmit: fetchData completed.");
    setIsEditing(false);
    setIsSaving(false);
    console.log("[ProfilePage Debug] onSubmit: isEditing and isSaving set to false. Save operation finished.");
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

  if (loading) return <div className="p-4"><Skeleton className="h-screen w-full" /></div>;
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
                      activeTPath={activeTPath}
                      aiCoachUsageToday={aiCoachUsageToday}
                      AI_COACH_LIMIT_PER_SESSION={AI_COACH_LIMIT_PER_SESSION}
                      onTPathChange={fetchData}
                      onSignOut={handleSignOut}
                      onSubmit={onSubmit}
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
    </>
  );
}