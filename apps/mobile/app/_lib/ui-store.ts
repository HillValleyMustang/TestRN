import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types for UI state
export interface UIState {
  // Modal states
  isWorkoutSummaryModalOpen: boolean;
  isActivityLoggingModalOpen: boolean;
  isConsistencyCalendarModalOpen: boolean;
  isNextWorkoutInfoModalOpen: boolean;
  isDeleteConfirmationModalOpen: boolean;
  
  // Loading states
  isDeletingWorkout: boolean;
  isSavingWorkout: boolean;
  isLoadingDashboard: boolean;
  isRefreshingData: boolean;
  
  // Dashboard states
  activeTab: 'overview' | 'workouts' | 'progress';
  showWelcomeHeader: boolean;
  
  // Error states
  errorMessage: string | null;
  hasNetworkError: boolean;
  
  // Actions
  openWorkoutSummaryModal: () => void;
  closeWorkoutSummaryModal: () => void;
  
  openActivityLoggingModal: () => void;
  closeActivityLoggingModal: () => void;
  
  openConsistencyCalendarModal: () => void;
  closeConsistencyCalendarModal: () => void;
  
  openNextWorkoutInfoModal: () => void;
  closeNextWorkoutInfoModal: () => void;
  
  openDeleteConfirmationModal: () => void;
  closeDeleteConfirmationModal: () => void;
  
  setDeletingWorkout: (isDeleting: boolean) => void;
  setSavingWorkout: (isSaving: boolean) => void;
  setLoadingDashboard: (isLoading: boolean) => void;
  setRefreshingData: (isRefreshing: boolean) => void;
  
  setActiveTab: (tab: 'overview' | 'workouts' | 'progress') => void;
  setShowWelcomeHeader: (show: boolean) => void;
  
  setErrorMessage: (message: string | null) => void;
  setHasNetworkError: (hasError: boolean) => void;
  
  // Reset all UI state
  resetUIState: () => void;
  
  // Batch update multiple states
  updateMultipleStates: (updates: Partial<UIState>) => void;
}

// Initial state
const initialState = {
  isWorkoutSummaryModalOpen: false,
  isActivityLoggingModalOpen: false,
  isConsistencyCalendarModalOpen: false,
  isNextWorkoutInfoModalOpen: false,
  isDeleteConfirmationModalOpen: false,
  
  isDeletingWorkout: false,
  isSavingWorkout: false,
  isLoadingDashboard: false,
  isRefreshingData: false,
  
  activeTab: 'overview' as const,
  showWelcomeHeader: true,
  
  errorMessage: null,
  hasNetworkError: false,
};

// Create the store
export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Modal actions
        openWorkoutSummaryModal: () => set({ isWorkoutSummaryModalOpen: true }),
        closeWorkoutSummaryModal: () => set({ isWorkoutSummaryModalOpen: false }),
        
        openActivityLoggingModal: () => set({ isActivityLoggingModalOpen: true }),
        closeActivityLoggingModal: () => set({ isActivityLoggingModalOpen: false }),
        
        openConsistencyCalendarModal: () => set({ isConsistencyCalendarModalOpen: true }),
        closeConsistencyCalendarModal: () => set({ isConsistencyCalendarModalOpen: false }),
        
        openNextWorkoutInfoModal: () => set({ isNextWorkoutInfoModalOpen: true }),
        closeNextWorkoutInfoModal: () => set({ isNextWorkoutInfoModalOpen: false }),
        
        openDeleteConfirmationModal: () => set({ isDeleteConfirmationModalOpen: true }),
        closeDeleteConfirmationModal: () => set({ isDeleteConfirmationModalOpen: false }),
        
        // Loading state actions
        setDeletingWorkout: (isDeleting: boolean) => set({ isDeletingWorkout: isDeleting }),
        setSavingWorkout: (isSaving: boolean) => set({ isSavingWorkout: isSaving }),
        setLoadingDashboard: (isLoading: boolean) => set({ isLoadingDashboard: isLoading }),
        setRefreshingData: (isRefreshing: boolean) => set({ isRefreshingData: isRefreshing }),
        
        // Dashboard state actions
        setActiveTab: (tab: 'overview' | 'workouts' | 'progress') => set({ activeTab: tab }),
        setShowWelcomeHeader: (show: boolean) => set({ showWelcomeHeader: show }),
        
        // Error state actions
        setErrorMessage: (message: string | null) => set({ errorMessage: message }),
        setHasNetworkError: (hasError: boolean) => set({ hasNetworkError: hasError }),
        
        // Reset action
        resetUIState: () => set(initialState),
        
        // Batch update action
        updateMultipleStates: (updates: Partial<UIState>) => set(updates),
      }),
      {
        name: 'ui-store', // persist to AsyncStorage
        partialize: (state) => ({
          // Only persist these states
          activeTab: state.activeTab,
          showWelcomeHeader: state.showWelcomeHeader,
        }),
      }
    ),
    {
      name: 'ui-store', // devtools name
    }
  )
);

