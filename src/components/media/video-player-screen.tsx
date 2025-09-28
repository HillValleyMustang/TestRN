"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import YouTube, { YouTubeProps } from 'react-youtube';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VideoPlayerScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  youtubeVideoId: string;
  title: string;
}

export const VideoPlayerScreen = ({ open, onOpenChange, youtubeVideoId, title }: VideoPlayerScreenProps) => {
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
                videoId={youtubeVideoId}
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