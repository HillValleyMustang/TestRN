"use client";

import React, { useState, useEffect, useCallback } from 'react'; // Import React and necessary hooks
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { ACHIEVEMENT_DISPLAY_INFO } from '@/lib/achievements';
import { useEmblaCarousel, EmblaCarouselType } from 'embla-carousel-react'; // Corrected import for useEmblaCarousel and its type
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Import navigation icons

interface AchievementGridProps {
  achievements: { id: string; name: string; icon: string }[];
  unlockedAchievements: Set<string>;
  onAchievementClick: (achievement: { id: string; name: string; icon: string }) => void;
}

export const AchievementGrid = ({ achievements, unlockedAchievements, onAchievementClick }: AchievementGridProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps'
  });

  // Effect to re-initialize Embla when the achievements data changes
  useEffect(() => {
    if (!emblaApi) return;

    // Re-initialize Embla when the number of achievements changes.
    // This helps Embla recalculate the carousel's dimensions and slides.
    emblaApi.reInit();

  }, [emblaApi, achievements.length]); // Depend on emblaApi and achievements length

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  return (
    <div className="relative">
      <div className="embla" ref={emblaRef}>
        <div className="embla__container">
          <div className="embla__slide flex items-stretch"> {/* Ensure slides take full height */}
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 w-full"> {/* Added w-full */}
              {achievements.map((a) => {
                const isAchUnlocked = unlockedAchievements.has(a.id);
                const displayInfo = ACHIEVEMENT_DISPLAY_INFO[a.id];
                return (
                  <Button
                    key={a.id}
                    variant="ghost"
                    className={cn(
                      "flex flex-col items-center justify-center min-h-[7rem] w-full p-3 rounded-xl border-2 transition-all duration-200 ease-in-out group",
                      isAchUnlocked
                        ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 hover:scale-105'
                        : 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:scale-105'
                    )}
                    onClick={() => onAchievementClick(a)}
                  >
                    <div className="text-2xl mb-1 transition-transform duration-200 ease-in-out group-hover:scale-110">{displayInfo?.icon || a.icon}</div>
                    <div className={cn(
                      "text-xs font-medium text-center leading-tight whitespace-normal",
                      isAchUnlocked ? "text-yellow-800 dark:text-yellow-300" : "text-gray-500 dark:text-gray-400"
                    )}>
                      {displayInfo?.name || a.name}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {/* Navigation Buttons */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        <Button variant="outline" size="icon" onClick={scrollPrev} disabled={!emblaApi || emblaApi.selectedScrollSnap() === 0} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={scrollNext} disabled={!emblaApi || emblaApi.canScrollNext()} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};