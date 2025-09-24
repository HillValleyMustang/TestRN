"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { LoadingOverlay } from '../loading-overlay';

type Gym = Tables<'gyms'>;

interface CopyGymSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetGym: Gym;
  sourceGyms: Gym[];
  onCopySuccess: () => Promise<void>; // Changed to return a Promise
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void; // NEW
}

export const CopyGymSetupDialog = ({ open, onOpenChange, targetGym, sourceGyms, onCopySuccess, setTempStatusMessage }: CopyGymSetupDialogProps) => {
  const { session, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId
  const [selectedSourceGymId, setSelectedSourceGymId] = useState<string>("");
  const [isCopying, setIsCopying] = useState(false);

  const handleCopySetup = async () => {
    if (!memoizedSessionUserId) { // Use memoized ID
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return;
    }
    if (!selectedSourceGymId) {
      setTempStatusMessage({ message: "Select gym!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return;
    }
    setIsCopying(true);
    try {
      const response = await fetch('/api/copy-gym-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`, // Use session?.access_token
        },
        body: JSON.stringify({ sourceGymId: selectedSourceGymId, targetGymId: targetGym.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to copy gym setup.');
      }

      // CRITICAL FIX: Await the data refresh before closing the dialog and showing success.
      await onCopySuccess();

      setTempStatusMessage({ message: "Copied!", type: 'success' });
      onOpenChange(false);
      setTimeout(() => setTempStatusMessage(null), 3000);
    } catch (err: any) {
      console.error("Failed to copy gym setup:", err.message);
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
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
              Select an existing gym to copy its exercise list from.
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