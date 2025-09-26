"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Bike, Activity } from 'lucide-react';

interface Activity {
  id: string;
  type: string;
  distance: string | null;
  time: string | null;
  date: string;
}

interface WeeklyActivitySummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'Cycling':
      return <Bike className="h-5 w-5 text-primary" />;
    // Add cases for other activities like Running, Swimming, etc.
    default:
      return <Activity className="h-5 w-5 text-primary" />;
  }
};

export const WeeklyActivitySummaryDialog = ({ open, onOpenChange, activities }: WeeklyActivitySummaryDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>This Week's Activities</DialogTitle>
          <DialogDescription>
            A summary of your logged activities for the current week.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-96 py-4">
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-center">No activities logged this week.</p>
          ) : (
            <div className="space-y-3">
              {activities.map(activity => (
                <Card key={activity.id}>
                  <CardContent className="p-3 flex items-center gap-4">
                    {getActivityIcon(activity.type)}
                    <div className="flex-grow">
                      <p className="font-semibold">{activity.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.date).toLocaleDateString('en-US', { weekday: 'long' })}
                      </p>
                    </div>
                    <div className="text-right">
                      {activity.distance && <p className="text-sm">{activity.distance}</p>}
                      {activity.time && <p className="text-sm">{activity.time}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};