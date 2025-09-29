"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import YouTube, { YouTubeProps } from 'react-youtube';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VideoPlayerScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  youtubeVideoId: string; // This will now receive the full video_url
  title: string;
}

// Helper function to extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url: string | null | undefined): string | null => {
  if (!url) return null;

  // Regex to match various YouTube URL formats and extract the 11-character video ID
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([a-zA-Z0-9_-]{11})(?:\S+)?/);
  
  console.log(`[VideoPlayerScreen] getYouTubeVideoId - Input URL: ${url}, Match: ${match ? match[1] : 'No Match'}`); // DEBUG
  return (match && match[1]) ? match[1] : null;
};

export const VideoPlayerScreen = ({ open, onOpenChange, youtubeVideoId, title }: VideoPlayerScreenProps) => {
  const videoIdToPlay = getYouTubeVideoId(youtubeVideoId); // Extract the actual video ID here

  console.log(`[VideoPlayerScreen] Prop youtubeVideoId: ${youtubeVideoId}, Extracted videoIdToPlay: ${videoIdToPlay}`); // DEBUG

  const opts: YouTubeProps['opts'] = {
    height: '390',
    width: '640',
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      autoplay: 1,
    },
  };

  // Responsive options for the YouTube player
  const responsiveOpts: YouTubeProps['opts'] = {
    ...opts,
    width: '100%',
    height: 'auto', // Will be adjusted by aspect-ratio container
  };

  if (!videoIdToPlay) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="text-xl font-bold line-clamp-2">Error Playing Video</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center text-destructive">
            Could not extract a valid YouTube video ID from the provided URL.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="text-xl font-bold line-clamp-2">{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-grow overflow-y-auto">
          <div className="p-4">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 Aspect Ratio */ }}>
              <YouTube
                videoId={videoIdToPlay} // Use the extracted video ID
                opts={responsiveOpts}
                className="absolute top-0 left-0 w-full h-full"
                iframeClassName="w-full h-full"
              />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};