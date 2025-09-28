import React, { useState } from 'react';
import { cn } from '@/lib/utils'; // Assuming cn utility is available

interface MobileNavigationProps {
  onPageChange: (pageId: string) => void;
  initialPage?: string;
  className?: string; // Allow parent to control positioning and additional styles
}

const MobileNavigation = ({ onPageChange, initialPage = 'overview', className }: MobileNavigationProps) => {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const pages = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'stats', icon: '📈', label: 'Stats' }, 
    { id: 'photo', icon: '📸', label: 'Photo' },
    { id: 'media', icon: '🎬', label: 'Media' },
    { id: 'social', icon: '👥', label: 'Social' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  const handleNavClick = (pageId: string) => {
    setCurrentPage(pageId);
    if (onPageChange) onPageChange(pageId);
  };

  return (
    <div 
      className={cn(
        "w-full bg-card border border-border rounded-xl shadow-sm mx-3 my-2", // Container styling
        className // Allow parent to pass positioning and other styles
      )}
    >
      <nav className="flex justify-between items-center px-3 py-2"> {/* Inner nav padding */}
        {pages.map((page) => (
          <button
            key={page.id}
            onClick={() => handleNavClick(page.id)}
            className={cn(
              "relative flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 flex-1",
              "hover:-translate-y-0.5 hover:shadow-md active:scale-95", // Hover/active effects
              currentPage === page.id
                ? 'bg-muted text-foreground transform -translate-y-1 shadow-lg border-2 border-border' // Active state styling
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50' // Inactive state styling
            )}
            style={{ minHeight: '70px' }} // Fixed min-height
          >
            {/* Top black border for active state */}
            {currentPage === page.id && (
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
              className={`text-xs text-center leading-tight transition-all duration-300 ${
                currentPage === page.id 
                  ? 'font-bold text-foreground' 
                  : 'font-semibold text-muted-foreground'
              }`}
            >
              {page.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default MobileNavigation;