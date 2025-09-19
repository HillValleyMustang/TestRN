"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UnconfiguredGymPromptProps {
  gymName: string;
}

export const UnconfiguredGymPrompt = ({ gymName }: UnconfiguredGymPromptProps) => {
  const router = useRouter();

  return (
    <Card className="border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20 mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-5 w-5" />
          Setup Required for "{gymName}"
        </CardTitle>
        <CardDescription className="text-yellow-800 dark:text-yellow-300">
          This gym has not been configured yet. You need to set up its workout plan before you can see or start any workouts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => router.push('/manage-t-paths')}>
          Go to Workout Plan Setup <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};