"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSession } from '@/components/session-context-provider';

export default function LoginPage() {
  const router = useRouter();
  const { session } = useSession();

  useEffect(() => {
    const checkUserProfile = async () => {
      if (session) {
        // Check if user has completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          // User has profile, check if they have T-Paths
          const { data: tPaths } = await supabase
            .from('t_paths')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1);

          if (tPaths && tPaths.length > 0) {
            router.push('/dashboard');
          } else {
            router.push('/onboarding');
          }
        } else {
          router.push('/onboarding');
        }
      }
    };

    checkUserProfile();
  }, [session, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
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
            },
          }}
          theme="light" // Default to light theme
          redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`} // Ensure this matches your Supabase redirect URL
        />
      </div>
      <MadeWithDyad />
    </div>
  );
}