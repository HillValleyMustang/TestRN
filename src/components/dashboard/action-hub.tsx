"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Sparkles,
  History,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  LayoutTemplate
} from 'lucide-react';
import { AiCoachDialog } from './ai-coach-dialog';
import { ActivityLoggingDialog } from '../activity-logging-dialog';
import { ActionButton } from './action-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { WorkoutLogModal } from './workout-log-modal';
import { ConsistencyCalendarModal } from './consistency-calendar-modal';

export const ActionHub = () => {
  const router = useRouter();
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isAiCoachOpen, setIsAiCoachOpen] = useState(false);
  const [isWorkoutLogOpen, setIsWorkoutLogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-3 grid-rows-2 gap-3 p-4 border rounded-xl bg-card">
        <ActionButton
          title="Log Activity"
          icon={<Activity className="h-5 w-5 text-chart-2" strokeWidth={2.5} />}
          onClick={() => setIsActivityLogOpen(true)}
        />
        <ActionButton
          title="AI Coach"
          icon={<Sparkles className="h-5 w-5 text-chart-4" strokeWidth={2.5} />}
          onClick={() => setIsAiCoachOpen(true)}
        />
        <ActionButton
          title="Workout Log"
          icon={<History className="h-5 w-5 text-chart-1" strokeWidth={2.5} />}
          onClick={() => setIsWorkoutLogOpen(true)}
        />
        <ActionButton
          title="Consistency Calendar"
          icon={<CalendarDays className="h-5 w-5 text-chart-5" strokeWidth={2.5} />}
          onClick={() => setIsCalendarOpen(true)}
          className="col-span-2"
        />
        
        <DropdownMenu onOpenChange={setIsMoreMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-full w-full p-2 flex flex-col items-center justify-center text-center whitespace-normal gap-1 font-semibold text-sm leading-tight border-0 shadow-sm hover:shadow-md transition-shadow bg-card"
            >
              {isMoreMenuOpen ? <ChevronUp className="h-5 w-5" strokeWidth={2.5} /> : <ChevronDown className="h-5 w-5" strokeWidth={2.5} />}
              <span>More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => router.push('/start-t-path')}>
              <Dumbbell className="mr-2 h-4 w-4" strokeWidth={2.5} />
              <span>Start Workout</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/manage-exercises')}>
              <Dumbbell className="mr-2 h-4 w-4" strokeWidth={2.5} />
              <span>Manage Exercises</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/manage-t-paths')}>
              <LayoutTemplate className="mr-2 h-4 w-4" strokeWidth={2.5} />
              <span>Manage T-Paths</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ActivityLoggingDialog open={isActivityLogOpen} onOpenChange={setIsActivityLogOpen} />
      <AiCoachDialog open={isAiCoachOpen} onOpenChange={setIsAiCoachOpen} />
      <WorkoutLogModal open={isWorkoutLogOpen} onOpenChange={setIsWorkoutLogOpen} />
      <ConsistencyCalendarModal open={isCalendarOpen} onOpenChange={setIsCalendarOpen} />
    </>
  );
};