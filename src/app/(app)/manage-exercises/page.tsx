"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
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
import { useManageExercisesData } from '@/hooks/use-manage-exercises-data'; // Import the new hook

// Extend the ExerciseDefinition type to include a temporary flag for global exercises
interface FetchedExerciseDefinition extends Tables<'exercise_definitions'> {
  is_favorited_by_current_user?: boolean;
}

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
    handleToggleFavorite,
    handleOptimisticAdd,
    handleAddFailure,
    handleRemoveFromWorkout,
    refreshExercises,
    refreshTPaths,
  } = useManageExercisesData({ sessionUserId: session?.user.id || null, supabase });

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
                    <UserExerciseList
                      exercises={userExercises}
                      loading={loading}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteExercise}
                      editingExercise={editingExercise}
                      onCancelEdit={handleCancelEdit}
                      onSaveSuccess={handleSaveSuccess}
                      exerciseWorkoutsMap={exerciseWorkoutsMap}
                      onRemoveFromWorkout={handleRemoveFromWorkout}
                      onToggleFavorite={handleToggleFavorite}
                      onAddSuccess={refreshExercises}
                      onOptimisticAdd={handleOptimisticAdd}
                      onAddFailure={handleAddFailure}
                    />
                  </TabsContent>
                </div>
                <div className="embla__slide flex-[0_0_100%] min-w-0 pt-0">
                  <TabsContent value="global-library" className="mt-0 border-none p-0">
                    <GlobalExerciseList
                      exercises={globalExercises}
                      loading={loading}
                      onEdit={handleEditClick}
                      exerciseWorkoutsMap={exerciseWorkoutsMap}
                      onRemoveFromWorkout={handleRemoveFromWorkout}
                      onToggleFavorite={handleToggleFavorite}
                      onAddSuccess={refreshExercises}
                      onOptimisticAdd={handleOptimisticAdd}
                      onAddFailure={handleAddFailure}
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