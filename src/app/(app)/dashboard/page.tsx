"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ActionHub } from '@/components/dashboard/action-hub';
import { WeeklyVolumeChart } from '@/components/dashboard/weekly-volume-chart';
import { Tables } from '@/types/supabase'; // Import Tables

export default function DashboardPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [welcomeName, setWelcomeName] = useState<string>('');

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchProfileData = async () => {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', session.user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;

        const firstName = profileData?.first_name;
        if (firstName) {
          setWelcomeName(firstName);
        } else {
          const userInitials = `${profileData?.first_name ? profileData.first_name[0] : ''}${profileData?.last_name ? profileData.last_name[0] : ''}`.toUpperCase();
          setWelcomeName(`Athlete ${userInitials || session.user?.email?.[0].toUpperCase() || ''}`);
        }

      } catch (err: any) {
        console.error("Error fetching profile data:", err);
        setWelcomeName("Athlete"); // Fallback
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
        <h1 className="text-3xl font-bold">Welcome Back, {welcomeName}</h1>
        <p className="text-muted-foreground">Ready to Train? Let's get Started!</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ActionHub />
        </div>
        <div className="lg:col-span-2">
          <WeeklyVolumeChart />
        </div>
      </div>

      <MadeWithDyad />
    </div>
  );
}