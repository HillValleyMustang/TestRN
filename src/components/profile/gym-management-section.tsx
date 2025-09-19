"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Home, PlusCircle, Edit, Trash2, Dumbbell } from 'lucide-react'; // Added Dumbbell
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { Tables, Profile } from '@/types/supabase';
import { useGym } from '@/components/gym-context-provider';
import { AddGymDialog } from './add-gym-dialog';
import { ManageGymExercisesDialog } from './manage-gym-exercises-dialog'; // Import new dialog

type Gym = Tables<'gyms'>;

interface GymManagementSectionProps {
  isEditing: boolean;
  profile: Profile | null;
  onDataChange: () => void; // Callback to refresh parent data
}

export const GymManagementSection = ({ isEditing, profile, onDataChange }: GymManagementSectionProps) => {
  const { session, supabase } = useSession();
  const { refreshGyms } = useGym();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);

  // State for dialogs
  const [isAddGymDialogOpen, setIsAddGymDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLastGymWarningOpen, setIsLastGymWarningOpen] = useState(false);
  const [isManageExercisesDialogOpen, setIsManageExercisesDialogOpen] = useState(false); // New state

  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [newGymName, setNewGymName] = useState("");

  const fetchGyms = async () => {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Failed to load gyms:", error.message);
      toast.error("Failed to load gyms.");
    } else {
      setGyms(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGyms();
  }, [session]);

  const handleRenameGym = async () => {
    if (!session || !selectedGym || !newGymName.trim()) return;

    const { error } = await supabase.from('gyms').update({ name: newGymName }).eq('id', selectedGym.id);
    if (error) {
      console.error("Failed to rename gym:", error.message);
      toast.error("Failed to rename gym.");
    } else {
      toast.success("Gym renamed successfully!");
      await fetchGyms();
      onDataChange();
      refreshGyms();
      setIsRenameDialogOpen(false);
      setNewGymName("");
      setSelectedGym(null);
    }
  };

  const handleDeleteGym = async () => {
    if (!session || !selectedGym || !profile) return;

    setIsDeleteDialogOpen(false);

    if (gyms.length === 1) {
      setIsLastGymWarningOpen(true);
      return;
    }

    try {
      if (selectedGym.id === profile.active_gym_id) {
        const nextActiveGym = gyms.find(g => g.id !== selectedGym.id);
        if (nextActiveGym) {
          await supabase.from('profiles').update({ active_gym_id: nextActiveGym.id }).eq('id', session.user.id);
        }
      }
      const { error } = await supabase.from('gyms').delete().eq('id', selectedGym.id);
      if (error) throw error;

      toast.success(`Gym "${selectedGym.name}" deleted.`);
      await fetchGyms();
      onDataChange();
      refreshGyms();
    } catch (err: any) {
      console.error("Failed to delete gym:", err.message);
      toast.error("Failed to delete gym.");
    } finally {
      setSelectedGym(null);
    }
  };

  const handleConfirmDeleteLastGym = async () => {
    if (!session || !selectedGym || !profile?.active_t_path_id) return;
    setIsLastGymWarningOpen(false);
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
      await fetchGyms();
      onDataChange();
      refreshGyms();
    } catch (err: any) {
      console.error("Failed to delete last gym:", err.message);
      toast.error("Failed to delete last gym.", { id: toastId });
    } finally {
      setSelectedGym(null);
    }
  };

  const handleAddSuccess = () => {
    fetchGyms();
    onDataChange();
    refreshGyms();
  };

  return (
    <>
      <Card className="bg-card">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" /> My Gyms
          </CardTitle>
          <CardDescription>
            Manage your saved gyms. You can have up to 3.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {loading ? (
            <p>Loading gyms...</p>
          ) : (
            <ul className="space-y-2">
              {gyms.map(gym => (
                <li key={gym.id} className="flex items-center justify-between p-2 border rounded-md">
                  <span className="font-medium">{gym.name}</span>
                  {isEditing && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Manage Exercises" onClick={() => { setSelectedGym(gym); setIsManageExercisesDialogOpen(true); }}>
                        <Dumbbell className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Rename Gym" onClick={() => { setSelectedGym(gym); setNewGymName(gym.name); setIsRenameDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete Gym" onClick={() => { setSelectedGym(gym); setIsDeleteDialogOpen(true); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {isEditing && gyms.length < 3 && (
            <Button variant="outline" className="w-full" onClick={() => setIsAddGymDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add New Gym
            </Button>
          )}
        </CardContent>
      </Card>

      <AddGymDialog
        open={isAddGymDialogOpen}
        onOpenChange={setIsAddGymDialogOpen}
        onSaveSuccess={handleAddSuccess}
        gymCount={gyms.length}
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
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameGym}>Save</Button>
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

      <ManageGymExercisesDialog
        open={isManageExercisesDialogOpen}
        onOpenChange={setIsManageExercisesDialogOpen}
        gym={selectedGym}
        onSaveSuccess={() => {
          fetchGyms();
          onDataChange();
          refreshGyms();
        }}
      />
    </>
  );
};