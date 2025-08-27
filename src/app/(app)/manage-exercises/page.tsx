"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { toast } from "sonner";
import { GlobalExerciseList } from "@/components/manage-exercises/global-exercise-list";
import { UserExerciseList } from "@/components/manage-exercises/user-exercise-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import useEmblaCarousel from 'embla-carousel-react';
import { getMaxMinutes } from '@/lib/utils'; // Import getMaxMinutes

// Extend the ExerciseDefinition type to include a temporary flag for global exercises
interface FetchedExerciseDefinition extends Tables<'exercise_definitions'> {
  is_favorited_by_current_user?: boolean;
}

type TPath = Tables<'t_paths'>;
type TPathExercise = Tables<'t_path_exercises'>;

export default function ManageExercisesPage() {
  const { session, supabase } = useSession();
  const [globalExercises, setGlobalExercises] = useState<FetchedExerciseDefinition[]>([]);
  const [userExercises, setUserExercises] = useState<FetchedExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExercise, setEditingExercise] = useState<FetchedExerciseDefinition | null>(null);
  // Removed isDeleteDialogOpen, exerciseToDelete, setIsDeleteDialogOpen, confirmDeleteExercise
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('all');
  const [availableMuscleGroups, setAvailableMuscleGroups] = useState<string[]>([]);
  const [exerciseWorkoutsMap, setExerciseWorkoutsMap] = useState<Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>>({});
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("my-exercises");

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  const fetchExercises = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      // Fetch user profile to get preferred_session_length and active_t_path_id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('preferred_session_length, active_t_path_id')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching user profile for filtering:", profileError);
      }

      const preferredSessionLength = profileData?.preferred_session_length;
      const activeTPathId = profileData?.active_t_path_id;
      const maxAllowedMinutes = getMaxMinutes(preferredSessionLength);

      let workoutSplit: string | null = null;
      if (activeTPathId) {
        const { data: activeTPath, error: activeTPathError } = await supabase
          .from('t_paths')
          .select('settings')
          .eq('id', activeTPathId)
          .single();
        if (activeTPathError) {
          console.error("Error fetching active T-Path settings:", activeTPathError);
        } else if (activeTPath?.settings && typeof activeTPath.settings === 'object' && 'tPathType' in activeTPath.settings) {
          workoutSplit = (activeTPath.settings as { tPathType: string }).tPathType;
        }
      }

      // Fetch all exercises (user's own and global ones)
      const { data: allExercisesData, error: allExercisesError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite')
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .order('name', { ascending: true });

      if (allExercisesError) {
        throw new Error(allExercisesError.message);
      }

      // Fetch user's global favourites
      const { data: userGlobalFavorites, error: favoritesError } = await supabase
        .from('user_global_favorites')
        .select('exercise_id')
        .eq('user_id', session.user.id);

      if (favoritesError) {
        throw new Error(favoritesError.message);
      }
      const favoritedGlobalExerciseIds = new Set(userGlobalFavorites?.map(fav => fav.exercise_id));

      // Fetch only the child workouts of the *active* T-Path
      let activeTPathChildWorkouts: TPath[] = [];
      if (activeTPathId) {
          const { data: childWorkoutsData, error: childWorkoutsError } = await supabase
              .from('t_paths')
              .select('id, template_name, user_id')
              .eq('parent_t_path_id', activeTPathId) // Filter by active parent T-Path
              .eq('is_bonus', true); // Ensure they are child workouts
          if (childWorkoutsError) {
              console.error("Error fetching child workouts for active T-Path:", childWorkoutsError);
          } else {
              activeTPathChildWorkouts = childWorkoutsData as TPath[];
          }
      }

      const activeWorkoutIds = activeTPathChildWorkouts.map(tp => tp.id);

      const { data: tPathExercisesData, error: tPathExercisesError } = await supabase
        .from('t_path_exercises')
        .select('exercise_id, template_id, is_bonus_exercise')
        .in('template_id', activeWorkoutIds); // Filter by active child workout IDs

      if (tPathExercisesError) {
        throw new Error(tPathExercisesError.message);
      }

      // Build exerciseWorkoutsMap
      const newExerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]> = {};
      tPathExercisesData.forEach(tpe => {
        const workout = activeTPathChildWorkouts.find(tp => tp.id === tpe.template_id);
        if (workout) {
          if (!newExerciseWorkoutsMap[tpe.exercise_id]) {
            newExerciseWorkoutsMap[tpe.exercise_id] = [];
          }
          newExerciseWorkoutsMap[tpe.exercise_id].push({
            id: workout.id,
            name: workout.template_name,
            isUserOwned: workout.user_id === session.user.id,
            isBonus: !!tpe.is_bonus_exercise,
          });
        }
      });
      setExerciseWorkoutsMap(newExerciseWorkoutsMap);

      const userOwnedMap = new Map<string, FetchedExerciseDefinition>(); // Key: library_id or exercise.id
      const globalMap = new Map<string, FetchedExerciseDefinition>(); // Key: library_id

      // Populate user-owned exercises first
      allExercisesData.filter(ex => ex.user_id === session.user.id).forEach(ex => {
        const key = ex.library_id || ex.id; // Use library_id if available, otherwise its own ID
        userOwnedMap.set(key, { ...ex, is_favorite: !!ex.is_favorite }); // Ensure is_favorite is boolean
      });

      // Populate global exercises, ensuring no duplicates with user-owned versions
      // Removed the isRelevantToSessionLength filter for global exercises
      allExercisesData.filter(ex => ex.user_id === null).forEach(ex => {
        const isUserOwnedCopy = ex.library_id && userOwnedMap.has(ex.library_id);
        
        if (!isUserOwnedCopy) { // Only filter out if user has an adopted copy
          globalMap.set(ex.id, { // Use actual ID for global map key
            ...ex,
            is_favorited_by_current_user: favoritedGlobalExerciseIds.has(ex.id)
          });
        }
      });

      let finalUserExercises = Array.from(userOwnedMap.values());
      let finalGlobalExercises = Array.from(globalMap.values());

      // Extract unique muscle groups for the filter dropdown from *all* exercises
      const allUniqueMuscles = Array.from(new Set(allExercisesData.map(ex => ex.main_muscle))).sort();
      setAvailableMuscleGroups(allUniqueMuscles);

      // Apply the selected filter to both lists
      if (selectedMuscleFilter === 'favorites') {
        finalUserExercises = finalUserExercises.filter(ex => ex.is_favorite);
        finalGlobalExercises = finalGlobalExercises.filter(ex => ex.is_favorited_by_current_user);
      } else if (selectedMuscleFilter !== 'all') {
        finalUserExercises = finalUserExercises.filter(ex => ex.main_muscle === selectedMuscleFilter);
        finalGlobalExercises = finalGlobalExercises.filter(ex => ex.main_muscle === selectedMuscleFilter);
      }

      finalUserExercises.sort((a, b) => a.name.localeCompare(b.name));
      finalGlobalExercises.sort((a, b) => a.name.localeCompare(b.name));

      setUserExercises(finalUserExercises);
      setGlobalExercises(finalGlobalExercises);

    } catch (err: any) {
      toast.error("Failed to load exercises: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [session, supabase, selectedMuscleFilter]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const handleEditClick = (exercise: FetchedExerciseDefinition) => {
    setEditingExercise(exercise);
  };

  const handleCancelEdit = () => {
    setEditingExercise(null);
  };

  const handleSaveSuccess = () => {
    setEditingExercise(null);
    fetchExercises();
  };

  // This function is now passed to ExerciseInfoDialog for user-created exercises
  const handleDeleteExercise = async (exercise: FetchedExerciseDefinition) => {
    if (!session) {
      toast.error("You must be logged in to delete exercises.");
      return;
    }
    // The check for user_id === null is now handled by the component calling this (ExerciseInfoDialog)
    // and by the UI logic that only shows the delete button for user-created exercises.
    if (!exercise.id) {
      toast.error("Cannot delete an exercise without an ID.");
      return;
    }

    try {
      const { error } = await supabase.from('exercise_definitions').delete().eq('id', exercise.id);
      if (error) {
        throw new Error(error.message);
      }
      toast.success("Exercise deleted successfully!");
      fetchExercises(); // Re-fetch to update the list
    } catch (err: any) {
      console.error("Failed to delete exercise:", err);
      toast.error("Failed to delete exercise: " + err.message);
    }
  };

  const handleToggleFavorite = async (exercise: FetchedExerciseDefinition) => {
    if (!session) {
      toast.error("You must be logged in to favourite exercises.");
      return;
    }
    try {
      if (exercise.user_id === session.user.id) {
        // This is a user-owned exercise, toggle its is_favorite flag
        const newFavoriteStatus = !exercise.is_favorite;
        const { error } = await supabase
          .from('exercise_definitions')
          .update({ is_favorite: newFavoriteStatus })
          .eq('id', exercise.id)
          .eq('user_id', session.user.id);

        if (error) throw error;
        toast.success(newFavoriteStatus ? "Added to favourites!" : "Removed from favourites.");
      } else if (exercise.user_id === null) {
        // This is a global exercise, toggle its status in user_global_favorites
        const isCurrentlyFavorited = exercise.is_favorited_by_current_user;
        if (isCurrentlyFavorited) {
          const { error } = await supabase
            .from('user_global_favorites')
            .delete()
            .eq('user_id', session.user.id)
            .eq('exercise_id', exercise.id);
          if (error) throw error;
          toast.success("Removed from favourites.");
        } else {
          const { error } = await supabase
            .from('user_global_favorites')
            .insert({ user_id: session.user.id, exercise_id: exercise.id });
          if (error) throw error;
          toast.success("Added to favourites!");
        }
      }
      fetchExercises(); // Re-fetch to update UI
    } catch (err: any) {
      console.error("Failed to toggle favourite status:", err);
      toast.error("Failed to update favourite status: " + err.message);
    }
  };

  const handleRemoveFromWorkout = async (workoutId: string, exerciseId: string) => {
    if (!session) {
      toast.error("You must be logged in to remove exercises from workouts.");
      return;
    }

    if (!confirm("Are you sure you want to remove this exercise from the workout? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('t_path_exercises')
        .delete()
        .eq('template_id', workoutId)
        .eq('exercise_id', exerciseId);

      if (error) {
        throw error;
      }
      toast.success("Exercise removed from workout successfully!");
      fetchExercises(); // Re-fetch to update UI
    } catch (err: any) {
      console.error("Failed to remove exercise from workout:", err);
      toast.error("Failed to remove exercise from workout: " + err.message);
    }
  };

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    if (emblaApi) {
      const index = value === "my-exercises" ? 0 : 1;
      emblaApi.scrollTo(index);
    }
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const selectedIndex = emblaApi.selectedScrollSnap();
      setActiveTab(selectedIndex === 0 ? "my-exercises" : "global-library");
    };

    emblaApi.on("select", onSelect);
    onSelect(); // Set initial tab based on carousel position

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

  return (
    <div className="flex flex-col gap-4 p-2 sm:p-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Manage Exercises</h1>
      </header>
      
      <Card>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <TabsList className="grid grid-cols-2 h-9 flex-grow max-w-[calc(100%-60px)]">
              <TabsTrigger value="my-exercises">My Exercises</TabsTrigger>
              <TabsTrigger value="global-library">Global Library</TabsTrigger>
            </TabsList>
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 ml-2">
                  <Filter className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filter</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-fit max-h-[80vh]">
                <SheetHeader>
                  <SheetTitle>Filter Exercises by Muscle Group</SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  <Select onValueChange={setSelectedMuscleFilter} value={selectedMuscleFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter by Muscle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Muscle Groups</SelectItem>
                      <SelectItem value="favorites">Favourites</SelectItem>
                      {availableMuscleGroups.map(muscle => (
                        <SelectItem key={muscle} value={muscle}>
                          {muscle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 pt-0"> {/* Changed p-4 to px-2 */}
                  <TabsContent value="my-exercises" className="mt-0 border-none p-0">
                    <UserExerciseList
                      exercises={userExercises}
                      loading={loading}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteExercise} // Pass the new delete handler
                      // Removed isDeleteDialogOpen, exerciseToDelete, setIsDeleteDialogOpen, confirmDeleteTPath
                      editingExercise={editingExercise}
                      onCancelEdit={handleCancelEdit}
                      onSaveSuccess={handleSaveSuccess}
                      exerciseWorkoutsMap={exerciseWorkoutsMap}
                      onRemoveFromWorkout={handleRemoveFromWorkout}
                      onToggleFavorite={handleToggleFavorite}
                      onAddSuccess={fetchExercises} // Pass onAddSuccess
                    />
                  </TabsContent>
                </div>
                <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 pt-0"> {/* Changed p-4 to px-2 */}
                  <TabsContent value="global-library" className="mt-0 border-none p-0">
                    <GlobalExerciseList
                      exercises={globalExercises}
                      loading={loading}
                      onEdit={handleEditClick}
                      exerciseWorkoutsMap={exerciseWorkoutsMap}
                      onRemoveFromWorkout={handleRemoveFromWorkout}
                      onToggleFavorite={handleToggleFavorite}
                      onAddSuccess={fetchExercises}
                    />
                  </TabsContent>
                </div>
              </div>
            </div>
            
            {/* Navigation Buttons for Carousel */}
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden sm:flex"
              disabled={activeTab === "my-exercises"}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden sm:flex"
              disabled={activeTab === "global-library"}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}