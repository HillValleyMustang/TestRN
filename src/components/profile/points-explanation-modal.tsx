"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Dumbbell, ListChecks, CalendarCheck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea

interface PointsExplanationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PointsExplanationModal = ({ open, onOpenChange }: PointsExplanationModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col"> {/* Added flex-col and max-h */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" /> How Points Are Calculated
          </DialogTitle>
          <DialogDescription>
            Your fitness points reflect your overall engagement and progress in the app.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow py-4 pr-4"> {/* Added flex-grow, py, and pr for scroll area */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Dumbbell className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">Workout Sessions:</h4>
                <p className="text-sm text-muted-foreground">
                  You earn **10 points** for every completed workout session.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ListChecks className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">Unique Exercises:</h4>
                <p className="text-sm text-muted-foreground">
                  You earn points for completing new unique exercises, contributing to your "Total Exercises Completed" count. (Points for this are integrated into workout sessions).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarCheck className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">Consistency & Streaks:</h4>
                <p className="text-sm text-muted-foreground">
                  Maintaining workout streaks and logging activities regularly contributes to your overall fitness level and unlocks achievements.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground italic">
              Keep logging your workouts and activities to increase your points and climb the fitness ranks!
            </p>
          </div>
        </ScrollArea>
        <div className="flex justify-center pt-4"> {/* Added pt for spacing */}
          <Button onClick={() => onOpenChange(false)}>Got It!</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};