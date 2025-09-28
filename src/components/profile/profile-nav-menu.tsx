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
    <div className="bg-card border border-border rounded-xl shadow-lg">
      <nav className="flex justify-between items-center p-1 gap-0.5">
        {pages.map((page) => {
          const Icon = page.icon;
          const isActive = activeTab === page.id;
          return (
            <button
              key={page.id}
              onClick={() => handleNavClick(page.id)}
              className={cn(
                "relative flex flex-col items-center justify-center p-1 rounded-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:scale-95 flex-1",
                isActive
                  ? 'bg-muted text-foreground transform -translate-y-1 shadow-lg border-2 border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              style={{ minHeight: '60px' }}
            >
              <div 
                className="absolute top-0 left-0 w-full h-1 bg-foreground rounded-t-lg transition-transform duration-400"
                style={{
                  transform: isActive ? 'translateX(0)' : 'translateX(-100%)'
                }}
              />
              
              <Icon 
                className="w-5 h-5 mb-1 transition-all duration-300"
                strokeWidth={isActive ? 2.5 : 2}
              />
              
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