"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, AlertCircle } from "lucide-react"; // Added AlertCircle
import { toast } from "sonner";
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Tables } from '@/types/supabase'; // Import Tables

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: string; // Added type
}

interface UserAlert {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: string;
}

export function NotificationBell() {
  const { session, supabase, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userAlerts, setUserAlerts] = useState<UserAlert[]>([]); // New state for user alerts
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!memoizedSessionUserId) return; // Use memoized ID
    setLoading(true);
    try {
      // Fetch global notifications
      const { data: globalNotifications, error: globalError } = await supabase.rpc('get_notifications_with_read_status');
      if (globalError) throw globalError;

      // Fetch user-specific alerts
      const { data: fetchedUserAlerts, error: userAlertsError } = await supabase
        .from('user_alerts')
        .select('id, title, message, created_at, is_read, type')
        .eq('user_id', memoizedSessionUserId) // Use memoized ID
        .order('created_at', { ascending: false });
      if (userAlertsError) throw userAlertsError;

      const allNotifications: (Notification | UserAlert)[] = [
        ...(globalNotifications as Notification[] || []),
        ...(fetchedUserAlerts as UserAlert[] || []),
      ];

      // Sort all notifications by creation date descending
      allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(allNotifications as Notification[]); // Cast back to Notification[] for combined list
      setUnreadCount(allNotifications.filter(n => !n.is_read).length);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to fetch notifications: " + error.message); // Changed to toast.error
    } finally {
      setLoading(false);
    }
  }, [memoizedSessionUserId, supabase]); // Depend on memoized ID

  useEffect(() => {
    if (memoizedSessionUserId) { // Use memoized ID
      fetchNotifications();
    }
  }, [memoizedSessionUserId, fetchNotifications]); // Depend on memoized ID

  const handleMarkAllAsRead = async () => {
    if (!memoizedSessionUserId) { // Use memoized ID
      toast.error("You must be logged in to mark notifications as read."); // Added toast.error
      return;
    }

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
        user_id: memoizedSessionUserId, // Use memoized ID
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
      toast.error("Failed to mark some notifications as read."); // Changed to toast.error
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