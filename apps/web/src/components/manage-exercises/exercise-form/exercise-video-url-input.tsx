"use client";

import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { YoutubeEmbedInfoDialog } from "./youtube-embed-info-dialog"; // Import the new dialog

interface ExerciseVideoUrlInputProps {
  form: UseFormReturn<any>; // Use any for now, schema is in parent
}

export const ExerciseVideoUrlInput = ({ form }: ExerciseVideoUrlInputProps) => {
  const [isYoutubeInfoModalOpen, setIsYoutubeInfoModalOpen] = useState(false);

  return (
    <>
      <FormField 
        control={form.control} 
        name="video_url" 
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2 mb-1">
              <FormLabel className="font-bold">Video URL <span className="font-normal text-sm">(Optional)</span></FormLabel> {/* Reduced text size */}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsYoutubeInfoModalOpen(true)}>
                <Info className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <FormControl>
              <Input {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} 
      />
      <YoutubeEmbedInfoDialog
        open={isYoutubeInfoModalOpen}
        onOpenChange={setIsYoutubeInfoModalOpen}
      />
    </>
  );
};