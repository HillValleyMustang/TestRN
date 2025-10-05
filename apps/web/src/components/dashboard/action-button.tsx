"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ActionButtonProps {
  title: string;
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const ActionButton = ({ title, icon, onClick, className }: ActionButtonProps) => {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "h-full w-full p-2 flex flex-col items-center justify-center text-center whitespace-normal gap-1",
        "font-semibold text-sm leading-tight",
        "border-0 shadow-sm hover:shadow-md transition-all duration-100 ease-out", // Added transition
        "active:scale-[0.98] active:shadow-sm", // Added active state for press effect
        className
      )}
    >
      {icon}
      <span>{title}</span>
    </Button>
  );
};