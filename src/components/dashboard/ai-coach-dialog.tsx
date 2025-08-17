"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Bot } from "lucide-react";
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { ScrollArea } from '../ui/scroll-area';

interface AiCoachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AiCoachDialog = ({ open, onOpenChange }: AiCoachDialogProps) => {
  const { supabase } = useSession();
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis("");
    try {
      const { data, error } = await supabase.functions.invoke('ai-coach');

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
    } catch (err: any) {
      console.error("AI Coach error:", err);
      toast.error("Failed to get AI analysis: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setAnalysis("");
      setLoading(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bot className="mr-2 h-5 w-5" /> AI Fitness Coach
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 flex-grow overflow-hidden">
          {!analysis && !loading && (
            <div className="text-center space-y-4">
              <p>Get personalized feedback on your workout history from the last month.</p>
              <Button onClick={handleAnalyze}>Analyze My Performance</Button>
            </div>
          )}
          {loading && (
            <div className="text-center text-muted-foreground">
              <p>Analyzing your performance... This may take a moment.</p>
            </div>
          )}
          {analysis && (
            <ScrollArea className="h-full w-full rounded-md border p-4">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: analysis.replace(/\n/g, '<br />') }}
              />
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};