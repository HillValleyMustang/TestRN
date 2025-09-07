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
    // Always prevent default navigation if we're taking control
    event.preventDefault(); 

    if (onClick) {
      onClick(event);
    }

    // Only intercept if navigating to a different page or if it's the workout page itself
    if (typeof href === 'string') {
      const shouldBlock = await promptBeforeNavigation(href); // Await the promise
      if (!shouldBlock) { // If navigation is NOT blocked, proceed
        router.push(href); // Manually navigate
      }
      // If shouldBlock is true, do nothing (stay on current page)
    }
  }, [href, onClick, promptBeforeNavigation, router]);

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
};