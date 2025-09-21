"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Badge } from "@/components/ui/badge";
import { Flame, Dumbbell, CheckCircle, Clock, AlertCircle, WifiOff, Loader2, CheckCheck, XCircle } from "lucide-react"; // Added CheckCheck, XCircle
import { cn } from '@/lib/utils';
import { useSyncManager } from '@/hooks/use-sync-manager'; // Import useSyncManager
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'; // Import Dialog components
import { useGlobalStatus } from '@/contexts'; // NEW: Import useGlobalStatus

const StatusInfoModal = () => (
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Workout Status Explained</DialogTitle>
      <DialogDescription>
        Your status reflects your workout consistency over time. It also provides temporary updates and shows your connection status.
      </DialogDescription>
    </DialogHeader>
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
    </div>
  </DialogContent>
);

export function RollingStatusBadge({ isGeneratingPlan }: { isGeneratingPlan: boolean }) {
  const { session, supabase } = useSession();
  const { isOnline } = useSyncManager();
  const { isLoading, loadingMessage, isSuccess, successMessage, isError, errorMessage, statusType } = useGlobalStatus(); // NEW: Consume global status
  const [rollingStatus, setRollingStatus] = useState<string | null>(null);
  const [loadingRollingStatus, setLoadingRollingStatus] = useState(true);
  const [ellipsis, setEllipsis] = useState('');

  // Ellipsis animation for loading states
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading || isGeneratingPlan) {
      interval = setInterval(() => {
        setEllipsis(prev => {
          if (prev === '') return '.';
          if (prev === '.') return '..';
          if (prev === '..') return '...';
          return '';
        });
      }, 300);
    } else {
      setEllipsis('');
    }
    return () => clearInterval(interval);
  }, [isLoading, isGeneratingPlan]);

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
          .select('rolling_workout_status')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        const fetchedStatus = profileData?.rolling_workout_status || 'Getting into it';
        setRollingStatus(fetchedStatus);
      } catch (error) {
        console.error("Failed to fetch rolling status data:", error);
        setRollingStatus('Error');
      } finally {
        setLoadingRollingStatus(false);
      }
    };

    // Only fetch rolling status if online and no other global status is active
    if (isOnline && !isLoading && !isSuccess && !isError && !isGeneratingPlan) {
      fetchRollingStatusData();
    } else if (!isOnline) {
      setRollingStatus('Offline');
      setLoadingRollingStatus(false);
    }
  }, [session, supabase, isOnline, isLoading, isSuccess, isError, isGeneratingPlan]);

  // Determine what to display based on priority
  let badgeIcon: React.ReactNode;
  let badgeColorClass: string;
  let displayText: string | null = null;

  if (isGeneratingPlan) {
    badgeIcon = <Loader2 className="h-4 w-4 animate-spin" />;
    badgeColorClass = 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800 dark:text-blue-300 dark:border-blue-700';
    displayText = `Updating Plan${ellipsis}`;
  } else if (isLoading) {
    badgeIcon = <Loader2 className="h-4 w-4 animate-spin" />;
    badgeColorClass = 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800 dark:text-blue-300 dark:border-blue-700';
    displayText = `${loadingMessage}${ellipsis}`;
  } else if (isSuccess) {
    badgeIcon = <CheckCheck className="h-4 w-4 text-green-500" />;
    badgeColorClass = 'bg-green-100 text-green-700 border-green-300 dark:bg-green-800 dark:text-green-300 dark:border-green-700';
    displayText = successMessage;
  } else if (isError) {
    badgeIcon = <XCircle className="h-4 w-4 text-destructive" />;
    badgeColorClass = 'bg-red-100 text-red-700 border-red-300 dark:bg-red-800 dark:text-red-300 dark:border-red-700';
    displayText = errorMessage;
  } else if (!isOnline) {
    badgeIcon = <WifiOff className="h-4 w-4 text-red-500" />;
    badgeColorClass = 'bg-red-100 text-red-700 border-red-300 dark:bg-red-800 dark:text-red-300 dark:border-red-700';
    displayText = 'Offline';
  } else if (loadingRollingStatus) {
    badgeIcon = <Clock className="h-4 w-4 text-muted-foreground" />;
    badgeColorClass = 'bg-secondary text-secondary-foreground border-border';
    displayText = 'Loading Status...';
  } else {
    // Default rolling workout status
    switch (rollingStatus) {
      case 'Ready to Start':
      case 'Getting into it':
        badgeIcon = <Dumbbell className="h-4 w-4 text-gray-400" />;
        badgeColorClass = 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
        displayText = 'Getting into it';
        break;
      case 'Building Momentum':
        badgeIcon = <CheckCircle className="h-4 w-4 text-blue-500" />;
        badgeColorClass = 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800 dark:text-blue-300 dark:border-blue-700';
        displayText = 'Building Momentum';
        break;
      case 'In the Zone':
        badgeIcon = <Flame className="h-4 w-4 text-orange-500" />;
        badgeColorClass = 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-800 dark:text-orange-300 dark:border-orange-700';
        displayText = 'In the Zone';
        break;
      case 'On Fire':
        badgeIcon = <Flame className="h-4 w-4 text-red-500 fill-red-500" />;
        badgeColorClass = 'bg-red-100 text-red-700 border-red-300 dark:bg-red-800 dark:text-red-300 dark:border-red-700';
        displayText = 'On Fire';
        break;
      default:
        badgeIcon = <AlertCircle className="h-4 w-4 text-destructive" />;
        badgeColorClass = 'bg-destructive/10 text-destructive border-destructive/30';
        displayText = 'Error';
        break;
    }
  }

  if (!displayText) return null; // Don't render if no status to display

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Badge variant="outline" className={cn("flex items-center gap-1 px-3 py-1 text-sm font-semibold cursor-pointer", badgeColorClass)}>
          {badgeIcon}
          <span>{displayText}</span>
        </Badge>
      </DialogTrigger>
      <StatusInfoModal />
    </Dialog>
  );
}