"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSession } from "@/components/session-context-provider";
import { useEffect, useState } from "react";
import { Tables } from "@/types/supabase";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

const profileFormSchema = z.object({
  full_name: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }).max(50, {
    message: "Full name must not be longer than 50 characters.",
  }).optional().or(z.literal('')),
  first_name: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }).max(50, {
    message: "First name must not be longer than 50 characters.",
  }),
  preferred_session_length: z.enum(["15-30", "30-45", "45-60", "60-90"], {
    required_error: "Please select your preferred session length.",
  }),
  programme_type: z.enum(["ulul", "ppl"], {
    required_error: "Please select your preferred programme type.",
  }),
  primary_goal: z.string().min(2, {
    message: "Primary goal must be at least 2 characters.",
  }).max(100, {
    message: "Primary goal must not be longer than 100 characters.",
  }).optional().or(z.literal('')),
  preferred_muscles: z.string().max(255, {
    message: "Preferred muscles must not be longer than 255 characters.",
  }).optional().or(z.literal('')),
  health_notes: z.string().max(500, {
    message: "Health notes must not be longer than 500 characters.",
  }).optional().or(z.literal('')),
  is_onboarded: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileSettingsTab() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: "onChange",
    defaultValues: {
      full_name: "",
      first_name: "",
      preferred_session_length: "30-45", // Default value
      programme_type: "ulul", // Default value
      primary_goal: "",
      preferred_muscles: "",
      health_notes: "",
      is_onboarded: false,
    },
  });

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found
        if (data) {
          setProfile(data);
          form.reset({ // Reset form with fetched data
            full_name: data.full_name || '',
            first_name: data.first_name || '',
            preferred_session_length: data.preferred_session_length || "30-45",
            programme_type: data.programme_type || "ulul",
            primary_goal: data.primary_goal || '',
            preferred_muscles: data.preferred_muscles || '',
            health_notes: data.health_notes || '',
            is_onboarded: data.is_onboarded || false,
          });
        }
      } catch (error: any) {
        console.error("Error fetching profile:", error.message);
        toast.error("Failed to load profile settings.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session, router, supabase, form]); // Added form to dependencies

  async function onSubmit(data: ProfileFormValues) {
    if (!session) {
      toast.error("You must be logged in to update your profile.");
      return;
    }

    const originalPreferredSessionLength = profile?.preferred_session_length;
    const sessionLengthChanged = originalPreferredSessionLength !== data.preferred_session_length;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          first_name: data.first_name,
          preferred_session_length: data.preferred_session_length,
          programme_type: data.programme_type,
          primary_goal: data.primary_goal,
          preferred_muscles: data.preferred_muscles,
          health_notes: data.health_notes,
          is_onboarded: data.is_onboarded,
        })
        .eq('id', session.user.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");

      if (sessionLengthChanged) {
        toast.info("Preferred session length changed. Regenerating workout plans...");
        const regenerateResponse = await fetch('/api/regenerate-all-plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!regenerateResponse.ok) {
          const errorData = await regenerateResponse.json();
          throw new Error(errorData.error || 'Failed to regenerate workout plans.');
        }
        toast.success("Workout plans regenerated successfully!");
      }

      // Re-fetch profile to update local state and form with latest data
      const { data: updatedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (fetchError) throw fetchError;
      setProfile(updatedProfile);
      form.reset(updatedProfile); // Ensure form reflects latest data from DB

    } catch (error: any) {
      console.error("Error updating profile:", error.message);
      toast.error(error.message || "Failed to update profile.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-24" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Your full name" {...field} />
              </FormControl>
              <FormDescription>
                This is the name that will be displayed on your profile.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input placeholder="Your first name" {...field} />
              </FormControl>
              <FormDescription>
                Used for personalized greetings.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="preferred_session_length"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Session Length</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a session length" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="15-30">15-30 minutes</SelectItem>
                  <SelectItem value="30-45">30-45 minutes</SelectItem>
                  <SelectItem value="45-60">45-60 minutes</SelectItem>
                  <SelectItem value="60-90">60-90 minutes</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                This will influence the number of exercises in your generated workouts.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="programme_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Programme Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a programme type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ulul">Upper/Lower Split (4-Day)</SelectItem>
                  <SelectItem value="ppl">Push/Pull/Legs (3-Day)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose your preferred workout split.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="primary_goal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Goal</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Build muscle, Lose fat" {...field} />
              </FormControl>
              <FormDescription>
                What is your main fitness objective?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="preferred_muscles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Muscles/Focus Areas</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Chest, Back, Glutes" {...field} />
              </FormControl>
              <FormDescription>
                Any specific muscle groups you want to prioritize?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="health_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Health Notes/Constraints</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Knee pain, shoulder injury, limited mobility"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Any health conditions or physical limitations we should be aware of?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_onboarded"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Onboarding Complete
                </FormLabel>
                <FormDescription>
                  Indicates if the user has completed the initial onboarding flow.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit">Update profile</Button>
      </form>
    </Form>
  );
}