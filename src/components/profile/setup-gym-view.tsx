"use client";

import React from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, PlusSquare, Sparkles } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';

type Gym = Tables<'gyms'>;

interface SetupGymViewProps {
  gym: Gym;
  onClose: () => void;
}

export const SetupGymView = ({ gym, onClose }: SetupGymViewProps) => {

  const handleSetupOption = (option: 'copy' | 'defaults' | 'empty') => {
    // Placeholder for now. In the future, this will trigger different flows.
    switch (option) {
      case 'copy':
        toast.info("Copying from an existing gym is not yet implemented.");
        // Here we would open another dialog to select a gym to copy from.
        break;
      case 'defaults':
        toast.info("Setting up with app defaults is not yet implemented.");
        // Here we would call an edge function to populate the gym_exercises table.
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
    </>
  );
};