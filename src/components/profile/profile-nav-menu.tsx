"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { LayoutGrid, BarChart3, Camera, Film, Users, Settings } from 'lucide-react';

interface ProfileNavMenuProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const pages = [
  { id: 'overview', icon: LayoutGrid, label: 'Overview' },
  { id: 'stats', icon: BarChart3, label: 'Stats' },
  { id: 'photo', icon: Camera, label: 'Photo' },
  { id: 'media', icon: Film, label: 'Media' },
  { id: 'social', icon: Users, label: 'Social' },
  { id: 'settings', icon: Settings, label: 'Settings' }
];

export const ProfileNavMenu = ({ activeTab, onTabChange }: ProfileNavMenuProps) => {
  const handleNavClick = (pageId: string) => {
    onTabChange(pageId);
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className="w-full bg-card border border-border rounded-xl shadow-sm mb-6">
      <nav className="flex justify-between items-center p-1 gap-0.5">
        {pages.map((page) => {
          const Icon = page.icon;
          const isActive = activeTab === page.id;
          return (
            <button
              key={page.id}
              onClick={() => handleNavClick(page.id)}
              className={cn(
                "relative flex flex-col items-center justify-center py-1 px-0 rounded-lg transition-all duration-300",
                "hover:-translate-y-0.5 active:scale-95 flex-1 min-h-[50px]",
                isActive
                  ? 'bg-muted text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {/* Top border indicator - black */}
              <div 
                className={cn(
                  "absolute top-0 left-0 w-full h-0.5 bg-foreground rounded-t-xl transition-transform duration-300 ease-out",
                  isActive ? 'scale-x-100' : 'scale-x-0'
                )}
              />
              
              {/* Icon */}
              <Icon 
                className={cn(
                  "h-5 w-5 mb-1 transition-all duration-300",
                  isActive 
                    ? 'opacity-100 scale-110' 
                    : 'opacity-80 scale-100'
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              
              {/* Label */}
              <span 
                className={cn(
                  "text-xs font-semibold leading-tight text-center transition-all duration-300",
                  isActive ? 'font-bold' : 'font-medium'
                )}
              >
                {page.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};