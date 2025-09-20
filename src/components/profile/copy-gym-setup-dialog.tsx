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
  onCopySuccess: () => void;
}

export const CopyGymSetupDialog = ({ open, onOpenChange, targetGym, sourceGyms, onCopySuccess }: CopyGymSetupDialogProps) => {
  const { session } = useSession();
  const [selectedSourceGymId, setSelectedSourceGymId] = useState<string>("");
  const [isCopying, setIsCopying] = useState(false);

  console.log("[CopyGymSetupDialog] Rendered. Source Gyms:", sourceGyms); // NEW LOG HERE

  const handleCopySetup = async () => {
    console.log("[CopyGymSetupDialog] handleCopySetup called.");
    console.log("[CopyGymSetupDialog] Session:", session);
    console.log("[CopyGymSetupDialog] Selected Source Gym ID:", selectedSourceGymId);

    if (!session || !selectedSourceGymId) {
      toast.error("Please select a gym to copy from.");
      console.log("[CopyGymSetupDialog] Validation failed: No session or source gym selected.");
      return;
    }
    console.log("[CopyGymSetupDialog] Validation passed. Proceeding to set loading state.");
    setIsCopying(true);
    try {
      console.log("[CopyGymSetupDialog] Making fetch request to /api/copy-gym-setup...");
      const response = await fetch('/api/copy-gym-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sourceGymId: selectedSourceGymId, targetGymId: targetGym.id }),
      });

      const data = await response.json();
      console.log("[CopyGymSetupDialog] API response received. Status:", response.status, "Data:", data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to copy gym setup.');
      }

      toast.success(`Successfully copied setup to "${targetGym.name}"!`);
      onCopySuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("[CopyGymSetupDialog] Failed to copy gym setup:", err.message);
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