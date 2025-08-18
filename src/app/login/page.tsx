"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      // Use a fixed demo email that should be valid
      const email = 'demo@workouttracker.com';
      const password = 'DemoPassword123';
      
      // Try to sign in first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        // If sign in fails, try to sign up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: 'Demo',
              last_name: 'User'
            }
          }
        });

        if (signUpError) {
          toast.error('Error: ' + signUpError.message);
          return;
        }

        // Create a profile for the demo user if needed
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              first_name: 'Demo',
              last_name: 'User',
              updated_at: new Date().toISOString()
            });

          if (profileError) {
            toast.error('Failed to create demo user profile: ' + profileError.message);
            return;
          }
          
          toast.success('Demo account created and signed in!');
        }
      } else {
        toast.success('Signed in to demo account!');
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">My Workout Tracker</h1>
          <p className="text-muted-foreground">Your personalized AI fitness coach.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Get started with a demo account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <Button 
                onClick={handleDemoLogin} 
                className="w-full"
                disabled={loading}
              >
                {loading ? "Creating Demo Account..." : "Use Demo Account"}
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  This will create or sign in to a demo account with:
                </p>
                <p className="text-xs mt-2">
                  Email: demo@workouttracker.com<br/>
                  Password: DemoPassword123
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <MadeWithDyad />
    </div>
  );
}