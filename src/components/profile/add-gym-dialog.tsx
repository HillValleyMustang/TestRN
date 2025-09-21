"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { SetupGymView } from './setup-gym-view';
import { useGym } from '@/components/gym-context-provider'; // Import useGym

type Gym = Tables<'gyms'>;

interface AddGymDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess: () => void; // To refresh the parent list
  gymCount: number;
  refreshAllData: () => void; // NEW: Add refreshAllData prop
}

export const AddGymDialog = ({ open, onOpenChange, onSaveSuccess, gymCount, refreshAllData }: AddGymDialogProps) => {
  const { session, supabase } = useSession();
  const { switchActiveGym } = useGym(); // NEW: Get switchActiveGym from context
  const [step, setStep] = useState<'name' | 'configure'>('name');
  const [newGymName, setNewGymName] = useState("");
  const [createdGym, setCreatedGym] = useState<Gym | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after a short delay to allow for closing animation
    setTimeout(() => {
      setStep('name');
      setNewGymName("");
      setCreatedGym(null);
      setIsSaving(false);
    }, 300);
  };

  const handleNameSubmit = async () => {
    if (!session || !newGymName.trim()) return;
    if (gymCount >= 3) {
      toast.error("You can have a maximum of 3 gyms.");
      return;
    }

    setIsSaving(true);
    try {
      const { data: insertedGym, error } = await supabase
        .from('gyms')
        .insert({ name: newGymName, user_id: session.user.id })
        .select('*')
        .single();

      if (error) throw error;

      setCreatedGym(insertedGym);
      setStep('configure');
      onSaveSuccess(); // Refresh the list in the background
      // NEW: After successful gym creation, refresh all data and switch to the new gym
      await refreshAllData();
      await switchActiveGym(insertedGym.id);
    } catch (err: any) {
      console.error("Failed to add gym:", err.message);
      toast.error("Failed to add gym.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'name' && (
          <>
            <DialogHeader>
              <DialogTitle>Add New Gym</DialogTitle>
              <DialogDescription>
                Give your new gym a name. You can have up to 3 gyms.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="e.g., Home Gym, Fitness First"
                value={newGymName}
                onChange={(e) => setNewGymName(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleNameSubmit} disabled={isSaving || !newGymName.trim()}>
                {isSaving ? "Saving..." : "Save & Continue"}
              </Button>
            </DialogFooter>
          </>
        )}
        {step === 'configure' && createdGym && (
          <SetupGymView 
            gym={createdGym} 
            onClose={handleClose} 
            refreshAllData={refreshAllData} // NEW: Pass refreshAllData
            switchActiveGym={switchActiveGym} // NEW: Pass switchActiveGym
          />
        )}
      </DialogContent>
    </Dialog>
  );
};