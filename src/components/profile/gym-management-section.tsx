"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Home, PlusCircle, Edit, Trash2, Dumbbell, Save, Loader2 } from 'lucide-react'; // Added Save, Loader2
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { Tables, Profile } from '@/types/supabase';
import { useGym } from '@/components/gym-context-provider';
import { AddGymDialog } from './add-gym-dialog';
import { ManageGymWorkoutsExercisesDialog } from './gym-exercise-manager'; // Import the NEW component

type Gym = Tables<'gyms'>;

interface GymManagementSectionProps {
  profile: Profile | null;
  onDataChange: () => void; // Callback to refresh parent data
  setIsSaving: (isSaving: boolean) => void;
}

export const GymManagementSection = ({ profile, onDataChange, setIsSaving }: GymManagementSectionProps) => {
  const { session, supabase } = useSession();
  const { userGyms, activeGym, refreshGyms } = useGym(); // Use userGyms and activeGym from context
  const [loading, setLoading] = useState(true); // Keep local loading for dialogs/actions
  const [isEditing, setIsEditing] = useState(false); // Local editing state for this section

  // State for dialogs
  const [isAddGymDialogOpen, setIsAddGymDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLastGymWarningOpen, setIsLastGymWarningOpen] = useState(false);
  const [isManageExercisesDialogOpen, setIsManageExercisesDialogOpen] = useState(false); // Renamed state

  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [newGymName, setNewGymName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false); // Local state for rename operation

  // Set local loading state based on userGyms availability
  useEffect(() => {
    setLoading(userGyms === undefined);
  }, [userGyms]);

  const handleRenameGym = async () => {
    if (!session || !selectedGym || !newGymName.trim()) {
      toast.error("Gym name cannot be empty.");
      return;
    }

    setIsRenaming(true); // Set local renaming state
    setIsSaving(true); // Set global saving state
    try {
      const { error } = await supabase.from('gyms').update({ name: newGymName }).eq('id', selectedGym.id);
      if (error) throw error;

      toast.success("Gym renamed successfully!");
      onDataChange(); // Trigger parent refresh
      refreshGyms(); // Refresh the gym context
      setIsRenameDialogOpen(false);
      setNewGymName("");
      setSelectedGym(null);
    } catch (err: any) {
      console.error("Failed to rename gym:", err.message);
      toast.error("Failed to rename gym.");
    } finally {
      setIsRenaming(false); // Clear local renaming state
      setIsSaving(false); // Clear global saving state
    }
  };

  const handleDeleteGym = async () => {
    if (!session || !selectedGym || !profile) {
      toast.error("Cannot delete gym: session or profile data missing.");
      return;
    }

    setIsDeleteDialogOpen(false);

    if (userGyms.length === 1) { // Use userGyms from context
      setIsLastGymWarningOpen(true);
      return;
    }

    setIsSaving(true); // Set global saving state
    try {
      if (selectedGym.id === profile.active_gym_id) {
        const nextActiveGym = userGyms.find(g => g.id !== selectedGym.id); // Use userGyms
        if (nextActiveGym) {
          const { error: updateProfileError } = await supabase.from('profiles').update({ active_gym_id: nextActiveGym.id }).eq('id', session.user.id);
          if (updateProfileError) throw updateProfileError;
        }
      }
      const { error } = await supabase.from('gyms').delete().eq('id', selectedGym.id);
      if (error) throw error;

      toast.success(`Gym "${selectedGym.name}" deleted.`);
      onDataChange(); // Trigger parent refresh
      refreshGyms(); // Refresh the gym context
    } catch (err: any) {
      console.error("Failed to delete gym:", err.message);
      toast.error("Failed to delete gym.");
    } finally {
      setIsSaving(false); // Clear global saving state
      setSelectedGym(null);
    }
  };

  const handleConfirmDeleteLastGym = async () => {
    if (!session || !selectedGym || !profile?.active_t_path_id) {
      toast.error("Cannot delete last gym: session, selected gym, or active T-Path data missing.");
      return;
    }
    setIsLastGymWarningOpen(false);
    setIsSaving(true); // Set global saving state
    const toastId = toast.loading("Resetting workout plan and deleting gym...");

    try {
      const response = await fetch(`/api/generate-t-path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ tPathId: profile.active_t_path_id })
      });
      if (!response.ok) throw new Error("Failed to reset workout plan.");

      const { error: deleteError } = await supabase.from('gyms').delete().eq('id', selectedGym.id);
      if (deleteError) throw deleteError;

      const { error: profileError } = await supabase.from('profiles').update({ active_gym_id: null }).eq('id', session.user.id);
      if (profileError) throw profileError;

      toast.success("Last gym deleted and workout plan reset to defaults.", { id: toastId });
      onDataChange(); // Trigger parent refresh
      refreshGyms(); // Refresh the gym context
    } catch (err: any) {
      console.error("Failed to delete last gym:", err.message);
      toast.error(`Failed to delete last gym: ${err.message}`, { id: toastId });
    } finally {
      setIsSaving(false); // Clear global saving state
      setSelectedGym(null);
    }
  };

  const handleAddSuccess = () => {
    refreshGyms(); // This should be sufficient to trigger revalidation and UI update
    onDataChange(); // NEW: Trigger parent refresh for profile data
  };

  return (
    <>
      <Card className="bg-card">
        <CardHeader className="border-b border-border/50 pb-4 flex flex-row items-center justify-between"> {/* Adjusted for buttons */}
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" /> My Gyms
          </CardTitle>
          {isEditing ? (
            <Button onClick={() => setIsEditing(false)} size="sm" variant="outline">
              <Save className="h-4 w-4 mr-2" /> Done
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(true)} size="sm" variant="outline">
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {loading ? (
            <p>Loading gyms...</p>
          ) : (
            <ul className="space-y-2">
              {userGyms.map(gym => ( // Use userGyms from context
                <li key={gym.id} className="flex items-center justify-between p-2 border rounded-md">
                  <span className="font-medium">{gym.name}</span>
                  {isEditing && (
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" title="Manage Exercises" onClick={() => { setSelectedGym(gym); setIsManageExercisesDialogOpen(true); }}>
                        <Dumbbell className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" title="Rename Gym" onClick={() => { setSelectedGym(gym); setNewGymName(gym.name); setIsRenameDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" title="Delete Gym" onClick={() => { setSelectedGym(gym); setIsDeleteDialogOpen(true); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {isEditing && userGyms.length < 3 && ( // Use userGyms.length
            <Button type="button" variant="outline" className="w-full" onClick={() => setIsAddGymDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add New Gym
            </Button>
          )}
        </CardContent>
      </Card>

      <AddGymDialog
        open={isAddGymDialogOpen}
        onOpenChange={setIsAddGymDialogOpen}
        onSaveSuccess={handleAddSuccess}
        gymCount={userGyms.length} // Pass userGyms.length
      />

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Gym</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g., Home Gym, Fitness First"
              value={newGymName}
              onChange={(e) => setNewGymName(e.target.value)}
              disabled={isRenaming}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)} disabled={isRenaming}>Cancel</Button>
            <Button onClick={handleRenameGym} disabled={isRenaming || !newGymName.trim()}>
              {isRenaming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isRenaming ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the gym "{selectedGym?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGym}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isLastGymWarningOpen} onOpenChange={setIsLastGymWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Warning: Deleting Last Gym</AlertDialogTitle>
            <AlertDialogDescription>
              This is your last gym. Deleting it will reset your current workout plan to use default "common gym" exercises. Your T-Path and session preferences will be kept. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteLastGym}>Continue and Reset Plan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManageGymWorkoutsExercisesDialog // Changed to the new component name
        open={isManageExercisesDialogOpen}
        onOpenChange={setIsManageExercisesDialogOpen}
        gym={selectedGym}
        onSaveSuccess={() => {
          onDataChange();
          refreshGyms();
        }}
        profile={profile} // NEW: Pass profile
      />
    </>
  );
};