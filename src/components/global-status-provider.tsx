"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface GlobalStatusState {
  statusType: 'idle' | 'loading' | 'success' | 'error' | 'offline';
  message: string | null;
  isTemporary: boolean; // If true, status will revert after a short delay
}

interface GlobalStatusContextType {
  globalStatus: GlobalStatusState;
  startLoading: (message: string) => void;
  endLoadingSuccess: (message: string, temporary?: boolean) => void;
  endLoadingError: (message: string, temporary?: boolean) => void;
  clearTemporaryStatus: () => void;
  setOfflineStatus: (isOffline: boolean) => void;
  isGeneratingPlan: boolean; // Moved here from GlobalStatusState
  setIsGeneratingPlanStatus: (isGenerating: boolean) => void;
}

const GlobalStatusContext = createContext<GlobalStatusContextType | undefined>(undefined);

const DEFAULT_STATUS: GlobalStatusState = {
  statusType: 'idle',
  message: null,
  isTemporary: false,
};

const TEMPORARY_STATUS_DURATION = 3000; // 3 seconds

export const GlobalStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const [globalStatus, setGlobalStatus] = useState<GlobalStatusState>(DEFAULT_STATUS);
  const tempStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousNonTemporaryStatusRef = useRef<GlobalStatusState>(DEFAULT_STATUS); // To store status before a temporary one

  // State for specific, high-priority statuses
  const [isOffline, _setIsOffline] = useState(false);
  const [isGeneratingPlan, _setIsGeneratingPlan] = useState(false); // Now managed directly in provider

  const setOfflineStatus = useCallback((offline: boolean) => {
    _setIsOffline(offline);
  }, []);

  const setIsGeneratingPlanStatus = useCallback((generating: boolean) => {
    _setIsGeneratingPlan(generating);
  }, []);

  const startLoading = useCallback((message: string) => {
    if (tempStatusTimeoutRef.current) {
      clearTimeout(tempStatusTimeoutRef.current);
      tempStatusTimeoutRef.current = null;
    }
    setGlobalStatus({ statusType: 'loading', message, isTemporary: false });
    previousNonTemporaryStatusRef.current = { statusType: 'loading', message, isTemporary: false };
  }, []);

  const endLoadingSuccess = useCallback((message: string, temporary: boolean = true) => {
    if (tempStatusTimeoutRef.current) {
      clearTimeout(tempStatusTimeoutRef.current);
    }
    setGlobalStatus({ statusType: 'success', message, isTemporary: temporary });
    if (temporary) {
      tempStatusTimeoutRef.current = setTimeout(() => {
        setGlobalStatus(previousNonTemporaryStatusRef.current); // Revert to previous non-temporary status
        tempStatusTimeoutRef.current = null;
      }, TEMPORARY_STATUS_DURATION);
    } else {
      previousNonTemporaryStatusRef.current = { statusType: 'success', message, isTemporary: false };
    }
  }, []);

  const endLoadingError = useCallback((message: string, temporary: boolean = true) => {
    if (tempStatusTimeoutRef.current) {
      clearTimeout(tempStatusTimeoutRef.current);
    }
    setGlobalStatus({ statusType: 'error', message, isTemporary: temporary });
    if (temporary) {
      tempStatusTimeoutRef.current = setTimeout(() => {
        setGlobalStatus(previousNonTemporaryStatusRef.current); // Revert to previous non-temporary status
        tempStatusTimeoutRef.current = null;
      }, TEMPORARY_STATUS_DURATION);
    } else {
      previousNonTemporaryStatusRef.current = { statusType: 'error', message, isTemporary: false };
    }
  }, []);

  const clearTemporaryStatus = useCallback(() => {
    if (tempStatusTimeoutRef.current) {
      clearTimeout(tempStatusTimeoutRef.current);
      tempStatusTimeoutRef.current = null;
    }
    setGlobalStatus(previousNonTemporaryStatusRef.current); // Revert to previous non-temporary status
  }, []);

  // Effect to manage previousNonTemporaryStatusRef when globalStatus changes to non-temporary
  useEffect(() => {
    if (!globalStatus.isTemporary && globalStatus.statusType !== 'offline' && !isGeneratingPlan) {
      previousNonTemporaryStatusRef.current = globalStatus;
    }
  }, [globalStatus, isGeneratingPlan]);

  const contextValue = React.useMemo(() => ({
    globalStatus,
    startLoading,
    endLoadingSuccess,
    endLoadingError,
    clearTemporaryStatus,
    setOfflineStatus,
    isGeneratingPlan, // Expose directly
    setIsGeneratingPlanStatus,
  }), [globalStatus, startLoading, endLoadingSuccess, endLoadingError, clearTemporaryStatus, setOfflineStatus, isGeneratingPlan, setIsGeneratingPlanStatus]);

  return (
    <GlobalStatusContext.Provider value={contextValue}>
      {children}
    </GlobalStatusContext.Provider>
  );
};

export const useGlobalStatus = () => {
  const context = useContext(GlobalStatusContext);
  if (context === undefined) {
    throw new Error('useGlobalStatus must be used within a GlobalStatusProvider');
  }
  return context;
};