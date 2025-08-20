"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn, getWorkoutColorClass } from '@/lib/utils'; // Import cn and getWorkoutColorClass

interface TPathHeaderProps {
  tPathName: string;
}

export const TPathHeader = ({ tPathName }: TPathHeaderProps) => {
  const router = useRouter();
  const workoutColorClass = getWorkoutColorClass(tPathName, 'text'); // Get text color class
  return (
    <header className="mb-8 flex justify-between items-center">
      <h1 className={cn("text-3xl font-bold", workoutColorClass)}>{tPathName}</h1>
      <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
    </header>
  );
};