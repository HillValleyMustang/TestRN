"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Dumbbell } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';

type WorkoutTemplate = Tables<'workout_templates'>;

interface StartWorkoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StartWorkoutModal = ({ open, onOpenChange }: StartWorkoutModalProps) => {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && session) {
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
  }, [open, session, supabase]);

  const handleSelect = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a Workout</DialogTitle>
          <DialogDescription>
            Start an ad-hoc session or choose one of your templates.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
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

          <h3 className="text-lg font-semibold pt-2">Or, choose a template</h3>

          <ScrollArea className="h-64 pr-4">
            <div className="space-y-2">
              {loading ? (
                <>
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </>
              ) : templates.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  You haven't created any workout templates yet.
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
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};