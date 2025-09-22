"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, Youtube } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface YoutubeEmbedInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const YoutubeEmbedInfoDialog = ({ open, onOpenChange }: YoutubeEmbedInfoDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" /> YouTube Embed Link Info
          </DialogTitle>
          <DialogDescription>
            To ensure videos play correctly within the app, please use a YouTube **embed link**.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow overflow-y-auto py-4 pr-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-1">What is an embed link?</h4>
              <p className="text-sm text-muted-foreground">
                An embed link is a special URL format that allows a YouTube video to be displayed directly on another website. It looks different from the regular video link you see in your browser's address bar.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">How to get a YouTube embed link:</h4>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                <li>Go to the YouTube video you want to use.</li>
                <li>Click the "<span className="font-medium">Share</span>" button below the video.</li>
                <li>Click the "<span className="font-medium">Embed</span>" option.</li>
                <li>A code snippet will appear. Look for the `src` attribute within the `&lt;iframe&gt;` tag.</li>
                <li>Copy only the URL inside the `src` attribute. It usually starts with `https://www.youtube.com/embed/` followed by the video ID.</li>
                <li>Paste this copied embed URL into the "Video URL" field.</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Example:</h4>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Regular Link:</span> `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Embed Link:</span> `https://www.youtube.com/embed/dQw4w9WgXcQ`
              </p>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-center pt-4">
          <Button onClick={() => onOpenChange(false)}>Got It!</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};