"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Generate a valid email based on the name and timestamp
      const timestamp = Date.now();
      const cleanName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const email = `${cleanName || 'user'}+${timestamp}@example.com`;
      
      if (isSignUp) {
        // Sign up the demo user
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: 'User'
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
              last_name: 'User',
              updated_at: new Date().toISOString()
            });

          if (profileError) {
            toast.error('Failed to create user profile: ' + profileError.message);
            return;
          }
          
          toast.success('User created successfully!');
        }
      } else {
        // Sign in the demo user
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          // If sign in fails, try creating the user
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: firstName,
                last_name: 'User'
              }
            }
          });

          if (signUpError) throw signUpError;

          if (data.user) {
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: data.user.id,
                first_name: firstName,
                last_name: 'User',
                updated_at: new Date().toISOString()
              });

            if (profileError) {
              toast.error('Failed to create user profile: ' + profileError.message);
              return;
            }
            
            toast.success('User created and signed in successfully!');
          }
        } else {
          toast.success('Signed in successfully!');
        }
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
            <CardTitle>Demo Login</CardTitle>
            <CardDescription>Enter your name and password to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDemoLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter any password"
                  required
                  minLength={6}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Button 
                  type="button" 
                  variant="link" 
                  className="p-0 h-auto"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp ? "Already have an account? Sign In" : "Create new account? Sign Up"}
                </Button>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading || !firstName || !password}
              >
                {loading ? "Processing..." : (isSignUp ? "Create & Sign In" : "Sign In")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <MadeWithDyad />
    </div>
  );
}