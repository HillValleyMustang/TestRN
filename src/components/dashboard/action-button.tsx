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
        className
      )}
    >
      {icon}
      <span>{title}</span>
    </Button>
  );
};