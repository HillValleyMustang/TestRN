"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils'; // Assuming cn utility is available

interface MobileNavigationProps {
  onPageChange: (pageId: string) => void;
  initialPage?: string;
  className?: string; // Allow parent to control positioning and additional styles
}

const pages = [
  { 
    id: 'overview', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      </svg>
    ), 
    label: 'Overview' 
  },
  { 
    id: 'stats', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <line x1="12" y1="20" x2="12" y2="10"/>
        <line x1="18" y1="20" x2="18" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="16"/>
      </svg>
    ), 
    label: 'Stats' 
  },
  { 
    id: 'photo', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    ), 
    label: 'Photo' 
  },
  { 
    id: 'media', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <polygon points="23,7 16,12 23,17"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
    ), 
    label: 'Media' 
  },
  { 
    id: 'social', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ), 
    label: 'Social' 
  },
  { 
    id: 'settings', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 -1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ), 
    label: 'Settings' 
  }
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
          const isActive = currentPage === page.id;
          return (
            <button
              key={page.id}
              onClick={() => handleNavClick(page.id)}
              className={cn(
                "relative flex flex-col items-center justify-center py-1 px-0 rounded-lg", // Minimal padding, app radius
                "transition-all duration-300 hover:-translate-y-0.5 active:scale-95 flex-1 min-h-[60px]", // Max width, min height
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
              <div 
                className={cn(
                  "mb-1 transition-all duration-300", // Wrapper div for icon
                  isActive 
                    ? 'opacity-100 scale-110' 
                    : 'opacity-80 scale-100'
                )}
              >
                {page.icon}
              </div>
              
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