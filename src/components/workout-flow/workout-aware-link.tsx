"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useContext, createContext } from 'react';

interface WorkoutNavigationContextType {
  // promptBeforeNavigation now returns a Promise<boolean>
  promptBeforeNavigation: (path: string) => Promise<boolean>; 
}

const WorkoutNavigationContext = createContext<WorkoutNavigationContextType | undefined>(undefined);

export const WorkoutNavigationProvider = ({ children, promptBeforeNavigation }: { children: React.ReactNode; promptBeforeNavigation: (path: string) => Promise<boolean>; }) => {
  return (
    <WorkoutNavigationContext.Provider value={{ promptBeforeNavigation }}>
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
  const { promptBeforeNavigation } = useWorkoutNavigation(); // Use the new prompt function

  const handleClick = useCallback(async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(event);
    }

    // Only intercept if navigating to a different page
    if (typeof href === 'string' && href !== pathname) {
      const shouldBlock = await promptBeforeNavigation(href); // Await the promise
      if (shouldBlock) {
        event.preventDefault(); // Prevent default Next.js navigation if blocked
      }
    }
  }, [href, onClick, pathname, promptBeforeNavigation]);

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
};