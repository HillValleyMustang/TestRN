"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils'; // Assuming cn utility is available

interface MobileNavigationProps {
  onPageChange: (pageId: string) => void;
  initialPage?: string;
  className?: string; // Allow parent to control positioning and additional styles
}

const pages = [
  { id: 'overview', icon: '📊', label: 'Overview' },
  { id: 'stats', icon: '📈', label: 'Stats' }, 
  { id: 'photo', icon: '📸', label: 'Photo' },
  { id: 'media', icon: '🎬', label: 'Media' },
  { id: 'social', icon: '👥', label: 'Social' },
  { id: 'settings', icon: '⚙️', label: 'Settings' }
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
        "w-full bg-card border border-border rounded-xl shadow-sm mx-3 my-2", // Container styling
        className // Allow parent to pass positioning and other styles
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <nav className="flex justify-between items-center px-3 py-2"> {/* Inner nav padding */}
        {pages.map((page) => {
          const isActive = currentPage === page.id;
          return (
            <button
              key={page.id}
              onClick={() => handleNavClick(page.id)}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 flex-1",
                "hover:-translate-y-0.5 hover:shadow-md active:scale-95", // Hover/active effects
                isActive
                  ? 'bg-muted text-foreground transform -translate-y-1 shadow-lg border-2 border-border' // Active state styling
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50' // Inactive state styling
              )}
              style={{ minHeight: '70px' }} // Fixed min-height
            >
              {/* Top black border for active state */}
              {isActive && (
                <div 
                  className="absolute top-0 left-0 right-0 h-1 bg-foreground rounded-t-lg"
                />
              )}
              
              {/* Icon */}
              <div className="text-xl mb-1 opacity-80">
                {page.icon}
              </div>
              
              {/* Label */}
              <span 
                className={cn(
                  "text-xs text-center leading-tight transition-all duration-300",
                  isActive 
                    ? 'font-bold text-foreground' 
                    : 'font-semibold text-muted-foreground'
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