"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Badge } from "@/components/ui/badge";
import { Flame, Dumbbell, CheckCircle, Clock, AlertCircle, WifiOff, Loader2, Info } from "lucide-react";
import { cn } from '@/lib/utils';
import { useSyncManager } from '@/hooks/use-sync-manager';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGlobalStatus } from '@/components/global-status-provider'; // NEW IMPORT

const StatusInfoModal = () => (
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Workout Status Explained</DialogTitle>
      <DialogDescription>
        Your status reflects your workout consistency over time. It also provides temporary updates and shows your connection status.
      </DialogDescription>
    </DialogHeader>
    <ScrollArea className="max-h-[70vh] pr-4">
      <div className="space-y-4 py-4">
        <div className="flex items-start gap-3">
          <Dumbbell className="h-5 w-5 text-gray-500 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold">Getting into it</h4>
            <p className="text-sm text-muted-foreground">You're just getting started or have had a break of more than a week. Keep it up!</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold">Building Momentum</h4>
            <p className="text-sm text-muted-foreground">You've been working out consistently for 1-3 weeks.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Flame className="h-5 w-5 text-orange-500 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold">In the Zone</h4>
            <p className="text-sm text-muted-foreground">You've maintained your workout habit for 4-7 consecutive weeks.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Flame className="h-5 w-5 text-red-500 fill-red-500 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold">On Fire</h4>
            <p className="text-sm text-muted-foreground">Incredible consistency! You've been working out for 8+ weeks straight.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <WifiOff className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold">Offline</h4>
            <p className="text-sm text-muted-foreground">You are currently offline. Your progress is being saved locally and will sync when you reconnect.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Loader2 className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold">Updating Plan...</h4>
            <p className="text-sm text-muted-foreground">Your workout plan is being regenerated in the background. This may take a moment.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold">Success!</h4>
            <p className="text-sm text-muted-foreground">An operation completed successfully.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold">Error!</h4>
            <p className="text-sm text-muted-foreground">An operation encountered an error.</p>
          </div>
        </div>
      </div>
    </ScrollArea>
  </DialogContent>
);

export function RollingStatusBadge() {
  const { session, supabase } = useSession();
  const { isOnline, setOfflineStatus } = useSyncManager();
  const { globalStatus, isGeneratingPlan, setIsGeneratingPlanStatus } = useGlobalStatus(); // Consume isGeneratingPlan directly
  const [rollingWorkoutStatus, setRollingWorkoutStatus] = useState<string | null>(null);
  const [loadingRollingStatus, setLoadingRollingStatus] = useState(true);

  useEffect(() => {
    setOfflineStatus(!isOnline);
  }, [isOnline, setOfflineStatus]);

  useEffect(() => {
    const fetchRollingStatusData = async () => {
      if (!session) {
        setLoadingRollingStatus(false);
        return;
      }
      setLoadingRollingStatus(true);
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('rolling_workout_status, t_path_generation_status')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        const fetchedStatus = profileData?.rolling_workout_status || 'Getting into it';
        setRollingWorkoutStatus(fetchedStatus);
        setIsGeneratingPlanStatus(profileData?.t_path_generation_status === 'in_progress');

      } catch (error) {
        console.error("Failed to fetch rolling status data:", error);
        setRollingWorkoutStatus('Error');
      } finally {
        setLoadingRollingStatus(false);
      }
    };

    if (isOnline && !globalStatus.isTemporary && globalStatus.statusType !== 'loading' && globalStatus.statusType !== 'success' && globalStatus.statusType !== 'error' && !isGeneratingPlan) {
      fetchRollingStatusData();
    } else if (!isOnline) {
      setRollingWorkoutStatus('Offline');
      setLoadingRollingStatus(false);
    }
  }, [session, supabase, isOnline, globalStatus.isTemporary, globalStatus.statusType, isGeneratingPlan, setIsGeneratingPlanStatus]);

  let displayStatus = rollingWorkoutStatus;
  let badgeIcon: React.ReactNode;
  let badgeColorClass: string;
  let showEllipsis = false;

  if (globalStatus.statusType === 'loading') {
    displayStatus = globalStatus.message || 'Loading...';
    badgeIcon = <Loader2 className="h-4 w-4 animate-spin" />;
    badgeColorClass = 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800 dark:text-blue-300 dark:border-blue-700';
    showEllipsis = true;
  } else if (globalStatus.statusType === 'success') {
    displayStatus = globalStatus.message || 'Success!';
    badgeIcon = <CheckCircle className="h-4 w-4 text-green-500" />;
    badgeColorClass = 'bg-green-100 text-green-700 border-green-300 dark:bg-green-800 dark:text-green-300 dark:border-green-700';
  } else if (globalStatus.statusType === 'error') {
    displayStatus = globalStatus.message || 'Error!';
    badgeIcon = <AlertCircle className="h-4 w-4 text-destructive" />;
    badgeColorClass = 'bg-destructive/10 text-destructive border-destructive/30';
  } else if (!isOnline) {
    displayStatus = 'Offline';
    badgeIcon = <WifiOff className="h-4 w-4 text-red-500" />;
    badgeColorClass = 'bg-red-100 text-red-700 border-red-300 dark:bg-red-800 dark:text-red-300 dark:border-red-700';
  } else if (isGeneratingPlan) { // Use the directly consumed isGeneratingPlan
    displayStatus = 'Updating Plan...';
    badgeIcon = <Loader2 className="h-4 w-4 animate-spin" />;
    badgeColorClass = 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800 dark:text-blue-300 dark:border-blue-700';
    showEllipsis = true;
  } else if (loadingRollingStatus) {
    displayStatus = 'Loading Status...';
    badgeIcon = <Clock className="h-4 w-4 text-muted-foreground" />;
    badgeColorClass = 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
  } else {
    switch (rollingWorkoutStatus) {
      case 'Getting into it':
        badgeIcon = <Dumbbell className="h-4 w-4 text-gray-400" />;
        badgeColorClass = 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
        break;
      case 'Building Momentum':
        badgeIcon = <CheckCircle className="h-4 w-4 text-blue-500" />;
        badgeColorClass = 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800 dark:text-blue-300 dark:border-blue-700';
        break;
      case 'In the Zone':
        badgeIcon = <Flame className="h-4 w-4 text-orange-500" />;
        badgeColorClass = 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-800 dark:text-orange-300 dark:border-orange-700';
        break;
      case 'On Fire':
        badgeIcon = <Flame className="h-4 w-4 text-red-500 fill-red-500" />;
        badgeColorClass = 'bg-red-100 text-red-700 border-red-300 dark:bg-red-800 dark:text-red-300 dark:border-red-700';
        break;
      default:
        badgeIcon = <AlertCircle className="h-4 w-4 text-destructive" />;
        badgeColorClass = 'bg-destructive/10 text-destructive border-destructive/30';
        displayStatus = rollingWorkoutStatus;
        break;
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Badge variant="outline" className={cn("flex items-center gap-1 px-3 py-1 text-sm font-semibold cursor-pointer", badgeColorClass)}>
          {badgeIcon}
          <span>
            {displayStatus}
            {showEllipsis && <span className="loading-ellipsis"></span>}
          </span>
        </Badge>
      </DialogTrigger>
      <StatusInfoModal />
    </Dialog>
  );
}