"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LoadingOverlay } from '@/components/loading-overlay'; // Import LoadingOverlay

type TPath = Tables<'t_paths'>;

interface TPathSwitcherProps {
  currentTPathId: string;
  onTPathChange: (newTPathId: string) => void;
}

export const TPathSwitcher = ({ currentTPathId, onTPathChange }: TPathSwitcherProps) => {
  const { session, supabase } = useSession();
  const [tPaths, setTPaths] = useState<TPath[]>([]);
  const [selectedTPathId, setSelectedTPathId] = useState(currentTPathId);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false); // New loading state

  useEffect(() => {
    const fetchTPaths = async () => {
      if (!session) return;
      
      try {
        const { data, error } = await supabase
          .from('t_paths')
          .select('id, template_name, created_at, is_bonus, user_id, version, settings, progression_settings, parent_t_path_id') // Specify all columns required by TPath
          .eq('user_id', session.user.id)
          .is('parent_t_path_id', null); // Fetch only main T-Paths

        if (error) throw error;
        setTPaths(data as TPath[] || []); // Explicitly cast
      } catch (err: any) {
        toast.error("Failed to load T-Paths: " + err.message);
      }
    };

    fetchTPaths();
  }, [session, supabase]);

  useEffect(() => {
    setSelectedTPathId(currentTPathId);
  }, [currentTPathId]);

  const handleTPathChange = (newTPathId: string) => {
    if (newTPathId !== currentTPathId) {
      setSelectedTPathId(newTPathId);
      setShowSwitchDialog(true);
    }
  };

  const confirmSwitch = async () => {
    if (!session) return;

    setIsSwitching(true); // Start loading
    try {
      // Call the Next.js API route to handle the switch and disassociation
      const response = await fetch('/api/switch-t-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ oldTPathId: currentTPathId, newTPathId: selectedTPathId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to switch T-Path via API.');
      }

      onTPathChange(selectedTPathId); // Notify parent component of the change
      setShowSwitchDialog(false);
      toast.success("Switched to new T-Path!");
    } catch (err: any) {
      toast.error("Failed to switch T-Path: " + err.message);
      console.error("Error switching T-Path:", err);
    } finally {
      setIsSwitching(false); // End loading
    }
  };

  const cancelSwitch = () => {
    setSelectedTPathId(currentTPathId);
    setShowSwitchDialog(false);
  };

  const currentTPath = tPaths.find(tp => tp.id === currentTPathId);

  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Switch Active T-Path</label>
        <Select value={selectedTPathId} onValueChange={handleTPathChange}>
          <SelectTrigger>
            <SelectValue>
              {currentTPath ? currentTPath.template_name : "Select T-Path"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {tPaths.map((tPath) => (
              <SelectItem key={tPath.id} value={tPath.id}>
                {tPath.template_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <AlertDialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Switch Transformation Path?</AlertDialogTitle>
              <AlertDialogDescription>
                Switching to a new T-Path will clear and replace all exercises from your current plan. Don't worry—your custom exercises are still safe and can be re-added from your personal library whenever you like.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelSwitch}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSwitch}>Switch T-Path</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <LoadingOverlay 
        isOpen={isSwitching} 
        title="Switching Transformation Path" 
        description="Please wait while your new workout plan is activated and old exercises are disassociated." 
      />
    </>
  );
};