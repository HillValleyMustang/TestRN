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
import { TablesInsert } from "@/types/supabase";

// Schemas for activity logging forms
const cyclingSchema = z.object({
  distance: z.string().min(1, "Distance is required."),
  time: z.string().min(1, "Time is required."),
  log_date: z.string().min(1, "Date is required."),
});

const swimmingSchema = z.object({
  lengths: z.string().min(1, "Lengths is required."),
  pool_size: z.string().min(1, "Pool size is required."),
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
      distance: "",
      time: "",
      log_date: new Date().toISOString().split('T')[0], // Default to today
    },
  });

  async function onSubmit(values: z.infer<typeof cyclingSchema>) {
    if (!session) {
      toast.error("You must be logged in to log activities.");
      return;
    }

    const distanceValue = parseFloat(values.distance);
    const timeParts = values.time.split('h').map(s => s.trim());
    let totalMinutes = 0;
    if (timeParts.length > 1) {
      totalMinutes += parseFloat(timeParts[0]) * 60;
      const remaining = timeParts[1].replace('m', '').trim();
      if (remaining) totalMinutes += parseFloat(remaining);
    } else {
      totalMinutes += parseFloat(timeParts[0].replace('m', '').trim());
    }

    const avgTimePerKm = totalMinutes / distanceValue;
    const avgMinutes = Math.floor(avgTimePerKm);
    const avgSeconds = Math.round((avgTimePerKm - avgMinutes) * 60);
    const avgTimeString = `${avgMinutes}m ${avgSeconds}s/km`;

    const newLog: TablesInsert<'activity_logs'> = {
      user_id: session.user.id,
      activity_type: 'Cycling',
      distance: values.distance + ' km',
      time: values.time,
      avg_time: avgTimeString,
      is_pb: false, // Placeholder, will implement actual PB logic later
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
      lengths: "",
      pool_size: "",
      log_date: new Date().toISOString().split('T')[0],
    },
  });

  async function onSubmit(values: z.infer<typeof swimmingSchema>) {
    if (!session) {
      toast.error("You must be logged in to log activities.");
      return;
    }

    const newLog: TablesInsert<'activity_logs'> = {
      user_id: session.user.id,
      activity_type: 'Swimming',
      distance: `${values.lengths} lengths (${values.pool_size}m pool)`,
      time: null, // Swimming time can be added later if needed
      avg_time: null,
      is_pb: false,
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

    const newLog: TablesInsert<'activity_logs'> = {
      user_id: session.user.id,
      activity_type: 'Tennis',
      distance: null,
      time: values.duration,
      avg_time: null,
      is_pb: false,
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