"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

interface AnalyzeGymButtonProps {
  onClick: () => void;
}

export const AnalyzeGymButton = ({ onClick }: AnalyzeGymButtonProps) => {
  return (
    <Button type="button" variant="outline" onClick={onClick} className="w-full">
      <Camera className="h-4 w-4 mr-2" /> Analyze Gym Photo
    </Button>
  );
};