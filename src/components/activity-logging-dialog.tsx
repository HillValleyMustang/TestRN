"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, Bike, Activity } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSession } from "@/components/session-context-provider";
import { TablesInsert, Tables } from "@/types/supabase";

type ActivityLog = Tables<'activity_logs'>;

// Helper function to convert time string (e.g., "1h 30m") to total minutes
const timeStringToMinutes = (timeStr: string): number => {
  let totalMinutes = 0;
  const hoursMatch = timeStr.match(/(\d+)h/);
  const minutesMatch = timeStr.match(/(\d+)m/);

  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1]) * 60;
  }
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1]);
  }
  return totalMinutes;
};

// Schemas for activity logging forms
const cyclingSchema = z.object({
  distance: z.coerce.number().min(0.1, "Distance is required and must be positive."),
  time: z.string().min(1, "Time is required."),
  log_date: z.string().min(1, "Date is required."),
});

const swimmingSchema = z.object({
  lengths: z.coerce.number().min(1, "Lengths is required and must be positive."),
  pool_size: z.coerce.number().min(1, "Pool size is required and must be positive."),
  log_date: z.string().min(1, "Date is required."),
});

const tennisSchema = z.object({
  duration: z.string().min(1, "Duration is required."),
  log_date: z.string().min(1, "Date is required."),
});

type ActivityType = "Cycling" | "Swimming" | "Tennis";

