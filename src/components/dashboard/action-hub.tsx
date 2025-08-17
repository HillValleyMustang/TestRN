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
import { ManageExercisesDialog } from '../manage-exercises-dialog';
import { ManageWorkoutTemplatesDialog } from '../manage-workout-templates-dialog';

export const ActionHub = () => {
  const router = useRouter();
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isAiCoachOpen, setIsAiCoachOpen] = useState(false);
  const [isManageExercisesOpen, setIsManageExercisesOpen] = useState(false);
  const [isManageTemplatesOpen, setIsManageTemplatesOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-3 grid-rows-2 gap-3 p-4 border rounded-xl bg-card">
        <ActionButton
          title="Log Activity"
          icon={<Activity className="h-5 w-5" />}
          onClick={() => setIsActivityLogOpen(true)}
        />
        <ActionButton
          title="AI Coach"
          icon={<Sparkles className="h-5 w-5" />}
          onClick={() => setIsAiCoachOpen(true)}
        />
        <ActionButton
          title="Workout Log"
          icon={<History className="h-5 w-5" />}
          onClick={() => router.push('/workout-log')}
        />
        <ActionButton
          title="Consistency Calendar"
          icon={<CalendarDays className="h-5 w-5" />}
          onClick={() => router.push('/consistency-calendar')}
          className="col-span-2"
        />
        
        <DropdownMenu onOpenChange={setIsMoreMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-full w-full p-2 flex flex-col items-center justify-center text-center whitespace-normal gap-1 font-semibold text-sm leading-tight"
            >
              {isMoreMenuOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              <span>More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => router.push('/start-workout')}>
              <Dumbbell className="mr-2 h-4 w-4" />
              <span>Start Workout</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsManageExercisesOpen(true)}>
              <Dumbbell className="mr-2 h-4 w-4" />
              <span>Manage Exercises</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsManageTemplatesOpen(true)}>
              <LayoutTemplate className="mr-2 h-4 w-4" />
              <span>Manage Templates</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ActivityLoggingDialog
        open={isActivityLogOpen}
        onOpenChange={setIsActivityLogOpen}
      />
      
      <AiCoachDialog 
        open={isAiCoachOpen}
        onOpenChange={setIsAiCoachOpen}
      />

      <ManageExercisesDialog open={isManageExercisesOpen} onOpenChange={setIsManageExercisesOpen} />
      <ManageWorkoutTemplatesDialog open={isManageTemplatesOpen} onOpenChange={setIsManageTemplatesOpen} />
    </>
  );
};