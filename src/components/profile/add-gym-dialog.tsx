"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { SetupGymView } from './setup-gym-view';
import { GymPhotoSetupStep } from './gym-photo-setup-step';

type Gym = Tables<'gyms'>;

interface AddGymDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess: () => void;
  gymCount: number;
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void;
}

export const AddGymDialog = ({ open, onOpenChange, onSaveSuccess, gymCount, setTempStatusMessage }: AddGymDialogProps) => {
  const { session, supabase, memoizedSessionUserId } = useSession();
  const [step, setStep] = useState<'name' | 'configure' | 'ai-upload'>('name');
  const [newGymName, setNewGymName] = useState("");
  const [createdGym, setCreatedGym] = useState<Gym | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    if (createdGym) {
      onSaveSuccess();
    }
    onOpenChange(false);
    setTimeout(() => {
      setStep('name');
      setNewGymName("");
      setCreatedGym(null);
      setIsSaving(false);
    }, 300);
  };

  const handleNameSubmit = async () => {
    if (!memoizedSessionUserId) {
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return;
    }
    if (!newGymName.trim()) {
      setTempStatusMessage({ message: "Name empty!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return;
    }
    if (gymCount >= 3) {
      setTempStatusMessage({ message: "Max 3 gyms!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return;
    }

    setIsSaving(true);
    try {
      const { data: insertedGym, error } = await supabase
        .from('gyms')
        .insert({ name: newGymName, user_id: memoizedSessionUserId })
        .select('*')
        .single();

      if (error) throw error;

      setCreatedGym(insertedGym);
      setStep('configure');
      setTempStatusMessage({ message: "Added!", type: 'success' });
      setTimeout(() => setTempStatusMessage(null), 3000);
    } catch (err: any) {
      console.error("Failed to add gym:", err.message);
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
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
            onSelectAiSetup={() => setStep('ai-upload')}
            setTempStatusMessage={setTempStatusMessage}
          />
        )}
        {step === 'ai-upload' && createdGym && (
          <GymPhotoSetupStep
            gym={createdGym}
            onBack={() => setStep('configure')}
            onFinish={handleClose}
            setTempStatusMessage={setTempStatusMessage}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};