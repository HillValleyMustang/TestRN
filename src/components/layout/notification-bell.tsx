"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export function NotificationBell() {
  const { session, supabase } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      // RPC call already selects specific columns, no change needed here.
      const { data, error } = await supabase.rpc('get_notifications_with_read_status');

      if (error) {
        throw error;
      }

      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
    } catch (error: any) {
      toast.error("Failed to fetch notifications: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    if (session) {
      fetchNotifications();
    }
  }, [session, fetchNotifications]);

  const handleMarkAllAsRead = async () => {
    if (!session) return;

    const unreadNotifications = notifications.filter(n => !n.is_read);
    if (unreadNotifications.length === 0) {
      toast.info("No unread notifications.");
      return;
    }

    const recordsToInsert = unreadNotifications.map(n => ({
      user_id: session.user.id,
      notification_id: n.id,
      read_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('user_notifications').insert(recordsToInsert);

    if (error) {
      toast.error("Failed to mark notifications as read: " + error.message);
    } else {
      toast.success("All notifications marked as read.");
      fetchNotifications(); // Refresh the list
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          {/* Wrapped Bell and Badge in a single span */}
          <span>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center rounded-full p-0 text-xs">
                {unreadCount}
              </Badge>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" /> Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-72">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <div key={n.id} className={`p-2 rounded-md ${!n.is_read ? 'bg-accent' : ''}`}>
                  <p className="font-semibold text-sm">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}