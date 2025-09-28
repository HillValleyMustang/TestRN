"use client";

import React, { useState } from 'react';
import { Grid3X3, BarChart3, Camera, Video, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn utility is available

interface MobileNavigationProps {
  activeTab: string; // Changed to activeTab
  onTabChange: (value: string) => void; // Changed to onTabChange
}

export const MobileNavigation = ({ activeTab, onTabChange }: MobileNavigationProps) => {
  // Removed internal currentPage state, now controlled by activeTab prop
  const [startX, setStartX] = useState(0);
  const [isSwipe, setIsSwipe] = useState(false);

  const pages = [
    { id: 'overview', icon: Grid3X3, label: 'Overview' },
    { id: 'stats', icon: BarChart3, label: 'Stats' },
    { id: 'photo', icon: Camera, label: 'Photo' },
    { id: 'media', icon: Video, label: 'Media' },
    { id: 'social', icon: Users, label: 'Social' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  const handleNavClick = (pageId: string) => {
    // Call the onTabChange prop to update the parent's state
    if (onTabChange) {
      onTabChange(pageId);
    }
    
    // Haptic feedback if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwipe(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startX) return;
    
    const deltaX = Math.abs(e.touches[0].clientX - startX);
    if (deltaX > 30) {
      setIsSwipe(true);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!startX || !isSwipe) return;
    
    const endX = e.changedTouches[0].clientX;
    const deltaX = startX - endX;
    const threshold = 80;
    
    if (Math.abs(deltaX) > threshold) {
      const currentIndex = pages.findIndex(p => p.id === activeTab); // Use activeTab for current index
      
      if (deltaX > 0 && currentIndex < pages.length - 1) {
        // Swipe left - next page
        handleNavClick(pages[currentIndex + 1].id);
      } else if (deltaX < 0 && currentIndex > 0) {
        // Swipe right - previous page
        handleNavClick(pages[currentIndex - 1].id);
      }
    }
    
    setStartX(0);
    setIsSwipe(false);
  };

  return (
    <div 
      className="w-full bg-card border border-border rounded-xl shadow-sm mx-2 my-2"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <nav className="flex justify-between items-center p-1 gap-0.5">
        {pages.map((page) => {
          const IconComponent = page.icon;
          return (
            <button
              key={page.id}
              onClick={() => handleNavClick(page.id)}
              className={cn(
                `relative flex flex-col items-center justify-center p-1 rounded-lg 
                transition-all duration-300 hover:-translate-y-0.5 active:scale-95 flex-1`,
                activeTab === page.id // Use activeTab here
                  ? 'bg-muted text-foreground transform -translate-y-1 shadow-lg border-2 border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              style={{ minHeight: '60px' }}
            >
              {/* Top border indicator - black */}
              <div 
                className="absolute top-0 left-0 w-full h-1 bg-foreground rounded-t-lg transition-transform duration-400"
                style={{
                  transform: activeTab === page.id ? 'translateX(0)' : 'translateX(-100%)' // Use activeTab here
                }}
              />
              
              {/* Icon */}
              <IconComponent 
                className={cn(
                  `w-5 h-5 mb-1 transition-all duration-300`,
                  activeTab === page.id // Use activeTab here
                    ? 'opacity-100 scale-110' 
                    : 'opacity-80 scale-100'
                )}
              />
              
              {/* Label */}
              <span 
                className={cn(
                  `text-xs font-semibold leading-tight text-center transition-all duration-300`,
                  activeTab === page.id ? 'font-bold' : 'font-medium' // Use activeTab here
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