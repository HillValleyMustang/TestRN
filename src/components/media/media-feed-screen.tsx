"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Film, RefreshCw } from 'lucide-react';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { MediaPostCard } from './media-post-card';
import { VideoPlayerScreen } from './video-player-screen';
import { Button } from '@/components/ui/button'; // Import Button component

type MediaPost = Tables<'media_posts'>;

export const MediaFeedScreen = () => {
  const { session } = useSession();
  const [mediaPosts, setMediaPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ youtubeVideoId: string; title: string } | null>(null);

  const fetchMediaPosts = useCallback(async () => {
    if (!session) {
      console.log("[MediaFeedScreen] Not logged in, skipping fetch.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    console.log("[MediaFeedScreen] Attempting to fetch media posts...");
    try {
      const response = await fetch('/api/media', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      console.log("[MediaFeedScreen] API response data:", data);

      if (!response.ok) {
        console.error("[MediaFeedScreen] API response not OK:", data.error || 'Failed to fetch media posts.');
        throw new Error(data.error || 'Failed to fetch media posts.');
      }

      setMediaPosts(data);
      console.log("[MediaFeedScreen] Successfully fetched media posts:", data);
    } catch (err: any) {
      console.error("[MediaFeedScreen] Error fetching media posts:", err);
      setError(err.message || "Failed to load media library.");
      toast.error(err.message || "Failed to load media library.");
    } finally {
      setLoading(false);
      console.log("[MediaFeedScreen] Fetching complete. Loading:", false);
    }
  }, [session]);

  useEffect(() => {
    fetchMediaPosts();
  }, [fetchMediaPosts]);

  const handlePostClick = (post: MediaPost) => {
    setSelectedVideo({ youtubeVideoId: post.youtube_video_id, title: post.title });
    setIsVideoPlayerOpen(true);
  };

  console.log("[MediaFeedScreen] Current state - loading:", loading, "error:", error, "posts count:", mediaPosts.length);

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
          ) : mediaPosts.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <p>No video posts available yet.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mediaPosts.map((post) => (
                  <MediaPostCard key={post.id} post={post} onClick={handlePostClick} />
                ))}
              </div>
            </ScrollArea>
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