"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Copy, Sparkles } from 'lucide-react';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { Tables, Profile } from '@/types/supabase'; // Import Profile type
import { CopyGymSetupDialog } from '@/components/profile/copy-gym-setup-dialog';

type Gym = Tables<'gyms'>;

interface SetupGymPlanPromptProps {
  gym: Gym;
  onSetupSuccess: () => void;
  profile: Profile | null; // NEW: Added profile prop
}

export const SetupGymPlanPrompt = ({ gym, onSetupSuccess, profile }: SetupGymPlanPromptProps) => {
  const { session, supabase, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [sourceGyms, setSourceGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOtherGyms = async () => {
      if (!memoizedSessionUserId) return; // Use memoized ID
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('user_id', memoizedSessionUserId) // Use memoized ID
        .neq('id', gym.id);

      if (error) {
        console.error("Failed to fetch other gyms for copying:", error);
        toast.error("Failed to load other gyms for copying."); // Added toast.error
      } else {
        setSourceGyms(data || []);
      }
    };
    fetchOtherGyms();
  }, [memoizedSessionUserId, supabase, gym.id]); // Depend on memoized ID

  const handleSetupDefaults = async () => {
    if (!memoizedSessionUserId) { // Use memoized ID
      toast.error("You must be logged in to set up defaults."); // Added toast.error
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Setting up with app defaults...");
    try {
      const response = await fetch('/api/setup-default-gym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }, // Use session?.access_token
        body: JSON.stringify({ gymId: gym.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to set up default gym.');
      toast.success(`"${gym.name}" is being set up with default workouts.`, { id: toastId });
      onSetupSuccess();
    } catch (err: any) {
      console.error("Failed to set up default gym:", err.message);
      toast.error(`Failed to set up default gym: ${err.message}`, { id: toastId }); // Changed to toast.error
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20 mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-5 w-5" />
            Setup Required for "{gym.name}"
          </CardTitle>
          <CardDescription className="text-yellow-800 dark:text-yellow-300">
            This gym has no workout plan. Choose an option below to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleSetupDefaults} disabled={loading}>
            <Sparkles className="h-4 w-4 mr-2" /> Use App Defaults
          </Button>
          <Button variant="outline" onClick={() => setIsCopyDialogOpen(true)} disabled={sourceGyms.length === 0 || loading}>
            <Copy className="h-4 w-4 mr-2" /> Copy from another Gym
          </Button>
        </CardContent>
      </Card>
      <CopyGymSetupDialog
        open={isCopyDialogOpen}
        onOpenChange={setIsCopyDialogOpen}
        targetGym={gym}
        sourceGyms={sourceGyms}
        onCopySuccess={async () => onSetupSuccess()}
      />
    </>
  );
};