"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Film, RefreshCw, Filter } from 'lucide-react';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { MediaPost } from '@/types/supabase';
import { MediaPostCard } from './media-post-card';
import { VideoPlayerScreen } from './video-player-screen';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'; // Keep web-specific utils;
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MediaFeedScreenProps {
  // No props needed now
}

export const MediaFeedScreen = ({}: MediaFeedScreenProps) => {
  const { session, supabase } = useSession();
  const [mediaPosts, setMediaPosts] = useState<MediaPost[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ youtubeVideoId: string; title: string } | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!session) return;
      try {
        const { data, error } = await supabase
          .from('media_posts')
          .select('category');

        if (error) throw error;

        const uniqueCategories = ['All', ...Array.from(new Set((data || []).map(p => p.category).filter(Boolean) as string[])).sort()];
        setCategories(uniqueCategories);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, [session, supabase]);

  const fetchMediaPosts = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('media_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeCategory !== 'All') {
        query = query.eq('category', activeCategory);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to fetch media posts.');
      }

      setMediaPosts((data as MediaPost[]) || []);
    } catch (err: any) {
      console.error("[MediaFeedScreen] Error fetching media posts:", err);
      setError(err.message || "Failed to load media library.");
      toast.error(err.message || "Failed to load media library.");
    } finally {
      setLoading(false);
    }
  }, [session, supabase, activeCategory]);

  useEffect(() => {
    fetchMediaPosts();
  }, [fetchMediaPosts]);

  const handlePostClick = (post: MediaPost) => {
    setSelectedVideo({ youtubeVideoId: post.video_url, title: post.title });
    setIsVideoPlayerOpen(true);
  };

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category);
    setIsFilterSheetOpen(false); // Close sheet after selection
  };

  return (
    <>
      <Card className="mt-6 border-x-0 rounded-none shadow-none sm:border-x sm:rounded-lg sm:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" /> Media Library
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={fetchMediaPosts} disabled={loading}>
                  <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                  <span className="sr-only">Refresh</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh Feed</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive py-16">
              <p>Error: {error}</p>
            </div>
          ) : (
            <>
              <div className="p-4 sm:p-0">
                <div className="flex items-center justify-end gap-2 mb-4">
                  <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        <Filter className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filter</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-fit max-h-[80vh]">
                      <SheetHeader>
                        <SheetTitle>Filter by Category</SheetTitle>
                      </SheetHeader>
                      <div className="py-4 flex flex-col space-y-2">
                        {categories.map(category => (
                          <Button
                            key={category}
                            variant={activeCategory === category ? "default" : "outline"}
                            onClick={() => handleCategorySelect(category)}
                            className="justify-start"
                          >
                            {category}
                          </Button>
                        ))}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

              {mediaPosts.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">
                  <p>No video posts available for this category.</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] px-4 sm:px-0 sm:pr-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {mediaPosts.map((post: MediaPost) => (
                      <MediaPostCard key={post.id} post={post} onClick={handlePostClick} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedVideo && (
        <VideoPlayerScreen
          open={isVideoPlayerOpen}
          onOpenChange={setIsVideoPlayerOpen}
          youtubeVideoId={selectedVideo.youtubeVideoId}
          title={selectedVideo.title}
        />
      )}
    </>
  );
};