"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Dumbbell } from 'lucide-react';
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
    if (session) {
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
    }
  }, [session, supabase]);

  const handleSelect = (path: string) => {
    router.push(path);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Start a Workout</h1>
        <p className="text-muted-foreground">
          Start an ad-hoc session or choose one of your templates.
        </p>
      </header>
      <div className="space-y-4">
        <Card
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => handleSelect('/workout-session/ad-hoc')}
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

        <h3 className="text-xl font-semibold pt-4">Or, choose a template</h3>

        <div className="space-y-2">
          {loading ? (
            <>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </>
          ) : templates.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              You haven't created any workout templates yet. Go to 'Manage Templates' to create one.
            </p>
          ) : (
            templates.map(template => (
              <Card
                key={template.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleSelect(`/workout-session/${template.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Dumbbell className="h-5 w-5 mr-2" />
                    {template.template_name}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}