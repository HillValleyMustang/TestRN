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

type Gym = Tables<'gyms'>;

interface SetupGymViewProps {
  gym: Gym;
  onClose: () => void;
}

export const SetupGymView = ({ gym, onClose }: SetupGymViewProps) => {
  const { session, supabase } = useSession();
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [sourceGyms, setSourceGyms] = useState<Gym[]>([]);

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

  const handleSetupOption = async (option: 'copy' | 'defaults' | 'empty') => {
    switch (option) {
      case 'copy':
        if (sourceGyms.length > 0) {
          setIsCopyDialogOpen(true);
        } else {
          toast.info("You don't have any other gyms to copy from.");
        }
        break;
      case 'defaults':
        if (!session) {
          toast.error("You must be logged in.");
          return;
        }
        const toastId = toast.loading("Setting up with app defaults...");
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
          toast.success(`"${gym.name}" is being set up with default workouts.`, { id: toastId });
          onClose();
        } catch (err: any) {
          toast.error(`Failed to set up default gym: ${err.message}`, { id: toastId });
        }
        break;
      case 'empty':
        toast.success(`"${gym.name}" is ready! You can add exercises manually.`);
        onClose();
        break;
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