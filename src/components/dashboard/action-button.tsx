"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface ActionButtonProps {
  icon: React.ReactElement<{ className?: string }>;
  title: string;
  description: string;
  onClick?: () => void;
  className?: string;
}

export const ActionButton = ({ icon, title, description, onClick, className }: ActionButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 border rounded-lg flex items-center text-left hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
    >
      <div className="mr-4 flex-shrink-0 text-primary">
        {React.cloneElement(icon, { className: "h-8 w-8" })}
      </div>
      <div className="flex-grow">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
};