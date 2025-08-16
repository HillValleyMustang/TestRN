"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WorkoutHeaderProps {
  templateName: string;
}

export const WorkoutHeader = ({ templateName }: WorkoutHeaderProps) => {
  const router = useRouter();
  return (
    <header className="mb-8 flex justify-between items-center">
      <h1 className="text-3xl font-bold">{templateName}</h1>
      <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
    </header>
  );
};