"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tables } from '@/types/supabase';
import { PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type MediaPost = Tables<'media_posts'>;

interface MediaPostCardProps {
  post: MediaPost;
  onClick: (post: MediaPost) => void;
  className?: string;
}

// Helper function to extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url: string | null | undefined): string | null => {
  if (!url) return null;

  // Regex to match various YouTube URL formats and extract the 11-character video ID
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([a-zA-Z0-9_-]{11})(?:\S+)?/);
  
  console.log(`[MediaPostCard] getYouTubeVideoId - Input URL: ${url}, Match: ${match ? match[1] : 'No Match'}`); // DEBUG
  return (match && match[1]) ? match[1] : null;
};

export const MediaPostCard = ({ post, onClick, className }: MediaPostCardProps) => {
  console.log(`[MediaPostCard] Rendering post ID: ${post.id}, Raw video_url: ${post.video_url}`); // NEW DEBUG LOG
  const youtubeVideoId = getYouTubeVideoId(post.video_url); // Extract ID from video_url
  const thumbnailUrl = youtubeVideoId ? `https://img.youtube.com/vi/${youtubeVideoId}/0.jpg` : "/placeholder-video.jpg";

  console.log(`[MediaPostCard] Post ID: ${post.id}, video_url: ${post.video_url}, Extracted YouTube ID: ${youtubeVideoId}, Thumbnail URL: ${thumbnailUrl}`); // DEBUG

  return (
    <Card
      className={cn(
        "cursor-pointer overflow-hidden transition-all duration-200 ease-in-out hover:scale-[1.02] hover:shadow-lg",
        className
      )}
      onClick={() => onClick(post)}
    >
      <CardContent className="p-0">
        <div className="relative aspect-video w-full bg-muted flex items-center justify-center">
          {/* YouTube Thumbnail */}
          <img
            src={thumbnailUrl}
            alt={post.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "/placeholder-video.jpg"; // Fallback image
              e.currentTarget.onerror = null;
              console.error(`[MediaPostCard] Failed to load thumbnail for post ${post.id}. Using fallback.`); // DEBUG
            }}
          />
          {/* Play icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
            <PlayCircle className="h-12 w-12 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-lg leading-tight mb-1">{post.title}</h3>
          {post.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{post.description}</p>
          )}
          <p className="text-xs text-muted-foreground">By {post.creator_name || 'Unknown'}</p>
        </div>
      </CardContent>
    </Card>
  );
};