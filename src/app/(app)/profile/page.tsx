"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from 'sonner';
import { Tables, TablesUpdate } from '@/types/supabase';

type Profile = Tables<'profiles'>;

const profileSchema = z.object({
  preferred_name: z.string().min(1, "Preferred name is required.").optional().or(z.literal('')),
  height_cm: z.coerce.number().min(1, "Height must be positive.").optional().nullable(),
  weight_kg: z.coerce.number().min(1, "Weight must be positive.").optional().nullable(),
  body_fat_pct: z.coerce.number().min(0, "Body fat percentage must be 0 or greater.").max(100, "Body fat percentage cannot exceed 100.").optional().nullable(),
  primary_goal: z.string().optional().nullable(),
  health_notes: z.string().optional().nullable(),
  preferred_weight_unit: z.enum(["kg"]).optional(), // Fixed to kg only
  preferred_distance_unit: z.enum(["km"]).optional(), // Fixed to km only
  default_rest_time_seconds: z.coerce.number().min(0, "Rest time cannot be negative.").optional().nullable(),
  preferred_muscles: z.string().optional().nullable(),
});

export default function ProfilePage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      preferred_name: "",
      height_cm: null,
      weight_kg: null,
      body_fat_pct: null,
      primary_goal: null,
      health_notes: null,
      preferred_weight_unit: "kg", // Fixed to kg only
      preferred_distance_unit: "km", // Fixed to km only
      default_rest_time_seconds: 60, // Default to 60s
      preferred_muscles: null,
    },
  });

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        toast.error("Failed to load profile: " + error.message);
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile(data);
        form.reset({
          preferred_name: (data.first_name || "") + (data.last_name ? " " + data.last_name : ""),
          height_cm: data.height_cm,
          weight_kg: data.weight_kg,
          body_fat_pct: data.body_fat_pct,
          primary_goal: data.primary_goal,
          health_notes: data.health_notes,
          preferred_weight_unit: "kg", // Fixed to kg only
          preferred_distance_unit: "km", // Fixed to km only
          default_rest_time_seconds: data.default_rest_time_seconds || 60,
          preferred_muscles: data.preferred_muscles,
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [session, router, supabase, form]);

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    if (!session) {
      toast.error("You must be logged in to update your profile.");
      return;
    }

    // Split preferred name into first and last name
    let firstName = "";
    let lastName = "";
    if (values.preferred_name) {
      const nameParts = values.preferred_name.trim().split(" ");
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    }

    const updateData: TablesUpdate<'profiles'> = {
      first_name: firstName || null,
      last_name: lastName || null,
      height_cm: values.height_cm,
      weight_kg: values.weight_kg,
      body_fat_pct: values.body_fat_pct,
      primary_goal: values.primary_goal,
      health_notes: values.health_notes,
      preferred_weight_unit: "kg", // Fixed to kg only
      preferred_distance_unit: "km", // Fixed to km only
      default_rest_time_seconds: values.default_rest_time_seconds,
      preferred_muscles: values.preferred_muscles,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .upsert({ ...updateData, id: session.user.id }, { onConflict: 'id' })
      .eq('id', session.user.id);

    if (error) {
      toast.error("Failed to update profile: " + error.message);
      console.error("Error updating profile:", error);
    } else {
      toast.success("Profile updated successfully!");
      setProfile((prev: Profile | null) => ({ ...prev, ...updateData } as Profile));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">My Profile</h1>
      </header>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="preferred_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Name</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="height_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl><Input type="number" step="1" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weight_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="body_fat_pct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body Fat Percentage (%)</FormLabel>
                    <FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primary_goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Fitness Goal</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your primary goal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                          <SelectItem value="fat_loss">Fat Loss</SelectItem>
                          <SelectItem value="strength_increase">Strength Increase</SelectItem>
                          <SelectItem value="endurance_improvement">Endurance Improvement</SelectItem>
                          <SelectItem value="overall_fitness">Overall Fitness</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="preferred_weight_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">Fixed to kg for MVP</p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferred_distance_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="km">Kilometers (km)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">Fixed to km for MVP</p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="default_rest_time_seconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Rest Time</FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString() || '60'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rest time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="30">30 seconds</SelectItem>
                          <SelectItem value="60">60 seconds</SelectItem>
                          <SelectItem value="120">120 seconds</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="preferred_muscles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Muscles to Train (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., Chest, Back, Legs..." {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="health_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Health Notes (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Any relevant health notes or considerations" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Update Profile</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <MadeWithDyad />
    </div>
  );
}