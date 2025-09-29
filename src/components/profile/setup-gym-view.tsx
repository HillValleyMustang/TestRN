"use client";

import React, { useState, useEffect } from 'react';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Copy, Sparkles, PlusSquare } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { useSession } from '@/components/session-context-provider';
import { CopyGymSetupDialog } from './copy-gym-setup-dialog';
import { cn } from '@/lib/utils';

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

  const options = [
    {
      id: 'ai-photo' as const,
      title: 'Analyse Gym Photos',
      description: 'Upload photos to automatically create your equipment list',
      icon: Camera,
      recommended: true,
      badge: 'AI',
      action: onSelectAiSetup,
    },
    {
      id: 'copy-existing' as const,
      title: 'Copy from Existing Gym',
      description: "Duplicate the setup from another gym you've created",
      icon: Copy,
      recommended: false,
      action: () => handleSetupOption('copy'),
    },
    {
      id: 'app-defaults' as const,
      title: 'Use App Defaults',
      description: 'Start with a standard set of common gym equipment',
      icon: Sparkles,
      recommended: false,
      dividerBefore: true,
      action: () => handleSetupOption('defaults'),
    },
    {
      id: 'empty' as const,
      title: 'Start from Empty',
      description: 'Manually add exercises to this gym from scratch',
      icon: PlusSquare,
      recommended: false,
      action: () => handleSetupOption('empty'),
    },
  ];

  return (
    <>
      <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100">
        <DialogTitle className="text-xl font-bold text-slate-900">
          Setup "{gym.name}"
        </DialogTitle>
        <DialogDescription className="text-[13px] text-slate-500 leading-tight">
          How would you like to add exercises to your new gym?
        </DialogDescription>
      </DialogHeader>

      <div className="px-5 py-4 flex-1 overflow-y-auto">
        <div className="grid gap-2.5">
          {options.map((option) => (
            <React.Fragment key={option.id}>
              {option.dividerBefore && (
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-2" />
              )}
              
              <button
                onClick={option.action}
                className={cn(
                  `relative w-full text-left rounded-xl p-3 border-2 group`,
                  `transition-all duration-300 ease-out overflow-hidden`,
                  `before:absolute before:top-0 before:left-0 before:w-1 before:h-full`,
                  `before:bg-slate-900 before:scale-y-0 before:transition-transform`,
                  `before:duration-300 before:ease-out before:origin-center`,
                  `hover:translate-x-1 hover:shadow-md hover:border-slate-300`,
                  `hover:before:scale-y-100`,
                  option.recommended
                    ? 'bg-gradient-to-br from-slate-900/[0.03] to-slate-900/[0.01] border-slate-900'
                    : 'bg-white border-slate-200'
                )}
              >
                <div className="flex gap-2.5 items-start">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:bg-slate-900 group-hover:scale-105">
                    <option.icon className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-slate-900 transition-colors duration-300 group-hover:text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="text-sm font-bold text-slate-900">
                        {option.title}
                      </h3>
                      {option.recommended && option.badge && (
                        <span className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                          {option.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-snug">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            </React.Fragment>
          ))}
        </div>
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