"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { toast } from "sonner";
// Removed: import { TPathForm } from "@/components/manage-t-paths/t-path-form";
import { TPathList } from "@/components/manage-t-paths/t-path-list"; // This will be renamed
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

export default function ManageTPathsPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [tPaths, setTPaths] = useState<TPath[]>([]);
  const [allExercises, setAllExercises] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTPath, setEditingTPath] = useState<TPath | null>(null); // This state will be removed or repurposed
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tPathToDelete, setTPathToDelete] = useState<TPath | null>(null);

  const fetchTPathsAndExercises = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data: tData, error: tError } = await supabase
        .from('t_paths')
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
        .eq('user_id', session.user.id)
        .is('parent_t_path_id', null); // Only fetch main T-Paths
      if (tError) throw tError;
      setTPaths(tData as TPath[] || []);

      const { data: eData, error: eError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id, is_favorite, created_at, user_id')
        .or(`user_id.eq.${session.user.id},user_id.is.null`); // Fetch user's own and global exercises
      if (eError) throw eError;
      setAllExercises(eData as ExerciseDefinition[] || []);
    } catch (err: any) {
      toast.error("Failed to load data: " + err.message);
      console.error("Error fetching T-Paths or exercises:", err);
    } finally {
      setLoading(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    fetchTPathsAndExercises();
  }, [fetchTPathsAndExercises]);

  const handleEditClick = (tPath: TPath) => {
    setEditingTPath(tPath); // This will be repurposed to navigate to a new page
  };

  const handleCancelEdit = () => {
    setEditingTPath(null);
  };

  const handleSaveSuccess = () => {
    setEditingTPath(null);
    fetchTPathsAndExercises();
  };

  const handleDeleteClick = (tPath: TPath) => {
    setTPathToDelete(tPath);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTPath = async () => {
    if (!tPathToDelete || !session) return;
    try {
      // Before deleting the main T-Path, delete its child workouts and their exercises
      const { data: childWorkouts, error: fetchChildrenError } = await supabase
        .from('t_paths')
        .select('id')
        .eq('parent_t_path_id', tPathToDelete.id)
        .eq('user_id', session.user.id);

      if (fetchChildrenError) throw fetchChildrenError;

      if (childWorkouts && childWorkouts.length > 0) {
        const childWorkoutIds = childWorkouts.map(cw => cw.id);
        
        // Delete t_path_exercises for child workouts
        const { error: deleteTPathExercisesError } = await supabase
          .from('t_path_exercises')
          .delete()
          .in('template_id', childWorkoutIds);
        if (deleteTPathExercisesError) throw deleteTPathExercisesError;

        // Delete child workouts
        const { error: deleteChildWorkoutsError } = await supabase
          .from('t_paths')
          .delete()
          .in('id', childWorkoutIds);
        if (deleteChildWorkoutsError) throw deleteChildWorkoutsError;
      }

      // Finally, delete the main T-Path
      const { error: deleteMainTPathError } = await supabase
        .from('t_paths')
        .delete()
        .eq('id', tPathToDelete.id)
        .eq('user_id', session.user.id);

      if (deleteMainTPathError) throw deleteMainTPathError;

      // Also, if this was the active T-Path, clear it from the profile
      const { data: profile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('active_t_path_id')
        .eq('id', session.user.id)
        .single();

      if (profileFetchError) console.error("Error fetching profile to check active T-Path:", profileFetchError);
      
      if (profile?.active_t_path_id === tPathToDelete.id) {
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ active_t_path_id: null })
          .eq('id', session.user.id);
        if (updateProfileError) console.error("Error clearing active T-Path from profile:", updateProfileError);
      }

      toast.success("T-Path and its associated workouts deleted successfully!");
      fetchTPathsAndExercises();
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
      console.error("Error deleting T-Path:", err);
    } finally {
      setIsDeleteDialogOpen(false);
      setTPathToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-2 sm:p-4">
      <header className="mb-4"><h1 className="text-3xl font-bold">Manage Transformation Paths</h1></header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          {/* This section will be replaced by the TPathSwitcher and a message */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-primary" /> Your T-Paths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Select a Transformation Path from the list to edit its exercises.
              </p>
              {tPaths.length === 0 && !loading && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No Transformation Paths found. Please complete onboarding to set up your initial T-Paths.
                  </p>
                  <Button onClick={() => router.push('/onboarding')} className="mt-4">Go to Onboarding</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <TPathList
            tPaths={tPaths}
            loading={loading}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            isDeleteDialogOpen={isDeleteDialogOpen}
            tPathToDelete={tPathToDelete}
            setIsDeleteDialogOpen={setIsDeleteDialogOpen}
            confirmDeleteTPath={confirmDeleteTPath}
          />
        </div>
      </div>
    </div>
  );
}