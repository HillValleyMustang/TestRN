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
import { ArrowLeft } from 'lucide-react';
import { Tables, TablesUpdate } from '@/types/supabase';

type Profile = Tables<'profiles'>;

const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required.").optional().or(z.literal('')),
  last_name: z.string().min(1, "Last name is required.").optional().or(z.literal('')),
  height_cm: z.coerce.number().min(1, "Height must be positive.").optional().nullable(),
  weight_kg: z.coerce.number().min(1, "Weight must be positive.").optional().nullable(),
  primary_goal: z.string().optional().nullable(),
  health_notes: z.string().optional().nullable(),
});

export default function ProfilePage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      height_cm: null,
      weight_kg: null,
      primary_goal: null,
      health_notes: null,
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
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          height_cm: data.height_cm,
          weight_kg: data.weight_kg,
          primary_goal: data.primary_goal,
          health_notes: data.health_notes,
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

    const updateData: TablesUpdate<'profiles'> = {
      first_name: values.first_name || null,
      last_name: values.last_name || null,
      height_cm: values.height_cm,
      weight_kg: values.weight_kg,
      primary_goal: values.primary_goal,
      health_notes: values.health_notes,
      updated_at: new Date().toISOString(), // Add updated_at timestamp
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(updateData, { onConflict: 'id' }) // Use upsert to insert if not exists, update if exists
      .eq('id', session.user.id);

    if (error) {
      toast.error("Failed to update profile: " + error.message);
      console.error("Error updating profile:", error);
    } else {
      toast.success("Profile updated successfully!");
      // Re-fetch profile to ensure UI is in sync, or update state directly
      setProfile(prev => ({ ...prev, ...updateData } as Profile));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </header>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="height_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} />
                      </FormControl>
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
                      <FormControl>
                        <Input type="number" step="0.1" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="primary_goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Fitness Goal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your primary goal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                        <SelectItem value="fat_loss">Fat Loss</SelectItem>
                        <SelectItem value="strength_increase">Strength Increase</SelectItem>
                        <SelectItem value="endurance_improvement">Endurance Improvement</SelectItem>
                        <SelectItem value="overall_fitness">Overall Fitness</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <FormControl>
                      <Textarea placeholder="Any relevant health notes or considerations" {...field} value={field.value ?? ''} />
                    </FormControl>
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