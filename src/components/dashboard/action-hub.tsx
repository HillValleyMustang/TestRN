"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Sparkles, History, Calendar, Dumbbell } from 'lucide-react';
import { AiCoachDialog } from './ai-coach-dialog';
import { ActivityLoggingDialog } from '../activity-logging-dialog';
import { ActionButton } from './action-button';

export const ActionHub = () => {
  const router = useRouter();
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isAiCoachOpen, setIsAiCoachOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionButton
          icon={<Dumbbell />}
          title="Start Workout"
          description="Choose a template or start a blank session."
          onClick={() => router.push('/start-workout')}
        />
        <ActionButton
          icon={<Sparkles />}
          title="AI Coach"
          description="Get personalized feedback on your progress."
          onClick={() => setIsAiCoachOpen(true)}
        />
        <ActionButton
          icon={<CalendarDays />}
          title="Log Activity"
          description="Log cardio, sports, or other activities."
          onClick={() => setIsActivityLogOpen(true)}
        />
        <ActionButton
          icon={<History />}
          title="Workout Log"
          description="Review your past workout sessions."
          onClick={() => router.push('/workout-log')}
        />
        <ActionButton
          icon={<Calendar />}
          title="Consistency Calendar"
          description="Visualize your activity streak."
          onClick={() => router.push('/consistency-calendar')}
        />
      </div>

      <ActivityLoggingDialog
        open={isActivityLogOpen}
        onOpenChange={setIsActivityLogOpen}
      />
      
      <AiCoachDialog 
        open={isAiCoachOpen}
        onOpenChange={setIsAiCoachOpen}
      />
    </>
  );
};