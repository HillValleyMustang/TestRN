"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Film, RefreshCw } from 'lucide-react';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { MediaPost } from '@/types/supabase'; // UPDATED: Import MediaPost directly
import { MediaPostCard } from './media-post-card';
import { VideoPlayerScreen } from './video-player-screen';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const MediaFeedScreen = () => {
  const { session, supabase } = useSession();
  const [mediaPosts, setMediaPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ youtubeVideoId: string; title: string } | null>(null);

  const fetchMediaPosts = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('media_posts')
        .select('*, category')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to fetch media posts.');
      }

      // Explicitly cast data to MediaPost[]
      setMediaPosts((data as MediaPost[]) || []);
    } catch (err: any) {
      console.error("[MediaFeedScreen] Error fetching media posts:", err);
      setError(err.message || "Failed to load media library.");
      toast.error(err.message || "Failed to load media library.");
    } finally {
      setLoading(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    fetchMediaPosts();
  }, [fetchMediaPosts]);

  const handlePostClick = (post: MediaPost) => {
    setSelectedVideo({ youtubeVideoId: post.video_url, title: post.title });
    setIsVideoPlayerOpen(true);
  };

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    mediaPosts.forEach(post => {
      if (post.category) {
        categories.add(post.category);
      }
    });
    return ['All', ...Array.from(categories).sort()];
  }, [mediaPosts]);

  const filteredPosts = useMemo(() => {
    if (activeCategory === 'All') {
      return mediaPosts;
    }
    return mediaPosts.filter(post => post.category === activeCategory);
  }, [mediaPosts, activeCategory]);

  return (
    <>
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" /> Media Library
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchMediaPosts} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
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
              {/* Category Filter Buttons */}
              <ScrollArea className="w-full whitespace-nowrap rounded-md border mb-4">
                <div className="flex w-max space-x-2 p-2">
                  {uniqueCategories.map(category => (
                    <Button
                      key={category}
                      variant={activeCategory === category ? "default" : "outline"}
                      onClick={() => setActiveCategory(category)}
                      className={cn(
                        "h-8 px-3 text-sm",
                        activeCategory === category ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
                      )}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              {filteredPosts.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">
                  <p>No video posts available for this category yet.</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPosts.map((post) => (
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