"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from 'sonner';
import { Profile as ProfileType, ProfileUpdate } from '@/types/supabase';
import { LoadingOverlay } from '@/components/loading-overlay';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Edit, Save, User, Weight, Ruler, Percent, HeartPulse, StickyNote, Settings, LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type Profile = ProfileType;

const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().optional(),
  height_cm: z.coerce.number().positive("Height must be positive.").optional().nullable(),
  weight_kg: z.coerce.number().positive("Weight must be positive.").optional().nullable(),
  body_fat_pct: z.coerce.number().min(0, "Cannot be negative.").max(100, "Cannot exceed 100.").optional().nullable(),
  primary_goal: z.string().optional().nullable(),
  health_notes: z.string().optional().nullable(),
  preferred_weight_unit: z.enum(["kg", "lbs"]).optional(),
  preferred_distance_unit: z.enum(["km", "miles"]).optional(),
});

export default function ProfilePage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      height_cm: null,
      weight_kg: null,
      body_fat_pct: null,
      primary_goal: null,
      health_notes: "",
      preferred_weight_unit: "kg",
      preferred_distance_unit: "km",
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

      if (error && error.code !== 'PGRST116') {
        toast.error("Failed to load profile: " + error.message);
      } else if (data) {
        setProfile(data as Profile);
        form.reset({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          height_cm: data.height_cm,
          weight_kg: data.weight_kg,
          body_fat_pct: data.body_fat_pct,
          primary_goal: data.primary_goal,
          health_notes: data.health_notes,
          preferred_weight_unit: data.preferred_weight_unit || "kg",
          preferred_distance_unit: data.preferred_distance_unit || "km",
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [session, router, supabase, form]);

  const { bmi, dailyCalories } = useMemo(() => {
    const weight = profile?.weight_kg;
    const height = profile?.height_cm;
    if (!weight || !height) return { bmi: null, dailyCalories: null };

    const heightInMeters = height / 100;
    const bmiValue = (weight / (heightInMeters * heightInMeters)).toFixed(1);
    
    // Simplified BMR calculation (Mifflin-St Jeor) with assumed age of 30
    const bmr = (10 * weight) + (6.25 * height) - (5 * 30) + 5;
    const caloriesValue = Math.round(bmr * 1.375); // Lightly active multiplier

    return { bmi: bmiValue, dailyCalories: caloriesValue.toLocaleString() };
  }, [profile]);

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    if (!session) return;

    const updateData: ProfileUpdate = {
      ...values,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', session.user.id);

    if (error) {
      toast.error("Failed to update profile: " + error.message);
    } else {
      toast.success("Profile updated successfully!");
      setProfile(prev => prev ? { ...prev, ...updateData } as Profile : null);
      setIsEditing(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const userInitial = profile?.first_name ? profile.first_name[0].toUpperCase() : (session?.user.email ? session.user.email[0].toUpperCase() : '?');

  return (
    <div className="p-2 sm:p-4 max-w-4xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-2xl">{userInitial}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {isEditing ? "Edit Profile" : `${profile?.first_name || "Your"} Profile`}
                </h1>
                <p className="text-muted-foreground">{session?.user.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button type="button" variant="outline" onClick={() => { setIsEditing(false); form.reset(); }}>Cancel</Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" /> Save Changes
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Profile
                </Button>
              )}
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle>BMI</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{bmi || 'N/A'}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Daily Calories (Est.)</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{dailyCalories || 'N/A'}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Workouts</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">Coming Soon</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="first_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    {isEditing ? <FormControl><Input {...field} /></FormControl> : <p className="font-semibold">{field.value}</p>}
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="last_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    {isEditing ? <FormControl><Input {...field} value={field.value ?? ''} /></FormControl> : <p className="font-semibold">{field.value || '-'}</p>}
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Weight className="h-5 w-5" /> Body Metrics</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="height_cm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (cm)</FormLabel>
                    {isEditing ? <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl> : <p className="font-semibold">{field.value || '-'} cm</p>}
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="weight_kg" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    {isEditing ? <FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} /></FormControl> : <p className="font-semibold">{field.value || '-'} kg</p>}
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="body_fat_pct" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body Fat (%)</FormLabel>
                    {isEditing ? <FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} className="w-full sm:w-32" /></FormControl> : <p className="font-semibold">{field.value || '-'} %</p>}
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5" /> Fitness Goals</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="primary_goal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Goal</FormLabel>
                  {isEditing ? (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select your goal" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                        <SelectItem value="fat_loss">Fat Loss</SelectItem>
                        <SelectItem value="strength_increase">Strength Increase</SelectItem>
                        <SelectItem value="endurance_improvement">Endurance Improvement</SelectItem>
                        <SelectItem value="overall_fitness">Overall Fitness</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : <p className="font-semibold capitalize">{field.value?.replace(/_/g, ' ') || '-'}</p>}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="health_notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Health Notes</FormLabel>
                  {isEditing ? <FormControl><Input {...field} value={field.value ?? ''} placeholder="e.g., Previous shoulder injury" /></FormControl> : <p className="font-semibold">{field.value || 'None'}</p>}
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Preferences</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="preferred_weight_unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight Unit</FormLabel>
                  {isEditing ? (
                    <Select onValueChange={field.onChange} value={field.value || 'kg'}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="kg">Kilograms (kg)</SelectItem><SelectItem value="lbs">Pounds (lbs)</SelectItem></SelectContent>
                    </Select>
                  ) : <p className="font-semibold">{field.value === 'lbs' ? 'Pounds (lbs)' : 'Kilograms (kg)'}</p>}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="preferred_distance_unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>Distance Unit</FormLabel>
                  {isEditing ? (
                    <Select onValueChange={field.onChange} value={field.value || 'km'}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="km">Kilometers (km)</SelectItem><SelectItem value="miles">Miles (miles)</SelectItem></SelectContent>
                    </Select>
                  ) : <p className="font-semibold">{field.value === 'miles' ? 'Miles (miles)' : 'Kilograms (km)'}</p>}
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </form>
      </Form>
      <MadeWithDyad />
    </div>
  );
}