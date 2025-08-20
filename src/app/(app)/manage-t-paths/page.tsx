"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { toast } from "sonner";
import { TPathForm } from "@/components/manage-t-paths/t-path-form";
import { TPathList } from "@/components/manage-t-paths/t-path-list";

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

export default function ManageTPathsPage() {
  const { session, supabase } = useSession();
  const [tPaths, setTPaths] = useState<TPath[]>([]);
  const [allExercises, setAllExercises] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTPath, setEditingTPath] = useState<TPath | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tPathToDelete, setTPathToDelete] = useState<TPath | null>(null);

  const fetchTPathsAndExercises = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data: tData, error: tError } = await supabase
      .from('t_paths')
      .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id') // Specify all columns required by TPath
      .eq('user_id', session.user.id);
    if (tError) toast.error("Failed to load T-Paths"); else setTPaths(tData as TPath[] || []); // Explicitly cast
    const { data: eData, error: eError } = await supabase
      .from('exercise_definitions')
      .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id, is_favorite, created_at, user_id') // Specify all columns required by ExerciseDefinition
      .eq('user_id', session.user.id);
    if (eError) toast.error("Failed to load exercises"); else setAllExercises(eData as ExerciseDefinition[] || []); // Explicitly cast
    setLoading(false);
  }, [session, supabase]);

  useEffect(() => {
    fetchTPathsAndExercises();
  }, [fetchTPathsAndExercises]);

  const handleEditClick = (tPath: TPath) => {
    setEditingTPath(tPath);
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
    if (!tPathToDelete) return;
    const { error } = await supabase.from('t_paths').delete().eq('id', tPathToDelete.id);
    if (error) {
      toast.error("Delete failed: " + error.message);
    } else {
      toast.success("T-Path deleted");
      fetchTPathsAndExercises();
    }
    setIsDeleteDialogOpen(false);
    setTPathToDelete(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-4"><h1 className="text-3xl font-bold">Manage Transformation Paths</h1></header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <TPathForm
            editingTPath={editingTPath}
            onCancelEdit={handleCancelEdit}
            onSaveSuccess={handleSaveSuccess}
            allExercises={allExercises}
          />
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