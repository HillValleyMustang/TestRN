import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BackHandler } from "react-native";
import { useRouter } from "expo-router";

interface WorkoutFlowContextValue {
  isWorkoutActive: boolean;
  hasUnsavedChanges: boolean;
  activeTemplateId: string | null;
  startSession: (templateId?: string | null) => void;
  completeSession: () => void;
  setHasUnsavedChanges: (value: boolean) => void;
  requestNavigation: (action: () => void) => void;
  showUnsavedChangesDialog: boolean;
  confirmLeave: () => void;
  cancelLeave: () => void;
}

const WorkoutFlowContext = createContext<WorkoutFlowContextValue | undefined>(
  undefined,
);

export const WorkoutFlowProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
    useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const startSession = useCallback((templateId?: string | null) => {
    setIsWorkoutActive(true);
    setActiveTemplateId(templateId ?? null);
  }, []);

  const completeSession = useCallback(() => {
    setIsWorkoutActive(false);
    setHasUnsavedChanges(false);
    setActiveTemplateId(null);
  }, []);

  const setUnsavedChanges = useCallback((value: boolean) => {
    setHasUnsavedChanges(value);
  }, []);

  const requestNavigation = useCallback(
    (action: () => void) => {
      if (hasUnsavedChanges) {
        pendingActionRef.current = action;
        setShowUnsavedChangesDialog(true);
        return;
      }
      action();
    },
    [hasUnsavedChanges],
  );

  const confirmLeave = useCallback(() => {
    setShowUnsavedChangesDialog(false);
    setHasUnsavedChanges(false);
    setIsWorkoutActive(false);
    setActiveTemplateId(null);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) {
      action();
    }
  }, []);

  const cancelLeave = useCallback(() => {
    setShowUnsavedChangesDialog(false);
    pendingActionRef.current = null;
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handler = () => {
      pendingActionRef.current = () => router.back();
      setShowUnsavedChangesDialog(true);
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handler,
    );
    return () => subscription.remove();
  }, [hasUnsavedChanges, router]);

  const value = useMemo(
    () => ({
      isWorkoutActive,
      hasUnsavedChanges,
      activeTemplateId,
      startSession,
      completeSession,
      setHasUnsavedChanges: setUnsavedChanges,
      requestNavigation,
      showUnsavedChangesDialog,
      confirmLeave,
      cancelLeave,
    }),
    [
      activeTemplateId,
      completeSession,
      confirmLeave,
      hasUnsavedChanges,
      isWorkoutActive,
      requestNavigation,
      setUnsavedChanges,
      showUnsavedChangesDialog,
      cancelLeave,
      startSession,
    ],
  );

  return (
    <WorkoutFlowContext.Provider value={value}>
      {children}
    </WorkoutFlowContext.Provider>
  );
};

export const useWorkoutFlow = () => {
  const context = useContext(WorkoutFlowContext);
  if (!context) {
    throw new Error("useWorkoutFlow must be used within a WorkoutFlowProvider");
  }
  return context;
};

export default WorkoutFlowProvider;
