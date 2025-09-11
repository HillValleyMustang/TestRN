"use client";

import { useState, useEffect } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityChart } from "@/components/progress/activity-chart";
import { PersonalRecordsCard } from "@/components/progress/personal-records-card";
import { MonthlyMomentumBars } from "@/components/profile/monthly-momentum-bars"; // Import the momentum chart
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

type Profile = Tables<'profiles'>;

export default function ProgressPage() {
  const { session, supabase } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        setProfile(data as Profile);
      } catch (err: any) {
        toast.error("Failed to load profile data for progress page: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [session, supabase]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-2 sm:p-4">
        <header className="mb-4 text-center">
          <Skeleton className="h-10 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto mt-2" />
        </header>
        <Skeleton className="h-80 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-2 sm:p-4">
      <header className="mb-4 text-center">
        <h1 className="text-3xl font-bold">Your Progress</h1>
        <p className="text-muted-foreground">
          Charts, records, and summaries to track your fitness journey.
        </p>
      </header>
      
      <MonthlyMomentumBars profile={profile} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PersonalRecordsCard />
        <ActivityChart />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>More Progress Metrics Coming Soon!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            We're working on adding more detailed charts and personal records to help you visualize your achievements.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}