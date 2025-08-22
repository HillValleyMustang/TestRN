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
import { Profile as ProfileType, ProfileUpdate, Tables } from '@/types/supabase'; // Use alias for Profile
import { TPathSwitcher } from '@/components/t-path-switcher';
import { LoadingOverlay } from '@/components/loading-overlay'; // Import the new component

type Profile = ProfileType; // Use the aliased type
type TPath = Tables<'t_paths'>;

const profileSchema = z.object({
  preferred_name: z.string().min(1, "Preferred name is required.").optional().or(z.literal('')),
  height_cm: z.coerce.number().min(1, "Height must be positive.").optional().nullable(),
  weight_kg: z.coerce.number().min(1, "Weight must be positive.").optional().nullable(),
  body_fat_pct: z.coerce.number().min(0, "Body fat percentage must be 0 or greater.").max(100, "Body fat percentage cannot exceed 100.").optional().nullable(),
  primary_goal: z.string().optional().nullable(),
  health_notes: z.string().optional().nullable(),
  preferred_weight_unit: z.enum(["kg", "lbs"]).optional(), // Allow both kg and lbs
  preferred_distance_unit: z.enum(["km", "miles"]).optional(), // Allow both km and miles
  default_rest_time_seconds: z.coerce.number().min(0, "Rest time cannot be negative.").optional().nullable(),
  preferred_muscles: z.string().optional().nullable(),
  preferred_session_length: z.enum(["15-30", "30-45", "45-60", "60-90"]).optional().nullable(), // New field
});

