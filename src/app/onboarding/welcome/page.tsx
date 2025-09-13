"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Dumbbell, Sparkles, BarChart2, CalendarCheck, LayoutTemplate, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button'; // Import Button

const features = [
  {
    icon: <Dumbbell className="h-8 w-8 text-primary" />,
    title: "Personalized Workouts",
    description: "Your Transformation Path is tailored to your goals and preferences.",
  },
  {
    icon: <Sparkles className="h-8 w-8 text-yellow-500" />,
    title: "AI Coach Feedback",
    description: "Get smart insights and suggestions based on your performance.",
  },
  {
    icon: <BarChart2 className="h-8 w-8 text-blue-500" />,
    title: "Track Your Progress",
    description: "Visualize your gains with detailed charts and personal records.",
  },
  {
    icon: <CalendarCheck className="h-8 w-8 text-green-500" />,
    title: "Build Consistency",
    description: "Stay motivated with streaks and achievement tracking.",
  },
  {
    icon: <LayoutTemplate className="h-8 w-8 text-purple-500" />,
    title: "Manage Exercises & Gyms",
    description: "Customize your exercise library and virtual gym equipment.",
  },
];

export default function OnboardingWelcomePage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [generationComplete, setGenerationComplete] = useState(false); // New state for generation completion

  useEffect(() => {
    // Simulate background generation progress
    const totalDuration = 3000; // 3 seconds for simulation
    const intervalTime = 100;
    let currentProgress = 0;

    const progressInterval = setInterval(() => {
      currentProgress += (intervalTime / totalDuration) * 100;
      setProgress(Math.min(currentProgress, 100));

      if (currentProgress >= 100) {
        clearInterval(progressInterval);
        setGenerationComplete(true); // Mark generation as complete
      }
    }, intervalTime);

    return () => clearInterval(progressInterval);
  }, []);

  const handleContinueToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center text-center">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-4 animate-bounce-in" />
          <h1 className="text-4xl font-bold text-foreground mb-2 animate-fade-in-slide-up" style={{ animationDelay: '0.2s' }}>
            You're All Set!
          </h1>
          <p className="text-lg text-muted-foreground animate-fade-in-slide-up" style={{ animationDelay: '0.4s' }}>
            Your personalized fitness journey is ready to begin.
          </p>
        </div>

        <Card className="animate-fade-in-slide-up" style={{ animationDelay: '0.6s' }}>
          <CardHeader>
            <CardTitle className="text-2xl">What's Next?</CardTitle>
            <CardDescription>Discover the powerful features waiting for you.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 text-left">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0 mt-1">{feature.icon}</div>
                <div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-col items-center space-y-3 animate-fade-in-slide-up" style={{ animationDelay: '0.8s' }}>
          {!generationComplete ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">
                Generating your first workouts... {Math.round(progress)}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-100 ease-linear" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className="text-muted-foreground">Your workouts are ready!</p>
              <Button onClick={handleContinueToDashboard} className="w-full">
                Continue to Dashboard
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}