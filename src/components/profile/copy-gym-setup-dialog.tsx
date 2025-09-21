"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { LoadingOverlay } from '../loading-overlay';
import { useGym } from '@/components/gym-context-provider'; // Import useGym

type Gym = Tables<'gyms'>;

interface CopyGymSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetGym: Gym;
  sourceGyms: Gym[];
  onCopySuccess: () => void;
  refreshAllData: () => void; // NEW: Add refreshAllData prop
  switchActiveGym: (gymId: string) => Promise<void>; // NEW: Add switchActiveGym prop
}

export const CopyGymSetupDialog = ({ open, onOpenChange, targetGym, sourceGyms, onCopySuccess, refreshAllData, switchActiveGym }: CopyGymSetupDialogProps) => {
  const { session } = useSession();
  const [selectedSourceGymId, setSelectedSourceGymId] = useState<string>("");
  const [isCopying, setIsCopying] = useState(false);

  const handleCopySetup = async () => {
    if (!session || !selectedSourceGymId) {
      toast.error("Please select a gym to copy from.");
      return;
    }
    setIsCopying(true);
    try {
      const response = await fetch('/api/copy-gym-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sourceGymId: selectedSourceGymId, targetGymId: targetGym.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to copy gym setup.');
      }

      toast.success(`Successfully copied setup to "${targetGym.name}"!`);
      onCopySuccess(); // Refresh parent data (e.g., gym list)
      // NEW: Refresh all data and then explicitly switch to the new gym
      await refreshAllData();
      await switchActiveGym(targetGym.id);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to copy gym setup:", err.message);
      toast.error("Failed to copy gym setup.");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Setup to "{targetGym.name}"</DialogTitle>
            <DialogDescription>
              Select an existing gym to copy its exercise list and workout plan from.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedSourceGymId} value={selectedSourceGymId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a source gym" />
              </SelectTrigger>
              <SelectContent>
                {sourceGyms.map(gym => (
                  <SelectItem key={gym.id} value={gym.id}>
                    {gym.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCopySetup} disabled={isCopying || !selectedSourceGymId}>
              {isCopying ? "Copying..." : "Copy Setup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <LoadingOverlay isOpen={isCopying} title="Copying Gym Setup" description="Please wait..." />
    </>
  );
};