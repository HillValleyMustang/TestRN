"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ActionButtonProps {
  title: string;
  onClick?: () => void;
  className?: string;
}

export const ActionButton = ({ title, onClick, className }: ActionButtonProps) => {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "h-full w-full p-2 flex items-center justify-center text-center whitespace-normal",
        "font-semibold text-sm leading-tight",
        className
      )}
    >
      {title}
    </Button>
  );
};