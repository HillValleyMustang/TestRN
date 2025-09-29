"use client";

import React, { useState, useEffect } from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, PlusSquare, Sparkles, Camera } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { useSession } from '@/components/session-context-provider';
import { CopyGymSetupDialog } from './copy-gym-setup-dialog';

type Gym = Tables<'gyms'>;

interface SetupGymViewProps {
  gym: Gym;
  onClose: () => void;
  onSelectAiSetup: () => void;
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void;
}

export const SetupGymView = ({ gym, onClose, onSelectAiSetup, setTempStatusMessage }: SetupGymViewProps) => {
  const { session, supabase, memoizedSessionUserId } = useSession();
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [sourceGyms, setSourceGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOtherGyms = async () => {
      if (!memoizedSessionUserId) return;
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('user_id', memoizedSessionUserId)
        .neq('id', gym.id);

      if (error) {
        console.error("Failed to fetch other gyms for copying:", error);
        setTempStatusMessage({ message: "Error!", type: 'error' });
        setTimeout(() => setTempStatusMessage(null), 3000);
      } else {
        setSourceGyms(data || []);
      }
    };
    fetchOtherGyms();
  }, [memoizedSessionUserId, supabase, gym.id, setTempStatusMessage]);

  const handleSetupOption = async (option: 'copy' | 'defaults' | 'empty') => {
    switch (option) {
      case 'copy':
        if (sourceGyms.length > 0) {
          setIsCopyDialogOpen(true);
        } else {
          setTempStatusMessage({ message: "No gyms to copy!", type: 'error' });
          setTimeout(() => setTempStatusMessage(null), 3000);
        }
        break;
      case 'defaults':
        if (!memoizedSessionUserId) {
          setTempStatusMessage({ message: "Error!", type: 'error' });
          setTimeout(() => setTempStatusMessage(null), 3000);
          return;
        }
        setLoading(true);
        try {
          const response = await fetch('/api/setup-default-gym', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
            body: JSON.stringify({ gymId: gym.id }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to set up default gym.');
          setTempStatusMessage({ message: "Updated!", type: 'success' });
          setTimeout(() => setTempStatusMessage(null), 3000);
          onClose();
        } catch (err: any) {
          console.error("Failed to set up default gym:", err.message);
          setTempStatusMessage({ message: "Error!", type: 'error' });
          setTimeout(() => setTempStatusMessage(null), 3000);
        } finally {
          setLoading(false);
        }
        break;
      case 'empty':
        setTempStatusMessage({ message: "Added!", type: 'success' });
        setTimeout(() => setTempStatusMessage(null), 3000);
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
      <div className="py-4 space-y-2">
        <Button variant="outline" className="h-auto p-4 flex items-center justify-start gap-4 text-left w-full" onClick={onSelectAiSetup}>
          <Camera className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold">Analyse Gym Photos with AI</p>
            <p className="text-sm text-muted-foreground">Upload photos to automatically create a plan.</p>
          </div>
        </Button>
        <Button variant="outline" className="h-auto p-4 flex items-center justify-start gap-4 text-left w-full" onClick={() => handleSetupOption('copy')}>
          <Copy className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold">Copy from Existing Gym</p>
            <p className="text-sm text-muted-foreground">Duplicate the setup from another of your gyms.</p>
          </div>
        </Button>
        <Button variant="outline" className="h-auto p-4 flex items-center justify-start gap-4 text-left w-full" onClick={() => handleSetupOption('defaults')}>
          <Sparkles className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold">Use App Defaults</p>
            <p className="text-sm text-muted-foreground">Start with a standard set of common gym equipment.</p>
          </div>
        </Button>
        <Button variant="outline" className="h-auto p-4 flex items-center justify-start gap-4 text-left w-full" onClick={() => handleSetupOption('empty')}>
          <PlusSquare className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold">Start from Empty</p>
            <p className="text-sm text-muted-foreground">Manually add exercises to this gym later.</p>
          </div>
        </Button>
      </div>
      {isCopyDialogOpen && (
        <CopyGymSetupDialog
          open={isCopyDialogOpen}
          onOpenChange={setIsCopyDialogOpen}
          targetGym={gym}
          sourceGyms={sourceGyms}
          onCopySuccess={async () => onClose()}
          setTempStatusMessage={setTempStatusMessage}
        />
      )}
    </>
  );
};