"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

interface WorkoutActionButtonsProps {
  handleSaveOrder: () => Promise<void>;
  handleResetToDefaults: () => Promise<void>;
  isSaving: boolean;
  setShowConfirmResetDialog: (show: boolean) => void;
}

export const WorkoutActionButtons = ({
  handleSaveOrder,
  handleResetToDefaults,
  isSaving,
  setShowConfirmResetDialog,
}: WorkoutActionButtonsProps) => {
  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleSaveOrder} className="w-full" disabled={isSaving}>
        {isSaving ? "Saving Order..." : "Save Exercise Order"}
      </Button>
      <Button variant="outline" onClick={() => setShowConfirmResetDialog(true)} className="w-full" disabled={isSaving}>
        <RefreshCcw className="h-4 w-4 mr-2" /> Reset to Defaults
      </Button>
    </div>
  );
};