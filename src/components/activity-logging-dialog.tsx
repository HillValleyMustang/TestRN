"use client";

import React, { useState, useEffect } from "react";
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
import { convertDistance, KM_TO_MILES } from '@/lib/unit-conversions';

type ActivityLog = Tables<'activity_logs'>;
type ActivityType = "Cycling" | "Swimming" | "Tennis" | "Running";
type Profile = Tables<'profiles'>;

interface ActivityLoggingDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialActivity?: ActivityType | null;
  trigger?: React.ReactNode;
}

// Helper function to convert time string (e.g., "1h 30m", "90m", "1m 30s") to total seconds
const timeStringToSeconds = (timeStr: string): number => {
  let totalSeconds = 0;
  const hoursMatch = timeStr.match(/(\d+)h/);
  const minutesMatch = timeStr.match(/(\d+)m/);
  const secondsMatch = timeStr.match(/(\d+)s/);

  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1]) * 3600;
  }
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1]) * 60;
  }
  if (secondsMatch) {
    totalSeconds += parseInt(secondsMatch[1]);
  }
  return totalSeconds;
};

// Helper to format minutes and seconds into a display string (e.g., "1h 30m" or "90m")
const formatMinutesAndSecondsForStorage = (minutes: number, seconds: number): string => {
  const totalMinutes = minutes + Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (totalMinutes === 0 && remainingSeconds === 0) return "";
  if (totalMinutes === 0) return `${remainingSeconds}s`;
  if (remainingSeconds === 0) return `${totalMinutes}m`; // Corrected from remainingMinutes
  return `${totalMinutes}m ${remainingSeconds}s`;
};

// Schemas for activity logging forms
const distanceTimeSchema = z.object({
  distance: z.coerce.number().min(0.1, "Distance is required and must be positive."),
  minutes: z.coerce.number().min(0, "Minutes cannot be negative.").max(999, "Minutes must be less than 1000."),
  seconds: z.coerce.number().min(0, "Seconds cannot be negative.").max(59, "Seconds must be between 0 and 59."),
  log_date: z.string().min(1, "Date is required."),
}).refine(data => data.minutes > 0 || data.seconds > 0, {
  message: "Time (minutes or seconds) is required.",
  path: ["minutes"], // Attach error to minutes field
});

const cyclingSchema = distanceTimeSchema;
const runningSchema = distanceTimeSchema; // Running uses the same schema

const swimmingSchema = z.object({
  lengths: z.coerce.number().min(1, "Lengths is required and must be positive."),
  pool_size: z.coerce.number().min(1, "Pool size is required and must be positive."),
  log_date: z.string().min(1, "Date is required."),
});

const tennisSchema = z.object({
  duration: z.string().min(1, "Duration is required."),
  log_date: z.string().min(1, "Date is required."),
});

