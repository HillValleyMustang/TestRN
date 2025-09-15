"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables, FetchedExerciseDefinition } from "@/types/supabase";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import modular components
import { GlobalExerciseList } from "@/components/manage-exercises/global-exercise-list";
import { UserExerciseList } from "@/components/manage-exercises/user-exercise-list";
import { useManageExercisesData } from '@/hooks/use-manage-exercises-data';

// AI-related imports
import { AnalyseGymButton } from "@/components/manage-exercises/exercise-form/analyze-gym-button";
import { AnalyseGymDialog } from "@/components/manage-exercises/exercise-form/analyze-gym-dialog";
import { SaveAiExercisePrompt } from "@/components/workout-flow/save-ai-exercise-prompt";
import { toast } from "sonner";
import { EditExerciseDialog } from "@/components/manage-exercises/edit-exercise-dialog";

export default function ManageExercisesPage() {
  const { session, supabase } = useSession();
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("my-exercises");

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  const {
    globalExercises,
    userExercises,
    loading,
    editingExercise,
    handleEditClick,
    handleCancelEdit,
    handleSaveSuccess,
    handleDeleteExercise,
    selectedMuscleFilter,
    setSelectedMuscleFilter,
    availableMuscleGroups,
    exerciseWorkoutsMap,
    exerciseGymsMap,
    handleToggleFavorite,
    handleOptimisticAdd,
    handleAddFailure,
    handleRemoveFromWorkout,
    refreshExercises,
    refreshTPaths,
  } = useManageExercisesData({ sessionUserId: session?.user.id ?? null, supabase });

  // AI-related states
  const [showAnalyseGymDialog, setShowAnalyseGymDialog] = useState(false);
  const [showSaveAiExercisePrompt, setShowSaveAiExercisePrompt] = useState(false);
  const [aiIdentifiedExercise, setAiIdentifiedExercise] = useState<Partial<FetchedExerciseDefinition> | null>(null); // Use FetchedExerciseDefinition
  const [isAiSaving, setIsAiSaving] = useState(false);
  // Removed aiDuplicateStatus state as it's now part of aiIdentifiedExercise

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

  // AI Gym Analysis Handlers for Manage Exercises page
  const handleExerciseIdentified = useCallback((exercises: Partial<FetchedExerciseDefinition>[], duplicate_status: 'none' | 'global' | 'my-exercises') => {
    // For manage-exercises, we typically want to process one by one or show a list.
    // For now, let's assume we only care about the first identified exercise for the prompt.
    // If multiple are identified, the user would need to go through them one by one.
    if (exercises.length > 0) {
      setAiIdentifiedExercise(exercises[0]); // Take the first one, which now includes duplicate_status
      // No need to set aiDuplicateStatus separately
      setShowSaveAiExercisePrompt(true);
    } else {
      toast.info("No exercises were identified from the photos.");
    }
  }, []);

  const handleSaveAiExerciseToMyExercises = useCallback(async (exercise: Partial<FetchedExerciseDefinition>) => {
    if (!session) {
      toast.info("You must be logged in to save exercises.");
      return;
    }
    setIsAiSaving(true);
    try {
      const { error } = await supabase.from('exercise_definitions').insert([{
        name: exercise.name!,
        main_muscle: exercise.main_muscle!,
        type: exercise.type!,
        category: exercise.category,
        description: exercise.description,
        pro_tip: exercise.pro_tip,
        video_url: exercise.video_url,
        user_id: session.user.id,
        library_id: null,
        is_favorite: false,
        created_at: new Date().toISOString(),
      }]).select('id').single();

      if (error) {
        if (error.code === '23505') {
          toast.info("This exercise already exists in your custom exercises.");
        } else {
          throw error;
        }
      } else {
        console.log(`'${exercise.name}' added to My Exercises!`); // Replaced toast.success
        refreshExercises();
        setShowSaveAiExercisePrompt(false);
        setAiIdentifiedExercise(null);
      }
    } catch (err: any) {
      console.error("Failed to save AI identified exercise:", err);
      toast.info("Failed to save exercise.");
    } finally {
      setIsAiSaving(false);
    }
  }, [session, supabase, refreshExercises]);

  const handleEditIdentifiedExercise = useCallback((exercise: Partial<FetchedExerciseDefinition>) => {
    const exerciseToEdit: FetchedExerciseDefinition = {
      ...exercise,
      id: exercise.id || null,
      user_id: session?.user.id || null,
      is_favorite: false,
      library_id: exercise.library_id || null,
      // Explicitly cast potentially undefined values to string | null
      created_at: exercise.created_at ?? null,
      description: exercise.description ?? null,
      pro_tip: exercise.pro_tip ?? null,
      category: exercise.category ?? null,
      video_url: exercise.video_url ?? null,
      icon_url: exercise.icon_url ?? null, // Fix for icon_url
      // Ensure name, main_muscle, type are explicitly string
      name: exercise.name || '',
      main_muscle: exercise.main_muscle || '',
      type: exercise.type || 'weight', // Default to 'weight' if undefined
    };
    handleEditClick(exerciseToEdit);
    setShowSaveAiExercisePrompt(false);
    setAiIdentifiedExercise(null);
  }, [handleEditClick, session?.user.id]);


  return (
    <>
      <div className="flex flex-col gap-4 p-2 sm:p-4">
        <header className="mb-4 text-center">
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
                  <div className="embla__slide flex-[0_0_100%] min-w-0 pt-0">
                    <TabsContent value="my-exercises" className="mt-0 border-none p-0">
                      <div className="p-3">
                        <div className="mb-6">
                          <AnalyseGymButton onClick={() => setShowAnalyseGymDialog(true)} />
                        </div>
                        <UserExerciseList
                          exercises={userExercises}
                          loading={loading}
                          onEdit={handleEditClick}
                          onDelete={handleDeleteExercise}
                          editingExercise={editingExercise}
                          onCancelEdit={handleCancelEdit}
                          onSaveSuccess={handleSaveSuccess}
                          exerciseWorkoutsMap={exerciseWorkoutsMap}
                          exerciseGymsMap={exerciseGymsMap}
                          onRemoveFromWorkout={handleRemoveFromWorkout}
                          onToggleFavorite={handleToggleFavorite}
                          onAddSuccess={refreshExercises}
                          onOptimisticAdd={handleOptimisticAdd}
                          onAddFailure={handleAddFailure}
                        />
                      </div>
                    </TabsContent>
                  </div>
                  <div className="embla__slide flex-[0_0_100%] min-w-0 pt-0">
                    <TabsContent value="global-library" className="mt-0 border-none p-0">
                      <div className="p-3">
                        <GlobalExerciseList
                          exercises={globalExercises}
                          loading={loading}
                          onEdit={handleEditClick}
                          exerciseWorkoutsMap={exerciseWorkoutsMap}
                          exerciseGymsMap={exerciseGymsMap}
                          onRemoveFromWorkout={handleRemoveFromWorkout}
                          onToggleFavorite={handleToggleFavorite}
                          onAddSuccess={refreshExercises}
                          onOptimisticAdd={handleOptimisticAdd}
                          onAddFailure={handleAddFailure}
                        />
                      </div>
                    </TabsContent>
                  </div>
                </div>
              </div>
              
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

      <AnalyseGymDialog
        open={showAnalyseGymDialog}
        onOpenChange={setShowAnalyseGymDialog}
        onExerciseIdentified={handleExerciseIdentified}
      />
      <SaveAiExercisePrompt
        open={showSaveAiExercisePrompt}
        onOpenChange={setShowSaveAiExercisePrompt}
        exercise={aiIdentifiedExercise}
        onSaveToMyExercises={handleSaveAiExerciseToMyExercises}
        context="manage-exercises"
        onEditExercise={handleEditIdentifiedExercise}
        isSaving={isAiSaving}
      />
      {editingExercise && (
        <EditExerciseDialog
          open={!!editingExercise}
          onOpenChange={handleCancelEdit}
          exercise={editingExercise}
          onSaveSuccess={handleSaveSuccess}
        />
      )}
    </>
  );
}