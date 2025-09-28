"use client";

import React, { useState } from 'react';
import { LayoutGrid, BarChart3, Camera, Film, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn utility is available

interface MobileNavigationProps {
  onPageChange: (pageId: string) => void;
  initialPage?: string;
  className?: string; // Allow parent to control positioning and additional styles
}

const pages = [
  { id: 'overview', icon: LayoutGrid, label: 'Overview' },
  { id: 'stats', icon: BarChart3, label: 'Stats' },
  { id: 'photo', icon: Camera, label: 'Photo' },
  { id: 'media', icon: Film, label: 'Media' },
  { id: 'social', icon: Users, label: 'Social' },
  { id: 'settings', icon: Settings, label: 'Settings' }
];

export const MobileNavigation = ({ onPageChange, initialPage = 'overview', className }: MobileNavigationProps) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [startX, setStartX] = useState(0);
  const [isSwipe, setIsSwipe] = useState(false);

  const handleNavClick = (pageId: string) => {
    setCurrentPage(pageId);
    if (onPageChange) {
      onPageChange(pageId);
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
    if (deltaX > 30) { // Threshold to consider it a swipe
      setIsSwipe(true);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!startX || !isSwipe) return; // Only process if it was a recognized swipe
    
    const endX = e.changedTouches[0].clientX;
    const deltaX = startX - endX;
    const threshold = 80; // Distance threshold for a successful swipe
    
    if (Math.abs(deltaX) > threshold) {
      const currentIndex = pages.findIndex(p => p.id === currentPage);
      
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
      className={cn(
        "w-full bg-card border border-border rounded-xl shadow-sm font-sans", // Use app theme colors and font
        className // Allow parent to pass positioning and other styles
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <nav className="flex justify-between items-center p-1 gap-0.5"> {/* Minimal padding, tight spacing */}
        {pages.map((page) => {
          const IconComponent = page.icon;
          const isActive = currentPage === page.id;
          return (
            <button
              key={page.id}
              onClick={() => handleNavClick(page.id)}
              className={cn(
                "relative flex flex-col items-center justify-center py-1 px-0 rounded-lg", // Minimal padding, app radius
                "transition-all duration-300 hover:-translate-y-0.5 active:scale-95 flex-1 min-h-[50px]", // Max width, min height
                isActive
                  ? 'bg-muted text-foreground font-semibold' // Active state background and text
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50' // Inactive state
              )}
            >
              {/* Top border indicator - black accent */}
              <div 
                className={cn(
                  "absolute top-0 left-0 w-full h-0.5 bg-foreground rounded-t-xl transition-transform duration-300 ease-out",
                  isActive ? 'scale-x-100' : 'scale-x-0'
                )}
              />
              
              {/* Icon */}
              <IconComponent 
                className={cn(
                  "h-5 w-5 mb-1 transition-all duration-300", // Icon size
                  isActive 
                    ? 'opacity-100 scale-110' 
                    : 'opacity-80 scale-100'
                )}
                strokeWidth={isActive ? 2.5 : 2} // Dynamic stroke width for active icon
              />
              
              {/* Label */}
              <span 
                className={cn(
                  "text-xs font-semibold leading-tight text-center transition-all duration-300", // Optimal font size
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