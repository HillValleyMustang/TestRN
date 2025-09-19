"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles, AlertCircle } from 'lucide-react';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingOverlay } from '../loading-overlay';

interface AiSessionAnalysisCardProps {
  sessionId: string;
}

export const AiSessionAnalysisCard = ({ sessionId }: AiSessionAnalysisCardProps) => {
  const { session, supabase } = useSession();
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const AI_COACH_DAILY_LIMIT = 2;

  const fetchUsageData = useCallback(async () => {
    if (!session) return;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const { count, error } = await supabase
        .from('ai_coach_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .gte('used_at', today.toISOString())
        .lt('used_at', tomorrow.toISOString());

      if (error) throw error;
      
      setUsageCount(count || 0);
      
    } catch (err: any) {
      console.error("Failed to fetch AI coach usage data:", err);
    }
  }, [session, supabase]);

  useEffect(() => {
    if (session) {
      fetchUsageData();
    }
  }, [session, fetchUsageData]);

  const handleAnalyse = async () => {
    if (!session) {
      toast.error("You must be logged in to use the AI coach.");
      return;
    }
    if (usageCount >= AI_COACH_DAILY_LIMIT) {
      toast.error(`You've reached the limit of ${AI_COACH_DAILY_LIMIT} AI coach uses per day.`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { sessionId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
      await fetchUsageData(); // Re-fetch the count from the database
      
    } catch (err: any) {
      console.error("AI Coach error:", err);
      toast.error("Failed to get AI analysis: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const canUseAiCoach = usageCount < AI_COACH_DAILY_LIMIT;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" /> AI Coach Feedback
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!analysis && !loading ? (
          <div className="text-center space-y-4">
            {canUseAiCoach ? (
              <>
                <p className="text-muted-foreground">Get personalised feedback on this specific workout session.</p>
                <Button onClick={handleAnalyse} disabled={!canUseAiCoach}>
                  <Sparkles className="h-4 w-4 mr-2" /> Analyse This Workout
                </Button>
                <p className="text-sm text-muted-foreground">
                  You have {AI_COACH_DAILY_LIMIT - usageCount} uses remaining today.
                </p>
              </>
            ) : (
              <div className="space-y-4">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
                <p className="text-muted-foreground">
                  You've reached the limit of {AI_COACH_DAILY_LIMIT} AI coach uses per day.
                </p>
              </div>
            )}
          </div>
        ) : (
          <ScrollArea className="h-64 w-full rounded-md border p-4">
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: analysis.replace(/\n/g, '<br />') }}
            />
          </ScrollArea>
        )}
      </CardContent>
      <LoadingOverlay
        isOpen={loading}
        title="Generating AI Analysis"
        description="Please wait while the AI coach analyses your workout performance."
      />
    </Card>
  );
};