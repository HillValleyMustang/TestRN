"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface RestTimerProps {
  initialTime: number; // in seconds
  isRunning: boolean;
  onReset: () => void;
}

export const RestTimer = ({ initialTime, isRunning, onReset }: RestTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTimeLeft(initialTime); // Reset time when initialTime changes (e.g., user updates profile)
  }, [initialTime]);

  useEffect(() => {
    if (isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(initialTime); // Start from initial time when timer starts
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            toast.info("Rest time is over!");
            onReset(); // Notify parent to stop running state
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, initialTime, onReset]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = () => {
    if (isRunning) {
      onReset(); // Stop the timer
    } else {
      // If starting manually, reset to initial time
      setTimeLeft(initialTime);
      onReset(); // Ensure parent knows it's starting
      // The useEffect will pick up isRunning=true and start it
    }
  };

  const handleResetTimer = () => {
    setTimeLeft(initialTime);
    onReset(); // Stop the timer
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleTimer}
        className="w-24 justify-center"
      >
        {isRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
        {formatTime(timeLeft)}
      </Button>
      <Button variant="ghost" size="icon" onClick={handleResetTimer} title="Reset Timer">
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
};