"use client";

import React, { useState, useEffect } from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, PlusSquare, Sparkles } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { useSession } from '@/components/session-context-provider';
import { CopyGymSetupDialog } from './copy-gym-setup-dialog';
import { useGlobalStatus } from '@/contexts'; // NEW: Import useGlobalStatus

type Gym = Tables<'gyms'>;

interface SetupGymViewProps {
  gym: Gym;
  onClose: () => void;
}

export const SetupGymView = ({ gym, onClose }: SetupGymViewProps) => {
  const { session, supabase } = useSession();
  const { startLoading, endLoadingSuccess, endLoadingError } = useGlobalStatus(); // NEW: Use global status
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [sourceGyms, setSourceGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(false); // Keep local loading for button disabled state

  useEffect(() => {
    const fetchOtherGyms = async () => {
      if (!session) return;
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('user_id', session.user.id)
        .neq('id', gym.id); // Exclude the newly created gym

      if (error) {
        console.error("Failed to fetch other gyms for copying:", error);
      } else {
        setSourceGyms(data || []);
      }
    };
    fetchOtherGyms();
  }, [session, supabase, gym.id]);

  const handleSetupDefaults = async () => {
    if (!session) {
      toast.error("You must be logged in.");
      return;
    }
    setLoading(true); // Set local loading
    startLoading(`Setting up "${gym.name}" with app defaults...`); // NEW: Use global loading
    try {
      const response = await fetch('/api/setup-default-gym', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ gymId: gym.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to set up default gym.');
      }
      endLoadingSuccess(`"${gym.name}" is being set up with default workouts.`); // NEW: Use global success
      onClose();
    } catch (err: any) {
      endLoadingError(`Failed to set up default gym: ${err.message}`); // NEW: Use global error
    } finally {
      setLoading(false); // Clear local loading
    }
  };

  const handleSetupOption = (option: 'copy' | 'defaults' | 'empty') => {
    if (option === 'copy') {
      setIsCopyDialogOpen(true);
    } else if (option === 'defaults') {
      handleSetupDefaults();
    } else if (option === 'empty') {
      // For 'empty', we just close the dialog and consider it set up.
      // The gym already exists, and no T-Path is created, which is a valid state.
      onClose();
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Setup "{gym.name}"</DialogTitle>
        <DialogDescription>
          How would you like to add exercises to your new gym?
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-3">
        <Card className="cursor-pointer hover:border-primary" onClick={() => handleSetupOption('copy')}>
          <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
            <Copy className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-base">Copy from Existing Gym</CardTitle>
              <p className="text-xs text-muted-foreground">Duplicate the setup from another of your gyms.</p>
            </div>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:border-primary" onClick={() => handleSetupOption('defaults')}>
          <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
            <Sparkles className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-base">Use App Defaults</CardTitle>
              <p className="text-xs text-muted-foreground">Start with a standard set of common gym equipment.</p>
            </div>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:border-primary" onClick={() => handleSetupOption('empty')}>
          <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
            <PlusSquare className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-base">Start from Empty</CardTitle>
              <p className="text-xs text-muted-foreground">Manually add exercises to this gym later.</p>
            </div>
          </CardHeader>
        </Card>
      </div>
      {isCopyDialogOpen && (
        <CopyGymSetupDialog
          open={isCopyDialogOpen}
          onOpenChange={setIsCopyDialogOpen}
          targetGym={gym}
          sourceGyms={sourceGyms}
          onCopySuccess={async () => onClose()} // Close the main setup view on success
        />
      )}
    </>
  );
};