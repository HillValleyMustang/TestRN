"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useContext, createContext } from 'react';

interface WorkoutNavigationContextType {
  handleNavigationAttempt: (path: string) => boolean; // Returns true if navigation was blocked
}

const WorkoutNavigationContext = createContext<WorkoutNavigationContextType | undefined>(undefined);

export const WorkoutNavigationProvider = ({ children, handleNavigationAttempt }: { children: React.ReactNode; handleNavigationAttempt: (path: string) => boolean; }) => {
  return (
    <WorkoutNavigationContext.Provider value={{ handleNavigationAttempt }}>
      {children}
    </WorkoutNavigationContext.Provider>
  );
};

export const useWorkoutNavigation = () => {
  const context = useContext(WorkoutNavigationContext);
  if (context === undefined) {
    throw new Error('useWorkoutNavigation must be used within a WorkoutNavigationProvider');
  }
  return context;
};

interface WorkoutAwareLinkProps extends React.ComponentProps<typeof Link> {
  children: React.ReactNode;
}

export const WorkoutAwareLink = ({ href, onClick, children, ...props }: WorkoutAwareLinkProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { handleNavigationAttempt } = useWorkoutNavigation();

  const handleClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(event);
    }

    // Only intercept if navigating to a different page and a workout is active
    if (typeof href === 'string' && href !== pathname) {
      const blocked = handleNavigationAttempt(href);
      if (blocked) {
        event.preventDefault(); // Prevent default Next.js navigation
      }
    }
  }, [href, onClick, pathname, handleNavigationAttempt]);

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
};