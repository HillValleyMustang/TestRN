"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Tables, FetchedExerciseDefinition, LocalUserAchievement, Profile as ProfileType } from '@/types/supabase';
import { AchievementDetailDialog } from './achievement-detail-dialog';
import { PointsExplanationModal } from './points-explanation-modal';
import { PhotoJourneyTab } from './photo-journey/photo-journey-tab';
import { UploadPhotoDialog } from './photo-journey/upload-photo-dialog';
import { PhotoCaptureFlow } from './photo-journey/photo-capture-flow';
import { MobileNavigation } from '@/components/layout/mobile-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AchievementGrid } from './achievement-grid';
import { useManageExercisesData } from '@/hooks/use-manage-exercises-data';
import { EditExerciseDialog } from '@/components/manage-exercises/edit-exercise-dialog';
import { Badge } from '@/components/ui/badge';
import { GymManagementSection } from './gym-management-section';
import { ProgrammeTypeSection } from './programme-type-section';
import { WorkoutPreferencesForm } from './workout-preferences-form';
import { PersonalInfoForm } from './personal-info-form';
import { AICoachUsageSection } from './ai-coach-usage-section';
import { DataExportSection } from './data-export-section';
import { useWorkoutDataFetcher } from '@/hooks/use-workout-data-fetcher';
import { useEmblaCarousel, EmblaCarouselType } from 'embla-carousel-react'; // Corrected import
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { ProfileOverviewTab } from '@/components/profile/profile-overview-tab'; // Corrected import path
import { ProfileStatsTab } from '@/components/profile/profile-stats-tab';
import { MediaFeedScreen } from '@/components/media/media-feed-screen';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatAthleteName } from '@/lib/utils';
import { getLevelFromPoints } from '@/lib/utils';
import { LoadingOverlay } from '@/components/loading-overlay';
import { Form, FormProvider, useForm } from 'react-hook-form'; // Import FormProvider and useForm
import { zodResolver } from '@hookform/resolvers/zod'; // Import zodResolver
import * as z from 'zod'; // Import zod
import { profileSchema } from '@/lib/schemas/profileSchema'; // Assuming profileSchema is defined here

type Profile = ProfileType;
type TPath = Tables<'t_paths'>;

const profileTabs = [
  { id: "overview", label: "Overview" },
  { id: "stats", label: "Stats" },
  { id: "photo", label: "Photo Journey" },
  { id: "media", label: "Media" },
  { id: "social", label: "Social" },
  { id: "settings", label: "Settings" },
];

