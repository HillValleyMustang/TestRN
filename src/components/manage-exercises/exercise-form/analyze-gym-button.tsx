"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

interface AnalyseGymButtonProps { // Renamed to AnalyseGymButtonProps
  onClick: () => void;
}

export const AnalyseGymButton = ({ onClick }: AnalyseGymButtonProps) => { // Renamed to AnalyseGymButton
  return (
    <Button type="button" variant="outline" onClick={onClick} className="w-full">
      <Camera className="h-4 w-4 mr-2" /> Analyse Gym Photo
    </Button>
  );
};