"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase'; // Import Tables type

type Profile = Tables<'profiles'>;
type TPath = Tables<'t_paths'>;

export default function LoginPage() {
  const router = useRouter();
  const { session, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId

  useEffect(() => {
    const checkUserProfile = async () => {
      if (memoizedSessionUserId) { // Use memoized ID
        // Check if user has completed onboarding by looking for a programme_type
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, programme_type') // Select programme_type
          .eq('id', memoizedSessionUserId) // Use memoized ID
          .single();

        if (profile && profile.programme_type) {
          // If profile exists and has a programme type, onboarding is complete.
          router.push('/dashboard');
        } else {
          // Otherwise, send to onboarding.
          router.push('/onboarding');
        }
      }
    };

    checkUserProfile();
  }, [memoizedSessionUserId, router, supabase]); // Added supabase to dependency array

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-2">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center text-foreground">Welcome to My Workout Tracker</h2>
        <p className="text-center text-muted-foreground">Sign in or create an account to get started.</p>
        <Auth
          supabaseClient={supabase}
          providers={[]} // No third-party providers unless specified
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                  inputBackground: 'hsl(var(--input))',
                  inputBorder: 'hsl(var(--border))',
                  inputBorderFocus: 'hsl(var(--ring))',
                  inputText: 'hsl(var(--foreground))',
                  messageText: 'hsl(var(--destructive-foreground))',
                  messageBackground: 'hsl(var(--destructive))',
                },
              },
            }}
          }
          theme="light" // Default to light theme
          redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`} // Ensure this matches your Supabase redirect URL
        />
      </div>
    </div>
  );
}