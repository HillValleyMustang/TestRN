"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleDemoLogin = async () => {
    try {
      // Generate a unique email and password for the demo user
      const timestamp = Date.now();
      const email = `demo${timestamp}@example.com`;
      const password = 'DemoPass123!';
      const firstName = 'Demo';
      const lastName = `User${timestamp}`;
      
      // Sign up the demo user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });

      if (error) throw error;

      // Create a profile for the demo user
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          toast.error('Failed to create demo user profile: ' + profileError.message);
          return;
        }
        
        toast.success('Demo user created successfully!');
      }
    } catch (error: any) {
      toast.error('Error creating demo user: ' + error.message);
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
              >
                Create Demo Account
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                Click above to create a temporary demo account and start exploring the app immediately.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <MadeWithDyad />
    </div>
  );
}