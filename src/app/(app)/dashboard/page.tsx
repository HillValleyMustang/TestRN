"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ActionHub } from '@/components/dashboard/action-hub';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [athleteInitials, setAthleteInitials] = useState<string>('');

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchProfileData = async () => {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', session.user.id)
          .single();
        
        const firstName = profileData?.first_name;
        const lastName = profileData?.last_name;
        const userInitials = `${firstName ? firstName[0] : ''}${lastName ? lastName[0] : ''}`.toUpperCase();
        setAthleteInitials(userInitials || session.user?.email?.[0].toUpperCase() || 'X');

      } catch (err: any) {
        console.error("Error fetching profile data:", err);
        toast.error("Failed to load profile data.");
      }
    };

    fetchProfileData();
  }, [session, router, supabase]);

  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Welcome Back, Athlete {athleteInitials}</h1>
        <p className="text-muted-foreground">Ready to Train? Let's get Started!</p>
      </header>

      <ActionHub />

      <section>
        <h2 className="text-2xl font-bold mb-4">Start a Workout</h2>
        {/* Placeholder for workout templates - can be refactored later */}
        <p className="text-muted-foreground">Select a workout template below or start an ad-hoc session.</p>
      </section>

      <MadeWithDyad />
    </div>
  );
}