const LogCyclingForm = ({ onLogSuccess }: { onLogSuccess: () => void }) => {
  const { session, supabase } = useSession();
  const form = useForm<z.infer<typeof cyclingSchema>>({
    resolver: zodResolver(cyclingSchema),
    defaultValues: {
      distance: 0, // Now a number
      time: "",
      log_date: new Date().toISOString().split('T')[0], // Default to today
    },
  });

  async function onSubmit(values: z.infer<typeof cyclingSchema>) {
    if (!session) {
      toast.error("You must be logged in to log activities.");
      return;
    }

    const distanceValue = values.distance; // This will be a number due to z.coerce.number()
    const totalMinutes = timeStringToMinutes(values.time);
    const totalSeconds = totalMinutes * 60;

    let avgTimePerKm: number | null = null;
    if (distanceValue > 0) {
      avgTimePerKm = totalSeconds / distanceValue; // seconds per km
    }

    // Check for PR
    let isPR = false;
    try {
      const { data: previousLogs, error: fetchError } = await supabase
        .from('activity_logs')
        .select('avg_time')
        .eq('user_id', session.user.id)
        .eq('activity_type', 'Cycling')
        .order('log_date', { ascending: false });

      if (fetchError) throw fetchError;

      if (avgTimePerKm !== null) {
        // A new PR if current avg_time is lower than all previous avg_times
        isPR = previousLogs.every(log => log.avg_time === null || avgTimePerKm! < log.avg_time);
      }
    } catch (err) {
      console.error("Error checking cycling PR:", err);
      toast.error("Failed to check PR status.");
    }

    const newLog: TablesInsert<'activity_logs'> = {
      user_id: session.user.id,
      activity_type: 'Cycling',
      distance: `${values.distance} km`,
      time: values.time,
      avg_time: avgTimePerKm,
      is_pb: isPR,
      log_date: values.log_date,
    };

    const { error } = await supabase.from('activity_logs').insert([newLog]);

    if (error) {
      toast.error("Failed to log cycling activity: " + error.message);
      console.error("Error logging cycling activity:", error);
    } else {
      toast.success("Cycling activity logged successfully!");
      form.reset();
      onLogSuccess();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="distance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Distance (km)</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time (e.g., 1h 30m)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="log_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">Log Cycling</Button>
      </form>
    </Form>
  );
};

const LogSwimmingForm = ({ onLogSuccess }: { onLogSuccess: () => void }) => {
  const { session, supabase } = useSession();
  const form = useForm<z.infer<typeof swimmingSchema>>({
    resolver: zodResolver(swimmingSchema),
    defaultValues: {
      lengths: 0, // Now a number
      pool_size: 0, // Now a number
      log_date: new Date().toISOString().split('T')[0],
    },
  });

  async function onSubmit(values: z.infer<typeof swimmingSchema>) {
    if (!session) {
      toast.error("You must be logged in to log activities.");
      return;
    }

    const totalLengths = values.lengths; // This will be a number

    // Check for PR
    let isPR = false;
    try {
      const { data: previousLogs, error: fetchError } = await supabase
        .from('activity_logs')
        .select('distance') // We need to parse lengths from distance string
        .eq('user_id', session.user.id)
        .eq('activity_type', 'Swimming')
        .order('log_date', { ascending: false });

      if (fetchError) throw fetchError;

      // Extract lengths from previous logs
      const previousLengths = previousLogs.map(log => {
        const match = log.distance?.match(/^(\d+) lengths/);
        return match ? parseInt(match[1]) : 0;
      });

      // A new PR if current totalLengths is greater than all previous totalLengths
      isPR = previousLengths.every(prevLen => totalLengths > prevLen);

    } catch (err) {
      console.error("Error checking swimming PR:", err);
      toast.error("Failed to check PR status.");
    }

    const newLog: TablesInsert<'activity_logs'> = {
      user_id: session.user.id,
      activity_type: 'Swimming',
      distance: `${values.lengths} lengths (${values.pool_size}m pool)`,
      time: null,
      avg_time: null,
      is_pb: isPR,
      log_date: values.log_date,
    };

    const { error } = await supabase.from('activity_logs').insert([newLog]);

    if (error) {
      toast.error("Failed to log swimming activity: " + error.message);
      console.error("Error logging swimming activity:", error);
    } else {
      toast.success("Swimming activity logged successfully!");
      form.reset();
      onLogSuccess();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="lengths"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lengths</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="pool_size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pool Size (meters)</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="log_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">Log Swimming</Button>
      </form>
    </Form>
  );
};

const LogTennisForm = ({ onLogSuccess }: { onLogSuccess: () => void }) => {
  const { session, supabase } = useSession();
  const form = useForm<z.infer<typeof tennisSchema>>({
    resolver: zodResolver(tennisSchema),
    defaultValues: {
      duration: "",
      log_date: new Date().toISOString().split('T')[0],
    },
  });

  async function onSubmit(values: z.infer<typeof tennisSchema>) {
    if (!session) {
      toast.error("You must be logged in to log activities.");
      return;
    }

    const durationMinutes = timeStringToMinutes(values.duration);

    // Check for PR
    let isPR = false;
    try {
      const { data: previousLogs, error: fetchError } = await supabase
        .from('activity_logs')
        .select('time')
        .eq('user_id', session.user.id)
        .eq('activity_type', 'Tennis')
        .order('log_date', { ascending: false });

      if (fetchError) throw fetchError;

      const previousDurations = previousLogs.map(log => timeStringToMinutes(log.time || '0m'));

      // A new PR if current duration is greater than all previous durations
      isPR = previousDurations.every(prevDur => durationMinutes > prevDur);

    } catch (err) {
      console.error("Error checking tennis PR:", err);
      toast.error("Failed to check PR status.");
    }

    const newLog: TablesInsert<'activity_logs'> = {
      user_id: session.user.id,
      activity_type: 'Tennis',
      distance: null,
      time: values.duration,
      avg_time: null,
      is_pb: isPR,
      log_date: values.log_date,
    };

    const { error } = await supabase.from('activity_logs').insert([newLog]);

    if (error) {
      toast.error("Failed to log tennis activity: " + error.message);
      console.error("Error logging tennis activity:", error);
    } else {
      toast.success("Tennis activity logged successfully!");
      form.reset();
      onLogSuccess();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (e.g., 1h 30m)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="log_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">Log Tennis</Button>
      </form>
    </Form>
  );
};


export const ActivityLoggingDialog = () => {
  const [open, setOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);

  const handleActivitySelect = (activity: ActivityType) => {
    setSelectedActivity(activity);
  };

  const handleLogSuccess = () => {
    setOpen(false); // Close the main dialog
    setSelectedActivity(null); // Reset selected activity
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="justify-start">
          <CalendarDays className="h-4 w-4 mr-2" />
          <span>Log Activity</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log New Activity</DialogTitle>
        </DialogHeader>
        {!selectedActivity ? (
          <div className="grid gap-4 py-4">
            <Button variant="outline" onClick={() => handleActivitySelect("Cycling")}>
              <Bike className="h-4 w-4 mr-2" /> Log Cycling
            </Button>
            <Button variant="outline" onClick={() => handleActivitySelect("Swimming")}>
              <Activity className="h-4 w-4 mr-2" /> Log Swimming
            </Button>
            <Button variant="outline" onClick={() => handleActivitySelect("Tennis")}>
              <Activity className="h-4 w-4 mr-2" /> Log Tennis
            </Button>
          </div>
        ) : (
          <div className="py-4">
            <h3 className="text-lg font-semibold mb-4">Log {selectedActivity}</h3>
            {selectedActivity === "Cycling" && <LogCyclingForm onLogSuccess={handleLogSuccess} />}
            {selectedActivity === "Swimming" && <LogSwimmingForm onLogSuccess={handleLogSuccess} />}
            {selectedActivity === "Tennis" && <LogTennisForm onLogSuccess={handleLogSuccess} />}
            <Button variant="outline" className="mt-4 w-full" onClick={() => setSelectedActivity(null)}>
              Back to Activity Types
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};