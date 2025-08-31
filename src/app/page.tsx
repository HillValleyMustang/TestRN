"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';

export default function HomePage() {
  const { session, supabase } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Check if session is null (not logged in) or exists
    if (session === null) {
      router.push('/login');
    } else if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Render a loading state or nothing while redirecting
  return (
    <div className="grid grid-rows-[1fr_20px] items-center justify-items-center min-h-screen p-4 pb-10 sm:p-10">
      <main className="flex flex-col gap-8 row-start-1 items-center sm:items-start">
        <h1 className="text-2xl font-bold">Loading...</h1>
      </main>
      
    </div>
  );
}