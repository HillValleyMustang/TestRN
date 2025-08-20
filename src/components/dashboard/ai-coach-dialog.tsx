"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Bot, AlertCircle } from "lucide-react";
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { ScrollArea } from '../ui/scroll-area';

interface AiCoachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AiCoachDialog = ({ open, onOpenChange }: AiCoachDialogProps) => {
  const { supabase, session } = useSession();
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [lastUsedAt, setLastUsedAt] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsageData = async () => {
      if (!session) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('last_ai_coach_use_at')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;
        
        if (data.last_ai_coach_use_at) {
          setLastUsedAt(data.last_ai_coach_use_at);
          
          // Count how many times AI coach was used in the last session
          // For simplicity, we'll just check if it was used today
          const lastUsedDate = new Date(data.last_ai_coach_use_at).toDateString();
          const today = new Date().toDateString();
          
          if (lastUsedDate === today) {
            setUsageCount(1); // Simplified - in reality you'd track actual usage
          } else {
            setUsageCount(0);
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch AI coach usage data:", err);
      }
    };

    if (open) {
      fetchUsageData();
    }
  }, [open, session, supabase]);

  const handleAnalyze = async () => {
    if (usageCount >= 2) {
      toast.error("You've reached the limit of 2 AI coach uses per session.");
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
      
      // Update usage count and last used timestamp
      setUsageCount(prev => prev + 1);
      
      // Update the profile with the last used timestamp
      if (session) {
        await supabase
          .from('profiles')
          .update({ last_ai_coach_use_at: new Date().toISOString() })
          .eq('id', session.user.id);
      }
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

  const canUseAiCoach = usageCount < 2;

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
              {canUseAiCoach ? (
                <>
                  <p>Get personalised feedback on your workout history from the last month.</p>
                  <Button onClick={handleAnalyze}>Analyze My Performance</Button>
                  <p className="text-sm text-muted-foreground">
                    You have {2 - usageCount} uses remaining for this session.
                  </p>
                </>
              ) : (
                <div className="space-y-4">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
                  <p className="text-muted-foreground">
                    You've reached the limit of 2 AI coach uses per session. 
                    The AI Coach needs at least 3 workouts in the last 30 days to provide advice.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Try to get analysis anyway to show the message about needing more workouts
                      handleAnalyze();
                    }}
                  >
                    Try Anyway
                  </Button>
                </div>
              )}
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