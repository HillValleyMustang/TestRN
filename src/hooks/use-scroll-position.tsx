"use client";

import { useState, useEffect, useCallback } from 'react';

const SCROLL_THRESHOLD = 10; // Pixels scrolled before activating effect

export function useScrollPosition() {
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Set initial state in case the page loads already scrolled
    handleScroll(); 

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return isScrolled;
}