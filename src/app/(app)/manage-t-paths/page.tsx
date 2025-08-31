"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { toast } from "sonner";
import { ActiveTPathWorkoutsList } from "@/components/manage-t-paths/active-t-path-workouts-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
// Removed: import { TPathSwitcher } from "@/components/t-path-switcher";
import { LoadingOverlay } from "@/components/loading-overlay";
import { EditWorkoutExercisesDialog } from "@/components/manage-t-paths/edit-workout-exercises-dialog"; // Import the new dialog

type TPath = Tables<'t_paths'>;
type Profile = Tables<'profiles'>;

interface WorkoutWithLastCompleted extends TPath {
  last_completed_at: string | null;
}

export default function ManageTPathsPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [activeMainTPath, setActiveMainTPath] = useState<TPath | null>(null);
  const [childWorkouts, setChildWorkouts] = useState<WorkoutWithLastCompleted[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSwitchingTPath, setIsSwitchingTPath] = useState(false); // This state is now unused but kept for potential future use if switcher is re-added
  
  const [isEditWorkoutDialogOpen, setIsEditWorkoutDialogOpen] = useState(false);
  const [selectedWorkoutToEdit, setSelectedWorkoutToEdit] = useState<{ id: string; name: string } | null>(null);

  const fetchActiveTPathAndWorkouts = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      // 1. Fetch user profile to get active_t_path_id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_t_path_id')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      const activeTPathId = profileData?.active_t_path_id;

      if (!activeTPathId) {
        // This case should ideally not happen if onboarding ensures an active T-Path
        // but we handle it gracefully.
        setActiveMainTPath(null);
        setChildWorkouts([]);
        setLoading(false);
        return;
      }

      // 2. Fetch the active main T-Path details
      const { data: mainTPathData, error: mainTPathError } = await supabase
        .from('t_paths')
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
        .eq('id', activeTPathId)
        .eq('user_id', session.user.id)
        .is('parent_t_path_id', null)
        .single();

      if (mainTPathError || !mainTPathData) {
        console.error("Active main T-Path not found or invalid:", mainTPathError);
        setActiveMainTPath(null);
        setChildWorkouts([]);
        setLoading(false);
        return;
      }
      setActiveMainTPath(mainTPathData);

      // 3. Fetch child workouts for this main T-Path
      const { data: childWorkoutsData, error: childWorkoutsError } = await supabase
        .from('t_paths')
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
        .eq('parent_t_path_id', mainTPathData.id)
        .eq('is_bonus', true) // These are the actual individual workouts
        .order('template_name', { ascending: true });

      if (childWorkoutsError) {
        throw childWorkoutsError;
      }

      // 4. Fetch last completed date for each child workout
      const workoutsWithLastDatePromises = (childWorkoutsData || []).map(async (workout) => {
        const { data: lastSessionDate } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
        return { ...workout, last_completed_at: lastSessionDate?.[0]?.session_date || null };
      });
      const childWorkoutsWithLastDate = await Promise.all(workoutsWithLastDatePromises);

      setChildWorkouts(childWorkoutsWithLastDate);

    } catch (err: any) {
      toast.error("Failed to load Transformation Path data: " + err.message);
      console.error("Error fetching T-Paths or exercises:", err);
    } finally {
      setLoading(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    fetchActiveTPathAndWorkouts();
  }, [fetchActiveTPathAndWorkouts]);

  const handleEditWorkout = (workoutId: string, workoutName: string) => {
    setSelectedWorkoutToEdit({ id: workoutId, name: workoutName });
    setIsEditWorkoutDialogOpen(true);
  };

  const handleTPathSwitch = async (newTPathId: string) => {
    setIsSwitchingTPath(true);
    // The TPathSwitcher component already handles the API call and toast messages.
    // We just need to refetch the data here.
    await fetchActiveTPathAndWorkouts();
    setIsSwitchingTPath(false);
  };

  return (
    <div className="flex flex-col gap-4 p-2 sm:p-4">
      <header className="mb-4"><h1 className="text-3xl font-bold">Manage Active Transformation Path</h1></header>
      <div className="grid grid-cols-1 gap-8"> {/* Adjusted grid layout */}
        <div className="lg:col-span-2"> {/* This div now takes full width */}
          {activeMainTPath ? (
            <ActiveTPathWorkoutsList
              activeTPathName={activeMainTPath.template_name}
              childWorkouts={childWorkouts}
              loading={loading}
              onEditWorkout={handleEditWorkout}
            />
          ) : (
            <Card>
              <CardHeader><CardTitle>Workouts</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No active Transformation Path found. Please set one in your profile.</p>
                <Button onClick={() => router.push('/profile')} className="mt-4">Go to Profile</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <LoadingOverlay 
        isOpen={isSwitchingTPath} 
        title="Switching Transformation Path" 
        description="Please wait while your new workout plan is activated." 
      />

      {selectedWorkoutToEdit && (
        <EditWorkoutExercisesDialog
          open={isEditWorkoutDialogOpen}
          onOpenChange={setIsEditWorkoutDialogOpen}
          workoutId={selectedWorkoutToEdit.id}
          workoutName={selectedWorkoutToEdit.name}
          onSaveSuccess={fetchActiveTPathAndWorkouts} // Refresh the list after saving changes in the dialog
        />
      )}
    </div>
  );
}