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
import { BarChart2, User, Settings, ChevronLeft, ChevronRight, Flame, Dumbbell, Trophy, Star, Footprints } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, getLevelFromPoints } from '@/lib/utils';
import { AchievementDetailDialog } from '@/components/profile/achievement-detail-dialog';
import useEmblaCarousel from 'embla-carousel-react';

import { ProfileHeader } from '@/components/profile/profile-header';
import { ProfileOverviewTab } from '@/components/profile/profile-overview-tab';
import { ProfileStatsTab } from '@/components/profile/profile-stats-tab';
import { ProfileSettingsTab } from '@/components/profile/profile-settings-tab';
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

  const [isAchievementDetailOpen, setIsAchievementDetailOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<{ id: string; name: string; icon: string } | null>(null);
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
          preferred_muscles: profileData.preferred_muscles ? profileData.preferred_muscles.split(',').map((m: string) => m.trim()) : [],
        });

        if (profileData.active_t_path_id) {
          const { data: tpathData, error: tpathError } = await supabase.from('t_paths').select('*, settings').eq('id', profileData.active_t_path_id).single();
          if (tpathError) toast.error("Failed to load active T-Path");
          else {
            setActiveTPath(tpathData as TPath);
          }
        }

        // AI Coach Usage
        if (profileData.last_ai_coach_use_at) {
          const lastUsedDate = new Date(profileData.last_ai_coach_use_at).toDateString();
          const today = new Date().toDateString();
          setAiCoachUsageToday(lastUsedDate === today ? 1 : 0);
        } else {
          setAiCoachUsageToday(0);
        }

        // Fetch unlocked achievements
        const { data: userAchievements, error: achievementsError } = await supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', session.user.id);

        if (achievementsError) throw achievementsError;
        setUnlockedAchievements(new Set((userAchievements || []).map(a => a.achievement_id)));
      }
    } catch (err: any) {
      toast.error("Failed to load profile data: " + err.message);
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
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
    if (!session || !profile) return;
    setIsSaving(true);

    const oldSessionLength = profile.preferred_session_length;
    const newSessionLength = values.preferred_session_length;
    const sessionLengthChanged = oldSessionLength !== newSessionLength;

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
    
    const { error } = await supabase.from('profiles').update(updateData).eq('id', session.user.id);
    if (error) {
      toast.error("Failed to update profile: " + error.message);
      setIsSaving(false);
      return;
    }

    toast.success("Profile updated successfully!");

    if (sessionLengthChanged && activeTPath) {
      toast.info("Session length changed. Regenerating your workout plan...");
      try {
        const response = await fetch(`/api/generate-t-path`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ tPathId: activeTPath.id })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error during T-Path regeneration:", errorText); // Log the full error response
          throw new Error(`Failed to regenerate T-Path workouts: ${errorText}`);
        }
        toast.success("Your workout plan has been updated!");
      } catch (err: any) {
        toast.error("Error updating workout plan: " + err.message);
        console.error("T-Path regeneration error:", err);
      }
    }

    await fetchData();
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
      <LoadingOverlay 
        isOpen={isSaving} 
        title="Saving Profile" 
        description="Please wait while we update your profile and workout plan." 
      />
    </>
  );
}