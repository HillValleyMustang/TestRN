import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, setupQueryClient } from '../_lib/react-query-client';

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  React.useEffect(() => {
    // Setup query client with network monitoring
    const unsubscribe = setupQueryClient();
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default QueryProvider;