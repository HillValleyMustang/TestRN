"use client";

import React, { useState } from 'react';
// Removed lucide-react imports as emoji icons are used directly
import { cn } from '@/lib/utils'; // Keep web-specific utils;

interface MobileNavigationProps {
  currentPage?: string; // Changed to currentPage
  onPageChange: (pageId: string) => void;
}

export const MobileNavigation = ({ currentPage = 'overview', onPageChange }: MobileNavigationProps) => {
  const [startX, setStartX] = useState(0);
  const [isSwipe, setIsSwipe] = useState(false);

  const pages = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'stats', icon: '📈', label: 'Stats' },
    { id: 'photo', icon: '📸', label: 'Photo' },
    { id: 'media', icon: '🎬', label: 'Media' },
    { id: 'social', icon: '👥', label: 'Social' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  const handleNavClick = (pageId: string) => {
    if (onPageChange) {
      onPageChange(pageId);
    }
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(12);
    }
  };

  // Swipe handlers
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
      const currentIndex = pages.findIndex(p => p.id === currentPage);
      
      if (deltaX > 0 && currentIndex < pages.length - 1) {
        handleNavClick(pages[currentIndex + 1].id);
      } else if (deltaX < 0 && currentIndex > 0) {
        handleNavClick(pages[currentIndex - 1].id);
      }
    }
    
    setStartX(0);
    setIsSwipe(false);
  };

  return (
    <div 
      className="bg-card border border-border rounded-xl p-1 my-2 shadow-sm"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex justify-between items-center gap-0.5">
        {pages.map((page) => (
          <button
            key={page.id}
            onClick={() => handleNavClick(page.id)}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg transition-all duration-300 flex-auto overflow-hidden", // Re-added overflow-hidden
              currentPage === page.id 
                ? 'bg-muted border-2 border-border transform -translate-y-1 shadow-md' 
                : 'hover:bg-muted/50 hover:-translate-y-0.5 hover:shadow-sm'
            )}
            style={{ 
              minHeight: '60px', 
              padding: '4px 0px'
            }}
          >
            {/* Black top border */}
            <div 
              className={cn(
                "absolute top-0 left-0 w-full bg-foreground rounded-t-lg transition-transform duration-400"
              )}
              style={{ 
                height: '3px',
                transform: currentPage === page.id ? 'translateX(0)' : 'translateX(-100%)'
              }}
            />
            
            {/* Icon */}
            <div 
              className="mb-1 transition-all duration-300"
              style={{
                fontSize: '18px',
                opacity: currentPage === page.id ? 1 : 0.8,
                transform: currentPage === page.id ? 'scale(1.1)' : 'scale(1)'
              }}
            >
              {page.icon}
            </div>
            
            {/* Label */}
            <span 
              className={cn(
                "text-center transition-all duration-300 text-wrap",
                currentPage === page.id 
                  ? 'text-foreground font-bold' 
                  : 'text-muted-foreground font-semibold'
              )}
              style={{ 
                fontSize: '11px',
                lineHeight: '1.1'
              }}
            >
              {page.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};