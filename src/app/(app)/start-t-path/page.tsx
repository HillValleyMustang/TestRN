"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Dumbbell } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

type TPath = Tables<'t_paths'>;

export default function StartTPathPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [tPaths, setTPaths] = useState<TPath[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      const fetchTPaths = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('t_paths')
            .select('*')
            .eq('user_id', session.user.id)
            .order('template_name', { ascending: true });

          if (error) throw error;
          setTPaths(data || []);
        } catch (err: any) {
          toast.error("Failed to load Transformation Paths: " + err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchTPaths();
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
          Start an ad-hoc session or choose one of your Transformation Paths.
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
              Start a workout without a T-Path. Add exercises as you go.
            </CardDescription>
          </CardHeader>
        </Card>

        <h3 className="text-xl font-semibold pt-4">Or, choose a Transformation Path</h3>

        <div className="space-y-2">
          {loading ? (
            <>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </>
          ) : tPaths.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              You haven't created any Transformation Paths yet. Go to 'Manage T-Paths' to create one.
            </p>
          ) : (
            tPaths.map(tPath => (
              <Card
                key={tPath.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleSelect(`/workout-session/${tPath.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Dumbbell className="h-5 w-5 mr-2" />
                    {tPath.template_name}
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