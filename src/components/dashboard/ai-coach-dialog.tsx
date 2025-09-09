"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Bot, AlertCircle, Info } from "lucide-react";
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { ScrollArea } from '../ui/scroll-area';
import { LoadingOverlay } from '../loading-overlay';
import { Tables } from '@/types/supabase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AiCoachUsageLog = Tables<'ai_coach_usage_logs'>;

interface AiCoachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AiCoachDialog = ({ open, onOpenChange }: AiCoachDialogProps) => {
  const { supabase, session } = useSession();
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const AI_COACH_LIMIT_PER_SESSION = 2;

  useEffect(() => {
    const fetchUsageData = async () => {
      if (!session) return;
      
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const { data: usageLogs, error } = await supabase
          .from('ai_coach_usage_logs')
          .select('id')
          .eq('user_id', session.user.id)
          .gte('used_at', today.toISOString())
          .lt('used_at', tomorrow.toISOString());

        if (error) throw error;
        
        setUsageCount(usageLogs?.length || 0);
        
      } catch (err: any) {
        console.error("Failed to fetch AI coach usage data:", err);
      }
    };

    if (open) {
      fetchUsageData();
    }
  }, [open, session, supabase]);

  const handleAnalyse = async () => { // Renamed to handleAnalyse
    if (usageCount >= AI_COACH_LIMIT_PER_SESSION) {
      toast.error(`You've reached the limit of ${AI_COACH_LIMIT_PER_SESSION} AI coach uses per session.`);
      return;
    }

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
      
      setUsageCount(prev => prev + 1);
      
    } catch (err: any) {
      console.error("AI Coach error:", err);
      toast.error("Failed to get AI analysis: " + err.message); // Changed to analysis
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

  const canUseAiCoach = usageCount < AI_COACH_LIMIT_PER_SESSION;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bot className="mr-2 h-5 w-5" /> AI Fitness Coach
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-2 h-6 w-6">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    The AI Coach now uses your workout ratings (1-5 stars) to provide more nuanced feedback,
                    understanding not just what you did, but how you felt about it.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 flex-grow overflow-hidden">
          {!analysis && !loading && (
            <div className="text-center space-y-4">
              {canUseAiCoach ? (
                <>
                  <p>Get personalised feedback on your workout history from the last month.</p>
                  <Button onClick={handleAnalyse}>Analyse My Performance</Button> {/* Changed to Analyse */}
                  <p className="text-sm text-muted-foreground">
                    You have {AI_COACH_LIMIT_PER_SESSION - usageCount} uses remaining for this session.
                  </p>
                </>
              ) : (
                <div className="space-y-4">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
                  <p className="text-muted-foreground">
                    You've reached the limit of {AI_COACH_LIMIT_PER_SESSION} AI coach uses per session. 
                    The AI Coach needs at least 3 workouts in the last 30 days to provide advice.
                  </p>
                </div>
              )}
            </div>
          )}
          {loading && (
            <div className="text-center text-muted-foreground">
              <p>Analysing your performance... This may take a moment.</p> {/* Changed to Analysing */}
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
      <LoadingOverlay 
        isOpen={loading} 
        title="Generating AI Analysis" 
        description="Please wait while the AI coach analyses your workout performance." 
      />
    </Dialog>
  );
};