"use client";

import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, getLevelFromPoints } from '@/lib/utils';
import { Profile as ProfileType } from '@/types/supabase';
import { Session } from '@supabase/supabase-js';

interface ProfileOverviewHeaderProps {
  profile: ProfileType | null;
  session: Session | null;
}

export const ProfileOverviewHeader = ({ profile, session }: ProfileOverviewHeaderProps) => {
  if (!profile) return null;

  const userInitial = profile.first_name ? profile.first_name[0].toUpperCase() : (session?.user.email ? session.user.email[0].toUpperCase() : '?');
  const fitnessLevel = getLevelFromPoints(profile.total_points || 0);

  return (
    <div className="text-center mb-8">
      <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-primary/20">
        <AvatarFallback className="text-4xl font-bold">{userInitial}</AvatarFallback>
      </Avatar>
      <h1 className="text-3xl font-bold">{profile.first_name} {profile.last_name}</h1>
      <div className="flex items-center justify-center space-x-2 mt-2">
        <span className={cn("px-3 py-1 rounded-full text-xs font-bold !text-white", fitnessLevel.color)}>{fitnessLevel.level}</span>
        <span className="text-muted-foreground text-sm">•</span>
        <span className="text-muted-foreground text-sm">Member since {new Date(profile.created_at!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
  );
};