export default function ProfilePage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTPathId, setActiveTPathId] = useState<string>('');
  const [activeTPathName, setActiveTPathName] = useState<string | null>(null);
  const [aiCoachUsage, setAiCoachUsage] = useState<{ count: number; lastUsed: string | null }>({ count: 0, lastUsed: null });
  const [showRegenerationLoading, setShowRegenerationLoading] = useState(false); // New state for loading overlay

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      preferred_name: "",
      height_cm: null,
      weight_kg: null,
      body_fat_pct: null,
      primary_goal: null,
      health_notes: null,
      preferred_weight_unit: "kg", // Default to kg
      preferred_distance_unit: "km", // Default to km
      default_rest_time_seconds: 60, // Default to 60s
      preferred_muscles: null,
      preferred_session_length: "45-60", // Default value
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
        .select('first_name, last_name, height_cm, weight_kg, body_fat_pct, primary_goal, health_notes, preferred_weight_unit, preferred_distance_unit, default_rest_time_seconds, preferred_muscles, preferred_session_length, active_t_path_id, last_ai_coach_use_at, created_at, full_name, id, target_date, updated_at') // Specify all columns required by Profile
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        toast.error("Failed to load profile: " + error.message);
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile(data as Profile); // Cast to the extended Profile type
        
        // Fetch active T-Path name if active_t_path_id exists
        let currentTPathName: string | null = null;
        if (data.active_t_path_id) {
          const { data: tPathData, error: tPathError } = await supabase
            .from('t_paths')
            .select('template_name')
            .eq('id', data.active_t_path_id)
            .single();
          if (tPathError) {
            console.error("Error fetching active T-Path name:", tPathError);
          } else if (tPathData) {
            currentTPathName = tPathData.template_name;
          }
        }
        setActiveTPathName(currentTPathName);
        setActiveTPathId(data.active_t_path_id || '');

        form.reset({
          preferred_name: (data.first_name || "") + (data.last_name ? " " + data.last_name : ""),
          height_cm: data.height_cm,
          weight_kg: data.weight_kg,
          body_fat_pct: data.body_fat_pct,
          primary_goal: data.primary_goal,
          health_notes: data.health_notes,
          preferred_weight_unit: data.preferred_weight_unit || "kg", // Use fetched value or default
          preferred_distance_unit: data.preferred_distance_unit || "km", // Use fetched value or default
          default_rest_time_seconds: data.default_rest_time_seconds || 60,
          preferred_muscles: data.preferred_muscles,
          preferred_session_length: data.preferred_session_length || "45-60", // Set default if null
        });
        
        // Set AI coach usage info
        if (data.last_ai_coach_use_at) {
          setAiCoachUsage({
            count: 1, // Simplified
            lastUsed: new Date(data.last_ai_coach_use_at).toLocaleString()
          });
        }
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

    const oldSessionLength = profile?.preferred_session_length;

    // Split preferred name into first and last name
    let firstName = "";
    let lastName = "";
    if (values.preferred_name) {
      const nameParts = values.preferred_name.trim().split(" ");
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    }

    const updateData: ProfileUpdate = { // Use ProfileUpdate type
      first_name: firstName || null,
      last_name: lastName || null,
      height_cm: values.height_cm,
      weight_kg: values.weight_kg,
      body_fat_pct: values.body_fat_pct,
      primary_goal: values.primary_goal,
      health_notes: values.health_notes,
      preferred_weight_unit: values.preferred_weight_unit,
      preferred_distance_unit: values.preferred_distance_unit,
      default_rest_time_seconds: values.default_rest_time_seconds,
      preferred_muscles: values.preferred_muscles,
      preferred_session_length: values.preferred_session_length, // Update preferred session length
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

      // If session length changed and there's an active T-Path, regenerate workouts
      if (values.preferred_session_length !== oldSessionLength && activeTPathId) {
        toast.info("Session length changed. Regenerating T-Path workouts...");
        setShowRegenerationLoading(true); // Show loading overlay
        try {
          const response = await fetch(`/api/generate-t-path`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ tPathId: activeTPathId })
          });

          if (!response.ok) {
            throw new Error('Failed to regenerate T-Path workouts');
          }
          toast.success("T-Path workouts updated successfully!");
          // Add a small delay before redirecting to allow database changes to propagate
          setTimeout(() => {
            router.push('/start-t-path'); 
          }, 1000); // 1 second delay
        } catch (regenError: any) {
          toast.error("Failed to regenerate T-Path workouts: " + regenError.message);
          console.error("Error regenerating T-Path:", regenError);
        } finally {
          setShowRegenerationLoading(false); // Hide loading overlay
        }
      } else {
        // If no regeneration, just stay on profile page or redirect to dashboard
        // For now, let's just stay on the profile page if no regeneration happened
      }
    }
  }

  const handleTPathChange = async (newTPathId: string) => {
    if (!session) return;

    try {
      // Update the active_t_path_id in the user's profile
      const { error } = await supabase
        .from('profiles')
        .update({ active_t_path_id: newTPathId })
        .eq('id', session.user.id);

      if (error) throw error;

      setActiveTPathId(newTPathId);
      // Re-fetch profile to update activeTPathName
      const { data: tPathData, error: tPathError } = await supabase
        .from('t_paths')
        .select('template_name')
        .eq('id', newTPathId)
        .single();
      if (tPathError) {
        console.error("Error fetching new active T-Path name:", tPathError);
      } else if (tPathData) {
        setActiveTPathName(tPathData.template_name);
      }

      toast.success("Active T-Path switched successfully!");

      // ********************************************************************
      // IMPORTANT: After switching the T-Path, we need to regenerate its workouts.
      // The `generate-t-path` function expects the ID of the *main* T-Path.
      // The `newTPathId` passed here is the ID of the *main* T-Path.
      // So, we can directly call the generation API for this newTPathId.
      // ********************************************************************
      setShowRegenerationLoading(true); // Show loading overlay for regeneration
      const response = await fetch(`/api/generate-t-path`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ tPathId: newTPathId }) // Use the newTPathId here
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate T-Path workouts after switch');
      }
      toast.success("New T-Path workouts generated successfully!");
      setTimeout(() => {
        router.push('/start-t-path'); // Redirect to start-t-path to see the new workouts
      }, 1000);
    } catch (err: any) {
      toast.error("Failed to switch T-Path: " + err.message);
      console.error("Error switching T-Path:", err);
    } finally {
      setShowRegenerationLoading(false); // Hide loading overlay
    }
  };

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

      {/* Wrap all cards that contain form fields with the FormProvider and form tag */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
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
                      <Select onValueChange={field.onChange} value={field.value || 'kg'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferred_distance_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'km'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="km">Kilometers (km)</SelectItem>
                          <SelectItem value="miles">Miles (miles)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
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
            </CardContent>
          </Card>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>T-Path Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Active Transformation Path:</p>
                  <p className="text-lg font-semibold">{activeTPathName || 'None Selected'}</p>
                </div>
                <FormField
                  control={form.control}
                  name="preferred_session_length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Session Length</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select preferred session length" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="15-30">15-30 minutes</SelectItem>
                          <SelectItem value="30-45">30-45 minutes</SelectItem>
                          <SelectItem value="45-60">45-60 minutes</SelectItem>
                          <SelectItem value="60-90">60-90 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Changing this will regenerate your active T-Path workouts.
                      </p>
                    </FormItem>
                  )}
                />
                <TPathSwitcher 
                  currentTPathId={activeTPathId} 
                  onTPathChange={handleTPathChange} 
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full">Update Profile</Button>
        </form>
      </Form>

      {/* This card is not part of the form submission, so it remains outside */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>AI Coach Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              You have used the AI Coach {aiCoachUsage.count} times today.
            </p>
            {aiCoachUsage.lastUsed && (
              <p className="text-sm text-muted-foreground">
                Last used: {aiCoachUsage.lastUsed}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Limit: 2 uses per session. The AI Coach needs at least 3 workouts in the last 30 days to provide advice.
            </p>
          </div>
        </CardContent>
      </Card>

      <MadeWithDyad />
      <LoadingOverlay isOpen={showRegenerationLoading} title="Generating Workouts" description="Please wait while your personalised workouts are created." />
    </div>
  );
}