"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlusCircle, Dumbbell } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

type WorkoutTemplate = Tables<'workout_templates'>;

export default function StartWorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('workout_templates')
          .select('*')
          .eq('user_id', session.user.id)
          .order('template_name', { ascending: true });

        if (error) throw error;
        setTemplates(data || []);
      } catch (err: any) {
        toast.error("Failed to load workout templates: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [session, router, supabase]);

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Start a Workout</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </header>

      <Card 
        className="cursor-pointer hover:bg-accent transition-colors"
        onClick={() => router.push('/workout-session/ad-hoc')}
      >
        <CardHeader>
          <CardTitle className="flex items-center">
            <PlusCircle className="h-5 w-5 mr-2" />
            Start Ad-Hoc Workout
          </CardTitle>
          <CardDescription>
            Start a workout without a template. Add exercises as you go.
          </CardDescription>
        </CardHeader>
      </Card>

      <h2 className="text-2xl font-bold mt-4">Or, choose a template</h2>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : templates.length === 0 ? (
        <p className="text-muted-foreground">
          You haven't created any workout templates yet. You can create them from the main menu.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push(`/workout-session/${template.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Dumbbell className="h-5 w-5 mr-2" />
                  {template.template_name}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <MadeWithDyad />
    </div>
  );
}