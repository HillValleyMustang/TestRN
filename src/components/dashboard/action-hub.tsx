"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CalendarDays, Sparkles, History, Calendar, ChevronDown, ChevronUp, User, Bike, Activity as ActivityIcon } from 'lucide-react';
import { AiCoachDialog } from './ai-coach-dialog';
import { ManageExercisesDialog } from '../manage-exercises-dialog';
import { ActivityLoggingDialog } from '../activity-logging-dialog';

type ActivityType = "Cycling" | "Swimming" | "Tennis";

export const ActionHub = () => {
  const router = useRouter();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [initialActivity, setInitialActivity] = useState<ActivityType | null>(null);

  const handleLogSpecificActivity = (activity: ActivityType) => {
    setInitialActivity(activity);
    setIsActivityLogOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Button
          size="lg"
          className="w-full h-24 text-base flex flex-col items-center justify-center gap-1 p-2"
          onClick={() => setIsActivityLogOpen(true)}
        >
          <CalendarDays className="h-6 w-6" />
          <span className="text-center leading-tight">Log Activity</span>
        </Button>
        
        <AiCoachDialog />

        <Button
          size="lg"
          className="w-full h-24 text-base flex flex-col items-center justify-center gap-1 p-2 col-span-2 md:col-span-1"
          onClick={() => router.push('/workout-log')}
        >
          <History className="h-6 w-6" />
          <span className="text-center leading-tight">Workout Log</span>
        </Button>

        <Button
          size="lg"
          className="w-full h-24 text-base flex flex-col items-center justify-center gap-1 p-2 col-span-2 md:col-span-2"
          onClick={() => router.push('/consistency-calendar')}
        >
          <Calendar className="h-6 w-6" />
          <span className="text-center leading-tight">Consistency Calendar</span>
        </Button>

        <DropdownMenu open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              variant="outline"
              className="w-full h-24 text-base flex flex-col items-center justify-center gap-1 p-2 col-span-2 md:col-span-1"
            >
              <span className="text-center leading-tight">More</span>
              {isMoreOpen ? <ChevronUp className="h-5 w-5 mt-1" /> : <ChevronDown className="h-5 w-5 mt-1" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuItem onSelect={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>My Profile</span>
            </DropdownMenuItem>
            <ManageExercisesDialog />
            <DropdownMenuItem onSelect={() => handleLogSpecificActivity('Cycling')}>
              <Bike className="mr-2 h-4 w-4" />
              <span>Log Cycling</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleLogSpecificActivity('Swimming')}>
              <ActivityIcon className="mr-2 h-4 w-4" />
              <span>Log Swimming</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleLogSpecificActivity('Tennis')}>
              <ActivityIcon className="mr-2 h-4 w-4" />
              <span>Log Tennis</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ActivityLoggingDialog
        open={isActivityLogOpen}
        onOpenChange={setIsActivityLogOpen}
        initialActivity={initialActivity}
      />
    </>
  );
};