export default function ProfilePage() {
  const { session, supabase, memoizedSessionUserId } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);
  const [aiCoachUsageToday, setAiCoachUsageToday] = useState(0);
  
  const [isAchievementDetailOpen, setIsAchievementDetailOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [isPointsExplanationOpen, setIsPointsExplanationOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [photos, setPhotos] = useState<Tables<'progress_photos'>[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [isCaptureFlowOpen, setIsCaptureFlowOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);

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
      programme_type: null,
    },
  });

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  const { data: cachedProfile, loading: loadingProfile, error: profileError, refresh: refreshProfileCache } = useCacheAndRevalidate<Profile>({
    cacheTable: 'profiles_cache',
    supabaseQuery: useCallback(async (client) => {
      if (!memoizedSessionUserId) return { data: [], error: null };
      const { data, error } = await client.from('profiles').select('*').eq('id', memoizedSessionUserId);
      return { data: data || [], error };
    }, [memoizedSessionUserId]),
    queryKey: 'user_profile_page',
    supabase,
    sessionUserId: memoizedSessionUserId,
  });
  const profile = cachedProfile?.[0] || null;

  const { data: cachedAchievements, loading: loadingAchievements, error: achievementsError, refresh: refreshAchievementsCache } = useCacheAndRevalidate<LocalUserAchievement>({
    cacheTable: 'user_achievements_cache',
    supabaseQuery: useCallback(async (client) => {
      if (!memoizedSessionUserId) return { data: [], error: null };
      const { data, error } = await client.from('user_achievements').select('id, user_id, achievement_id, unlocked_at').eq('user_id', memoizedSessionUserId);
      return { data: data as LocalUserAchievement[] || [], error };
    }, [memoizedSessionUserId]),
    queryKey: 'user_achievements_page',
    supabase,
    sessionUserId: memoizedSessionUserId,
  });
  const unlockedAchievements = useMemo(() => new Set((cachedAchievements || []).map(a => a.achievement_id)), [cachedAchievements]);

  const { refresh: refreshTPathsCache } = useCacheAndRevalidate<TPath>({
    cacheTable: 't_paths_cache',
    supabaseQuery: useCallback(async (client) => {
      if (!memoizedSessionUserId) return { data: [], error: null };
      return client.from('t_paths').select('*').eq('user_id', memoizedSessionUserId);
    }, [memoizedSessionUserId]),
    queryKey: 't_paths_profile_page',
    supabase,
    sessionUserId: memoizedSessionUserId,
  });

  const { refresh: refreshTPathExercisesCache } = useCacheAndRevalidate<Tables<'t_path_exercises'>>({
    cacheTable: 't_path_exercises_cache',
    supabaseQuery: useCallback(async (client) => {
      if (!memoizedSessionUserId) return { data: [], error: null };
      const { data, error } = await client.from('t_path_exercises').select('id, exercise_id, template_id, order_index, is_bonus_exercise, created_at');
      return { data: data || [], error };
    }, [memoizedSessionUserId]),
    queryKey: 't_path_exercises_profile_page',
    supabase,
    sessionUserId: memoizedSessionUserId,
  });

  const totalWorkoutsCount = useLiveQuery(async () => {
    if (!memoizedSessionUserId) return 0;
    try {
      const count = await db.workout_sessions
        .where('user_id').equals(memoizedSessionUserId)
        .and(s => s.completed_at !== null)
        .count();
      return count;
    } catch (error) {
      console.error("[ProfilePage] Error fetching total workouts count from IndexedDB:", error);
      toast.error("Failed to load total workouts count.");
      return 0;
    }
  }, [memoizedSessionUserId]) || 0;

  const totalExercisesCount = useLiveQuery(async () => {
    if (!memoizedSessionUserId) return 0;
    try {
      const uniqueExerciseInstances = new Set<string>();
      const setLogs = await db.set_logs.toArray();
      const workoutSessions = await db.workout_sessions.toArray();
      const userSessionIds = new Set(workoutSessions.filter(ws => ws.user_id === memoizedSessionUserId && ws.completed_at !== null).map(ws => ws.id));

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
  }, [memoizedSessionUserId]) || 0;

  const refreshProfileData = useCallback(async () => {
    await refreshProfileCache();
    await refreshAchievementsCache();
    await refreshTPathsCache();
    await refreshTPathExercisesCache();
  }, [refreshProfileCache, refreshAchievementsCache, refreshTPathsCache, refreshTPathExercisesCache]);

  const fetchPhotos = useCallback(async () => {
    if (!memoizedSessionUserId) return;
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('user_id', memoizedSessionUserId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setPhotos(data);
    } catch (error: any) {
      console.error("Error fetching photos:", error);
      toast.error("Could not load your photos.");
    } finally {
      setLoadingPhotos(false);
    }
  }, [memoizedSessionUserId, supabase]);

  useEffect(() => {
    if (activeTab === 'photo') {
      fetchPhotos();
    }
  }, [activeTab, fetchPhotos]);

  useEffect(() => {
    if (!memoizedSessionUserId || loadingProfile) {
      return;
    }

    if (profile) {
      const profileFullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
      const profilePreferredMuscles = profile.preferred_muscles ? profile.preferred_physiques.split(',').map((m: string) => m.trim()) : []; // Corrected property name

      const currentFormValues = form.getValues();

      const needsUpdate = 
        !form.formState.isDirty ||
        currentFormValues.full_name !== profileFullName ||
        currentFormValues.height_cm !== profile.height_cm ||
        currentFormValues.weight_kg !== profile.weight_kg ||
        currentFormValues.body_fat_pct !== profile.body_fat_pct ||
        currentFormValues.primary_goal !== profile.primary_goal ||
        currentFormValues.health_notes !== profile.health_notes ||
        currentFormValues.preferred_session_length !== profile.preferred_session_length ||
        currentFormValues.programme_type !== profile.programme_type ||
        JSON.stringify(currentFormValues.preferred_muscles) !== JSON.stringify(profilePreferredMuscles);

      if (needsUpdate) {
        form.reset({
          full_name: profileFullName,
          height_cm: profile.height_cm,
          weight_kg: profile.weight_kg,
          body_fat_pct: profile.body_fat_pct,
          primary_goal: profile.primary_goal,
          health_notes: profile.health_notes,
          preferred_session_length: profile.preferred_session_length,
          preferred_muscles: profilePreferredMuscles,
          programme_type: profile.programme_type,
        });
      }

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
    }
  }, [profile, loadingProfile, session?.user.id, form]);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    refreshProfileData();
  }, [session, router, refreshProfileData]);

  const { bmi, dailyCalories } = useMemo(() => {
    const weight = profile?.weight_kg;
    const height = profile?.height_cm;
    if (!weight || !height) return { bmi: null, dailyCalories: null };
    const heightInMeters = height / 100;
    const bmiValue = (weight / (heightInMeters * heightInMeters)).toFixed(1);
    const bmr = (10 * weight) + (6.25 * height) - (5 * 30) + 5;
    const caloriesValue = Math.round(bmr * 1.375);
    return { bmi: bmiValue, dailyCalories: caloriesValue.toLocaleString() };
  }, [profile?.weight_kg, profile?.height_cm, profile?.body_fat_pct]);

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
    localStorage.setItem('profileActiveTab', value);
    router.replace(`/profile?tab=${value}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    if (emblaApi) {
      const onSelect = () => {
        const selectedIndex = emblaApi.selectedScrollSnap();
        const tabNames = ["overview", "stats", "photo", "media", "social", "settings"];
        const newTab = tabNames[selectedIndex];
        if (activeTab !== newTab) {
          handleTabChange(newTab);
        }
      };
      emblaApi.on("select", onSelect);
      onSelect(); // Initial call to sync state
      return () => { emblaApi.off("select", onSelect); };
    }
  }, [emblaApi, activeTab, handleTabChange]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const lastTab = localStorage.getItem('profileActiveTab');
    const initialTab = tabParam || lastTab || 'overview';
    setActiveTab(initialTab);
  }, []);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  return (
    <>
      <div className="p-2 sm:p-4">
        <div className="max-w-2xl mx-auto">
          <header className="mb-8 text-center">
            <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-primary/20">
              <AvatarFallback className="text-4xl font-bold">{userInitial}</AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-bold">{profile.first_name} {profile.last_name}</h1>
            <div className="flex items-center justify-center space-x-2 mt-2">
              <span className={cn("px-3 py-1 rounded-full text-xs font-bold", fitnessLevel.color, "text-white")}>{fitnessLevel.level}</span>
              <span className="text-muted-foreground text-sm">•</span>
              <span className="text-muted-foreground text-sm">Member since {new Date(profile.created_at!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            </div>
          </header>
        </div>
        
        <MobileNavigation currentPage={activeTab} onPageChange={handleTabChange} />
        
        <div className="relative w-full px-2 sm:px-4">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex items-start"> {/* Ensure slides align correctly */}
              <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 pt-0"> {/* Added min-w-0 */}
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
              <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 pt-0"> {/* Added min-w-0 */}
                <ProfileStatsTab
                  fitnessLevel={fitnessLevel}
                  profile={profile}
                />
              </div>
              <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 pt-0"> {/* Added min-w-0 */}
                <PhotoJourneyTab photos={photos} loading={loadingPhotos} />
              </div>
              <div className="embla__slide flex-[0_0_100%] min-w-0 p-0"> {/* Added min-w-0 */}
                <MediaFeedScreen />
              </div>
              <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 pt-0"> {/* Added min-w-0 */}
                <Card className="mt-6">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Social</CardTitle></CardHeader>
                  <CardContent className="text-center text-muted-foreground py-16">
                    <p>Social features coming soon!</p>
                  </CardContent>
                </Card>
              </div>
              <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 pt-0"> {/* Added min-w-0 */}
                <FormProvider {...form}>
                  <ProfileSettingsTab
                    form={form}
                    mainMuscleGroups={mainMuscleGroups}
                    aiCoachUsageToday={aiCoachUsageToday}
                    AI_COACH_DAILY_LIMIT={AI_COACH_DAILY_LIMIT}
                    onSignOut={handleSignOut}
                    profile={profile}
                    onDataChange={refreshProfileData}
                    setIsSaving={setIsSaving}
                    setTempStatusMessage={setTempStatusMessage}
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
      </div>

      {activeTab === 'photo' && (
        <Button
          size="icon"
          className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 h-14 w-14 rounded-full shadow-lg z-20"
          onClick={() => setIsCaptureFlowOpen(true)}
        >
          <Camera className="h-6 w-6" />
          <span className="sr-only">Upload Photo</span>
        </Button>
      )}

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
      <UploadPhotoDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onUploadSuccess={() => {
          fetchPhotos();
          setCapturedPhoto(null);
        }}
        initialFile={capturedPhoto}
      />
      <PhotoCaptureFlow
        open={isCaptureFlowOpen}
        onOpenChange={setIsCaptureFlowOpen}
        onPhotoCaptured={(file) => {
          setCapturedPhoto(file);
          setIsCaptureFlowOpen(false);
          setIsUploadDialogOpen(true);
        }}
      />
    </>
  );
}