"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner'; // Keep sonner for non-global, contextual toasts

interface GlobalStatusState {
  isLoading: boolean;
  loadingMessage: string | null;
  isSuccess: boolean;
  successMessage: string | null;
  isError: boolean;
  errorMessage: string | null;
  statusType: 'idle' | 'loading' | 'success' | 'error';
  statusMessage: string | null;
}

interface GlobalStatusContextType extends GlobalStatusState {
  startLoading: (message: string) => void;
  endLoadingSuccess: (message: string) => void;
  endLoadingError: (message: string) => void;
  clearStatus: () => void;
}

const GlobalStatusContext = createContext<GlobalStatusContextType | undefined>(undefined);

const initialState: GlobalStatusState = {
  isLoading: false,
  loadingMessage: null,
  isSuccess: false,
  successMessage: null,
  isError: false,
  errorMessage: null,
  statusType: 'idle',
  statusMessage: null,
};

export const GlobalStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<GlobalStatusState>(initialState);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearStatus = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus(initialState);
  }, []);

  const startLoading = useCallback((message: string) => {
    clearStatus(); // Clear any previous status
    setStatus({
      ...initialState,
      isLoading: true,
      loadingMessage: message,
      statusType: 'loading',
      statusMessage: message,
    });
  }, [clearStatus]);

  const endLoadingSuccess = useCallback((message: string) => {
    clearStatus(); // Clear any previous status
    setStatus({
      ...initialState,
      isSuccess: true,
      successMessage: message,
      statusType: 'success',
      statusMessage: message,
    });
    // Automatically clear success message after a short delay
    timeoutRef.current = setTimeout(clearStatus, 3000);
  }, [clearStatus]);

  const endLoadingError = useCallback((message: string) => {
    clearStatus(); // Clear any previous status
    setStatus({
      ...initialState,
      isError: true,
      errorMessage: message,
      statusType: 'error',
      statusMessage: message,
    });
    // Automatically clear error message after a longer delay
    timeoutRef.current = setTimeout(clearStatus, 5000);
  }, [clearStatus]);

  const contextValue = {
    ...status,
    startLoading,
    endLoadingSuccess,
    endLoadingError,
    clearStatus,
  };

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