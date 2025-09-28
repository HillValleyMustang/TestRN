"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Film } from 'lucide-react';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';

type MediaPost = Tables<'media_posts'>;

export const MediaFeedScreen = () => {
  const { session } = useSession();
  const [mediaPosts, setMediaPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMediaPosts = async () => {
      if (!session) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/media', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch media posts.');
        }

        setMediaPosts(data);
      } catch (err: any) {
        console.error("Error fetching media posts:", err);
        setError(err.message || "Failed to load media library.");
        toast.error(err.message || "Failed to load media library.");
      } finally {
        setLoading(false);
      }
    };

    fetchMediaPosts();
  }, [session]);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="h-5 w-5" /> Media Library
        </CardTitle>
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
            <div className="space-y-4">
              {/* Placeholder for individual video posts */}
              {mediaPosts.map((post) => (
                <div key={post.id} className="border rounded-md p-4">
                  <h3 className="font-semibold text-lg">{post.title}</h3>
                  {post.description && <p className="text-sm text-muted-foreground">{post.description}</p>}
                  {/* You'll add the actual video embed here in a later step */}
                  <div className="mt-2 text-xs text-muted-foreground">
                    By {post.creator_name || 'Unknown'} • {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};