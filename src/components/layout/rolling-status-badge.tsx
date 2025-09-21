"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Badge } from "@/components/ui/badge";
import { Flame, Dumbbell, CheckCircle, Clock, AlertCircle, WifiOff, Loader2 } from "lucide-react"; // Added WifiOff and Loader2
import { cn } from '@/lib/utils';
import { useSyncManager } from '@/hooks/use-sync-manager'; // Import useSyncManager
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'; // Import Dialog components
import { ScrollArea } from '../ui/scroll-area'; // Import ScrollArea

const StatusInfoModal = () => (
  <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col"> {/* Added flex-col and max-h */}
    <DialogHeader>
      <DialogTitle>Workout Status Explained</DialogTitle>
      <DialogDescription>
        Your status reflects your workout consistency over time. It also provides temporary updates and shows your connection status.
      </DialogDescription>
    </DialogHeader>
    <ScrollArea className="flex-grow overflow-y-auto py-4 pr-4"> {/* Added ScrollArea here */}
      <div className="space-y-4">
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
    </ScrollArea>
  </DialogContent>
);

export function RollingStatusBadge({ isGeneratingPlan }: { isGeneratingPlan: boolean }) {
  const { session, supabase } = useSession();
  const { isOnline } = useSyncManager(); // Get isOnline status
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatusData = async () => {
      if (!session) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('rolling_workout_status')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          throw error;
        }

        const fetchedStatus = profileData?.rolling_workout_status || 'Getting into it';
        console.log("Fetched rolling_workout_status:", fetchedStatus); // Debugging log
        setStatus(fetchedStatus);
      } catch (error) {
        console.error("Failed to fetch rolling status data:", error);
        setStatus('Error'); // Indicate an error state
      } finally {
        setLoading(false);
      }
    };

    // Only fetch status if online, otherwise immediately show offline
    if (isOnline) {
      fetchStatusData();
    } else {
      setStatus('Offline');
      setLoading(false);
    }
  }, [session, supabase, isOnline]); // Added isOnline to dependencies

  if (isGeneratingPlan) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800 dark:text-blue-300 dark:border-blue-700">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Updating Plan...</span>
      </Badge>
    );
  }

  if (loading) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-muted-foreground">Loading Status...</span>
      </Badge>
    );
  }

  if (!isOnline) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Badge variant="destructive" className="flex items-center gap-1 px-3 py-1 text-sm font-semibold bg-red-100 text-red-700 border-red-300 dark:bg-red-800 dark:text-red-300 dark:border-red-700 cursor-pointer">
            <WifiOff className="h-4 w-4 text-red-500" />
            <span>Offline</span>
          </Badge>
        </DialogTrigger>
        <StatusInfoModal />
      </Dialog>
    );
  }

  let badgeIcon: React.ReactNode;
  let badgeColorClass: string;
  let displayText = status; // Default to fetched status

  switch (status) {
    case 'Ready to Start':
      displayText = 'Getting into it'; // Force display to new text
      badgeIcon = <Dumbbell className="h-4 w-4 text-gray-400" />;
      badgeColorClass = 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
      break;
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
      displayText = status; // Use the error status directly
      break;
  }

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