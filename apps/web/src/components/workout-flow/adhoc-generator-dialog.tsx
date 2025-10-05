"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from 'lucide-react';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { ExerciseDefinition } from '@/types/supabase';
import { cn } from '@/lib/utils'; // Keep web-specific utils;

interface AdHocGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkoutGenerated: (exercises: ExerciseDefinition[]) => void;
  activeGymName: string | null;
}

export const AdHocGeneratorDialog = ({ open, onOpenChange, onWorkoutGenerated, activeGymName }: AdHocGeneratorDialogProps) => {
  const { session } = useSession();
  const [timeInMinutes, setTimeInMinutes] = useState(30);
  const [workoutFocus, setWorkoutFocus] = useState<'Full Body' | 'Upper Body' | 'Lower Body'>('Full Body');
  const [useGymEquipment, setUseGymEquipment] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!session) {
      toast.error("You must be logged in to generate a workout.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/workouts/generate-adhoc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          time_in_minutes: timeInMinutes,
          workout_focus: workoutFocus,
          use_gym_equipment: useGymEquipment,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate workout.');
      }

      if (data.workout && data.workout.length > 0) {
        onWorkoutGenerated(data.workout);
        onOpenChange(false); // Close dialog on success
      } else {
        toast.info("Could not generate a workout with the selected options. Try a longer duration.");
      }
    } catch (err: any) {
      console.error("Error generating ad-hoc workout:", err);
      toast.error(`Failed to generate workout: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate a Timed Workout</DialogTitle>
          <DialogDescription>
            Select your preferences and let the AI build a quick workout for you.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          {/* Time Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="time-slider">Duration</Label>
              <span className="font-semibold">{timeInMinutes} minutes</span>
            </div>
            <Slider
              id="time-slider"
              value={[timeInMinutes]}
              onValueChange={(value) => setTimeInMinutes(value[0])}
              min={15}
              max={90}
              step={5}
              disabled={loading}
            />
          </div>

          {/* Workout Focus */}
          <div className="space-y-2">
            <Label>Workout Focus</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={workoutFocus === 'Full Body' ? 'default' : 'outline'}
                onClick={() => setWorkoutFocus('Full Body')}
                disabled={loading}
              >
                Full Body
              </Button>
              <Button
                variant={workoutFocus === 'Upper Body' ? 'default' : 'outline'}
                onClick={() => setWorkoutFocus('Upper Body')}
                disabled={loading}
              >
                Upper
              </Button>
              <Button
                variant={workoutFocus === 'Lower Body' ? 'default' : 'outline'}
                onClick={() => setWorkoutFocus('Lower Body')}
                disabled={loading}
              >
                Lower
              </Button>
            </div>
          </div>

          {/* Equipment Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="equipment-toggle" className="flex flex-col space-y-1">
              <span>Use Equipment from "{activeGymName || 'Your Active Gym'}"</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                If off, exercises from the global library will be used.
              </span>
            </Label>
            <Switch
              id="equipment-toggle"
              checked={useGymEquipment}
              onCheckedChange={setUseGymEquipment}
              disabled={loading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {loading ? "Generating..." : "Generate Workout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};