"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, AlertCircle } from "lucide-react"; // Added AlertCircle
import { toast } from "sonner";
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Tables, UserAlert } from '@/types/supabase'; // Import Tables and UserAlert
import { useWorkoutDataFetcher } from '@/hooks/use-workout-data-fetcher'; // Import useWorkoutDataFetcher

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string | null; // Changed to allow null
  is_read: boolean;
  type: string; // Added type
}

export function NotificationBell() {
  const { session, supabase } = useSession();
  const { userAlerts, refreshUserAlerts } = useWorkoutDataFetcher(); // NEW: Get userAlerts and refresh function
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      // Fetch global notifications
      const { data: globalNotifications, error: globalError } = await supabase.rpc('get_notifications_with_read_status');
      if (globalError) throw globalError;

      // Combine global notifications and user alerts
      const allNotifications: (Notification | UserAlert)[] = [
        ...(globalNotifications as Notification[] || []),
        ...(userAlerts || []), // Use userAlerts from the hook
      ];

      // Sort all notifications by creation date descending
      allNotifications.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      setNotifications(allNotifications as Notification[]); // Cast back to Notification[] for combined list
      setUnreadCount(allNotifications.filter(n => !n.is_read).length);
    } catch (error: any) {
      toast.error("Failed to fetch notifications: " + error.message);
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [session, supabase, userAlerts]); // Added userAlerts to dependencies

  useEffect(() => {
    if (session) {
      fetchNotifications();
    }
  }, [session, fetchNotifications]);

  const handleMarkAllAsRead = async () => {
    if (!session) return;

    const unreadGlobalNotifications = notifications.filter(n => !n.is_read && n.type !== 'system_error' && n.type !== 'achievement_error');
    const unreadUserAlerts = notifications.filter(n => !n.is_read && (n.type === 'system_error' || n.type === 'achievement_error'));

    if (unreadGlobalNotifications.length === 0 && unreadUserAlerts.length === 0) {
      toast.info("No unread notifications.");
      return;
    }

    let hasError = false;

    // Mark global notifications as read
    if (unreadGlobalNotifications.length > 0) {
      const recordsToInsert = unreadGlobalNotifications.map(n => ({
        user_id: session.user.id,
        notification_id: n.id,
        read_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('user_notifications').insert(recordsToInsert);
      if (error) {
        console.error("Error marking global notifications as read:", error);
        hasError = true;
      }
    }

    // Mark user alerts as read
    if (unreadUserAlerts.length > 0) {
      const alertIdsToUpdate = unreadUserAlerts.map(a => a.id);
      const { error } = await supabase.from('user_alerts').update({ is_read: true }).in('id', alertIdsToUpdate);
      if (error) {
        console.error("Error marking user alerts as read:", error);
        hasError = true;
      }
    }

    if (hasError) {
      toast.error("Failed to mark some notifications as read.");
    } else {
      toast.success("All notifications marked as read.");
      refreshUserAlerts(); // NEW: Refresh user alerts cache
      fetchNotifications(); // Refresh the list
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
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
                  <p className="font-semibold text-sm flex items-center gap-2">
                    {n.type === 'system_error' || n.type === 'achievement_error' ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : null}
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}