export const LogCyclingForm = ({ onLogSuccess }: { onLogSuccess: () => void }) => {
  const { session, supabase } = useSession();
  const [preferredDistanceUnit, setPreferredDistanceUnit] = useState<Profile['preferred_distance_unit']>('km');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session) return;
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('preferred_distance_unit')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching user profile for distance unit:", error);
      } else if (profileData) {
        setPreferredDistanceUnit(profileData.preferred_distance_unit || 'km');
      }
    };
    fetchUserProfile();
  }, [session, supabase]);

  const form = useForm<z.infer<typeof cyclingSchema>>({
    resolver: zodResolver(cyclingSchema),
    defaultValues: {
      distance: 0,
      minutes: 0,
      seconds: 0,
      log_date: new Date().toISOString().split('T')[0],
    },
  });

  async function onSubmit(values: z.infer<typeof cyclingSchema>) {
    if (!session) {
      toast.error("You must be logged in to log activities.");
      return;
    }

    // Convert input distance to KM for storage and PR comparison
    const distanceInKm = convertDistance(values.distance, preferredDistanceUnit as 'km' | 'miles', 'km');
    if (distanceInKm === null) {
      toast.error("Invalid distance value.");
      return;
    }

    const totalSeconds = (values.minutes * 60) + values.seconds;
    const timeStringForStorage = formatMinutesAndSecondsForStorage(values.minutes, values.seconds);

    let avgTimePerKm: number | null = null;
    if (distanceInKm > 0) {
      avgTimePerKm = totalSeconds / distanceInKm;
    }

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
        // For average time, lower is better (faster)
        isPR = previousLogs.every(log => log.avg_time === null || avgTimePerKm! < log.avg_time);
      }
    } catch (err) {
      console.error("Error checking cycling PR:", err);
    }

    const newLog: TablesInsert<'activity_logs'> = {
      user_id: session.user.id,
      activity_type: 'Cycling',
      distance: `${distanceInKm} km`, // Store in KM
      time: timeStringForStorage,
      avg_time: avgTimePerKm,
      is_pb: isPR,
      log_date: values.log_date,
    };

    const { error } = await supabase.from('activity_logs').insert([newLog]);

    if (error) {
      toast.error("Failed to log cycling activity: " + error.message);
    } else {
      toast.success("Cycling activity logged successfully!");
      form.reset();
      onLogSuccess();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="distance" render={({ field }) => ( <FormItem> <FormLabel>Distance ({preferredDistanceUnit})</FormLabel> <FormControl><Input type="number" step="0.1" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        <div className="flex gap-2">
          <FormField control={form.control} name="minutes" render={({ field }) => ( <FormItem className="flex-1"> <FormLabel>Minutes</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
          <FormField control={form.control} name="seconds" render={({ field }) => ( <FormItem className="flex-1"> <FormLabel>Seconds</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        </div>
        <FormField control={form.control} name="log_date" render={({ field }) => ( <FormItem> <FormLabel>Date</FormLabel> <FormControl><Input type="date" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        <Button type="submit" className="w-full">Log Cycling</Button>
      </form>
    </Form>
  );
};

// NEW: LogRunningForm component
export const LogRunningForm = ({ onLogSuccess }: { onLogSuccess: () => void }) => {
  const { session, supabase } = useSession();
  const [preferredDistanceUnit, setPreferredDistanceUnit] = useState<Profile['preferred_distance_unit']>('km');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session) return;
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('preferred_distance_unit')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching user profile for distance unit:", error);
      } else if (profileData) {
        setPreferredDistanceUnit(profileData.preferred_distance_unit || 'km');
      }
    };
    fetchUserProfile();
  }, [session, supabase]);

  const form = useForm<z.infer<typeof runningSchema>>({
    resolver: zodResolver(runningSchema),
    defaultValues: {
      distance: 0,
      minutes: 0,
      seconds: 0,
      log_date: new Date().toISOString().split('T')[0],
    },
  });

  async function onSubmit(values: z.infer<typeof runningSchema>) {
    if (!session) {
      toast.error("You must be logged in to log activities.");
      return;
    }

    const distanceInKm = convertDistance(values.distance, preferredDistanceUnit as 'km' | 'miles', 'km');
    if (distanceInKm === null) {
      toast.error("Invalid distance value.");
      return;
    }

    const totalSeconds = (values.minutes * 60) + values.seconds;
    const timeStringForStorage = formatMinutesAndSecondsForStorage(values.minutes, values.seconds);

    let avgTimePerKm: number | null = null;
    if (distanceInKm > 0) {
      avgTimePerKm = totalSeconds / distanceInKm;
    }

    let isPR = false;
    try {
      const { data: previousLogs, error: fetchError } = await supabase
        .from('activity_logs')
        .select('avg_time')
        .eq('user_id', session.user.id)
        .eq('activity_type', 'Running')
        .order('log_date', { ascending: false });

      if (fetchError) throw fetchError;

      if (avgTimePerKm !== null) {
        isPR = previousLogs.every(log => log.avg_time === null || avgTimePerKm! < log.avg_time);
      }
    } catch (err) {
      console.error("Error checking running PR:", err);
    }

    const newLog: TablesInsert<'activity_logs'> = {
      user_id: session.user.id,
      activity_type: 'Running',
      distance: `${distanceInKm} km`, // Store in KM
      time: timeStringForStorage,
      avg_time: avgTimePerKm,
      is_pb: isPR,
      log_date: values.log_date,
    };

    const { error } = await supabase.from('activity_logs').insert([newLog]);

    if (error) {
      toast.error("Failed to log running activity: " + error.message);
    } else {
      toast.success("Running activity logged successfully!");
      form.reset();
      onLogSuccess();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="distance" render={({ field }) => ( <FormItem> <FormLabel>Distance ({preferredDistanceUnit})</FormLabel> <FormControl><Input type="number" step="0.1" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        <div className="flex gap-2">
          <FormField control={form.control} name="minutes" render={({ field }) => ( <FormItem className="flex-1"> <FormLabel>Minutes</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
          <FormField control={form.control} name="seconds" render={({ field }) => ( <FormItem className="flex-1"> <FormLabel>Seconds</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        </div>
        <FormField control={form.control} name="log_date" render={({ field }) => ( <FormItem> <FormLabel>Date</FormLabel> <FormControl><Input type="date" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        <Button type="submit" className="w-full">Log Running</Button>
      </form>
    </Form>
  );
};


export const LogSwimmingForm = ({ onLogSuccess }: { onLogSuccess: () => void }) => {
  const { session, supabase } = useSession();
  const form = useForm<z.infer<typeof swimmingSchema>>({
    resolver: zodResolver(swimmingSchema),
    defaultValues: {
      lengths: 0,
      pool_size: 0,
      log_date: new Date().toISOString().split('T')[0],
    },
  });

  async function onSubmit(values: z.infer<typeof swimmingSchema>) {
    if (!session) {
      toast.error("You must be logged in to log activities.");
      return;
    }

    const totalLengths = values.lengths;
    let isPR = false;
    try {
      const { data: previousLogs, error: fetchError } = await supabase
        .from('activity_logs')
        .select('distance')
        .eq('user_id', session.user.id)
        .eq('activity_type', 'Swimming')
        .order('log_date', { ascending: false });

      if (fetchError) throw fetchError;

      const previousLengths = previousLogs.map(log => {
        const match = log.distance?.match(/^(\d+) lengths/);
        return match ? parseInt(match[1]) : 0;
      });

      isPR = previousLengths.every(prevLen => totalLengths > prevLen);
    } catch (err) {
      console.error("Error checking swimming PR:", err);
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
    } else {
      toast.success("Swimming activity logged successfully!");
      form.reset();
      onLogSuccess();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="lengths" render={({ field }) => ( <FormItem> <FormLabel>Lengths</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        <FormField control={form.control} name="pool_size" render={({ field }) => ( <FormItem> <FormLabel>Pool Size (meters)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        <FormField control={form.control} name="log_date" render={({ field }) => ( <FormItem> <FormLabel>Date</FormLabel> <FormControl><Input type="date" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        <Button type="submit" className="w-full">Log Swimming</Button>
      </form>
    </Form>
  );
};

export const LogTennisForm = ({ onLogSuccess }: { onLogSuccess: () => void }) => {
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

    const durationMinutes = timeStringToSeconds(values.duration) / 60; // Convert to minutes for PR check
    let isPR = false;
    try {
      const { data: previousLogs, error: fetchError } = await supabase
        .from('activity_logs')
        .select('time')
        .eq('user_id', session.user.id)
        .eq('activity_type', 'Tennis')
        .order('log_date', { ascending: false });

      if (fetchError) throw fetchError;

      const previousDurations = previousLogs.map(log => timeStringToSeconds(log.time || '0m') / 60);
      isPR = previousDurations.every(prevDur => durationMinutes > prevDur);
    } catch (err) {
      console.error("Error checking tennis PR:", err);
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
    } else {
      toast.success("Tennis activity logged successfully!");
      form.reset();
      onLogSuccess();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="duration" render={({ field }) => ( <FormItem> <FormLabel>Duration (e.g., 1h 30m or 90m)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        <FormField control={form.control} name="log_date" render={({ field }) => ( <FormItem> <FormLabel>Date</FormLabel> <FormControl><Input type="date" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        <Button type="submit" className="w-full">Log Tennis</Button>
      </form>
    </Form>
  );
};

export const ActivityLoggingDialog = ({ open, onOpenChange, initialActivity, trigger }: ActivityLoggingDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(initialActivity || null);

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const currentOpen = isControlled ? open : internalOpen;
  const setCurrentOpen = isControlled ? onOpenChange : setInternalOpen;

  useEffect(() => {
    if (currentOpen) {
      setSelectedActivity(initialActivity || null);
    }
  }, [currentOpen, initialActivity]);

  const handleActivitySelect = (activity: ActivityType) => {
    setSelectedActivity(activity);
  };

  const handleLogSuccess = () => {
    setCurrentOpen(false);
    setSelectedActivity(null);
  };

  return (
    <Dialog open={currentOpen} onOpenChange={setCurrentOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log New Activity</DialogTitle>
        </DialogHeader>
        {!selectedActivity ? (
          <div className="grid gap-4 py-4">
            <Button variant="outline" onClick={() => handleActivitySelect("Running")}> <Activity className="h-4 w-4 mr-2" /> Log Running </Button>
            <Button variant="outline" onClick={() => handleActivitySelect("Cycling")}> <Bike className="h-4 w-4 mr-2" /> Log Cycling </Button>
            <Button variant="outline" onClick={() => handleActivitySelect("Swimming")}> <Activity className="h-4 w-4 mr-2" /> Log Swimming </Button>
            <Button variant="outline" onClick={() => handleActivitySelect("Tennis")}> <Activity className="h-4 w-4 mr-2" /> Log Tennis </Button>
          </div>
        ) : (
          <div className="py-4">
            <h3 className="text-lg font-semibold mb-4">Log {selectedActivity}</h3>
            <Button variant="outline" className="mb-4 w-full" onClick={() => setSelectedActivity(null)}> Back to Activity Types </Button>
            {selectedActivity === "Running" && <LogRunningForm onLogSuccess={handleLogSuccess} />}
            {selectedActivity === "Cycling" && <LogCyclingForm onLogSuccess={handleLogSuccess} />}
            {selectedActivity === "Swimming" && <LogSwimmingForm onLogSuccess={handleLogSuccess} />}
            {selectedActivity === "Tennis" && <LogTennisForm onLogSuccess={handleLogSuccess} />}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};