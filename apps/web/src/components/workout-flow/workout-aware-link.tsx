"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback } from 'react';
import { useWorkoutFlow } from './workout-flow-context-provider';

interface WorkoutAwareLinkProps extends React.ComponentProps<typeof Link> {
  children: React.ReactNode;
}

export const WorkoutAwareLink = ({ href, onClick, children, ...props }: WorkoutAwareLinkProps) => {
  const router = useRouter();
  const { promptBeforeNavigation } = useWorkoutFlow();

  const handleClick = useCallback(async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault(); 

    if (onClick) {
      onClick(event);
    }

    if (typeof href === 'string') {
      const shouldBlock = await promptBeforeNavigation(href);
      if (!shouldBlock) {
        router.push(href);
      }
    }
  }, [href, onClick, promptBeforeNavigation, router]);

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
};