// Selectors for commonly used states
export const useModalStates = () => useUIStore((state) => ({
  isWorkoutSummaryModalOpen: state.isWorkoutSummaryModalOpen,
  isActivityLoggingModalOpen: state.isActivityLoggingModalOpen,
  isConsistencyCalendarModalOpen: state.isConsistencyCalendarModalOpen,
  isNextWorkoutInfoModalOpen: state.isNextWorkoutInfoModalOpen,
  isDeleteConfirmationModalOpen: state.isDeleteConfirmationModalOpen,
}));

export const useLoadingStates = () => useUIStore((state) => ({
  isDeletingWorkout: state.isDeletingWorkout,
  isSavingWorkout: state.isSavingWorkout,
  isLoadingDashboard: state.isLoadingDashboard,
  isRefreshingData: state.isRefreshingData,
}));

export const useDashboardState = () => useUIStore((state) => ({
  activeTab: state.activeTab,
  showWelcomeHeader: state.showWelcomeHeader,
}));

export const useErrorState = () => useUIStore((state) => ({
  errorMessage: state.errorMessage,
  hasNetworkError: state.hasNetworkError,
}));

// Helper hooks for common modal operations
export const useWorkoutSummaryModal = () => {
  const isOpen = useUIStore(state => state.isWorkoutSummaryModalOpen);
  const open = useUIStore(state => state.openWorkoutSummaryModal);
  const close = useUIStore(state => state.closeWorkoutSummaryModal);
  return { isOpen, open, close };
};

export const useActivityLoggingModal = () => {
  const isOpen = useUIStore(state => state.isActivityLoggingModalOpen);
  const open = useUIStore(state => state.openActivityLoggingModal);
  const close = useUIStore(state => state.closeActivityLoggingModal);
  return { isOpen, open, close };
};

export const useConsistencyCalendarModal = () => {
  const isOpen = useUIStore(state => state.isConsistencyCalendarModalOpen);
  const open = useUIStore(state => state.openConsistencyCalendarModal);
  const close = useUIStore(state => state.closeConsistencyCalendarModal);
  return { isOpen, open, close };
};

export const useNextWorkoutInfoModal = () => {
  const isOpen = useUIStore(state => state.isNextWorkoutInfoModalOpen);
  const open = useUIStore(state => state.openNextWorkoutInfoModal);
  const close = useUIStore(state => state.closeNextWorkoutInfoModal);
  return { isOpen, open, close };
};

export const useDeleteConfirmationModal = () => {
  const isOpen = useUIStore(state => state.isDeleteConfirmationModalOpen);
  const open = useUIStore(state => state.openDeleteConfirmationModal);
  const close = useUIStore(state => state.closeDeleteConfirmationModal);
  return { isOpen, open, close };
};

// Helper for batch modal operations
export const useModalActions = () => {
  const openWorkoutSummaryModal = useUIStore(state => state.openWorkoutSummaryModal);
  const closeWorkoutSummaryModal = useUIStore(state => state.closeWorkoutSummaryModal);
  const openActivityLoggingModal = useUIStore(state => state.openActivityLoggingModal);
  const closeActivityLoggingModal = useUIStore(state => state.closeActivityLoggingModal);
  const openConsistencyCalendarModal = useUIStore(state => state.openConsistencyCalendarModal);
  const closeConsistencyCalendarModal = useUIStore(state => state.closeConsistencyCalendarModal);
  const openNextWorkoutInfoModal = useUIStore(state => state.openNextWorkoutInfoModal);
  const closeNextWorkoutInfoModal = useUIStore(state => state.closeNextWorkoutInfoModal);
  const openDeleteConfirmationModal = useUIStore(state => state.openDeleteConfirmationModal);
  const closeDeleteConfirmationModal = useUIStore(state => state.closeDeleteConfirmationModal);
  
  return {
    openWorkoutSummaryModal,
    closeWorkoutSummaryModal,
    openActivityLoggingModal,
    closeActivityLoggingModal,
    openConsistencyCalendarModal,
    closeConsistencyCalendarModal,
    openNextWorkoutInfoModal,
    closeNextWorkoutInfoModal,
    openDeleteConfirmationModal,
    closeDeleteConfirmationModal,
  };
};

export default useUIStore;