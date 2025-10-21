import { supabase } from "./client";
import type { Database } from "../types/database";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];
type NotificationUpdate =
  Database["public"]["Tables"]["notifications"]["Update"];

export interface NotificationWithData extends Omit<Notification, "data"> {
  data?: {
    bet_id?: string;
    match_id?: string;
    winnings?: number;
    type?: string;
  };
}

export class NotificationsService {
  /**
   * Get notifications for the current user
   */
  static async getNotifications(
    limit: number = 50
  ): Promise<NotificationWithData[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching notifications:", error);
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return (data || []) as NotificationWithData[];
  }

  /**
   * Get unread notifications count for the current user
   */
  static async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .is("read_at", null);

    if (error) {
      console.error("Error fetching unread count:", error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for the current user
   */
  static async markAllAsRead(): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      throw new Error(
        `Failed to mark all notifications as read: ${error.message}`
      );
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      console.error("Error deleting notification:", error);
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Delete all notifications for the current user
   */
  static async deleteAllNotifications(): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .neq("id", ""); // Delete all notifications for the current user

    if (error) {
      console.error("Error deleting all notifications:", error);
      throw new Error(`Failed to delete all notifications: ${error.message}`);
    }
  }

  /**
   * Subscribe to real-time notifications with improved error handling
   */
  static async subscribeToNotifications(callback: (payload: any) => void) {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${(await supabase.auth.getUser()).data.user?.id}`,
        },
        callback
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${(await supabase.auth.getUser()).data.user?.id}`,
        },
        callback
      )
      .subscribe((status) => {
        console.log("Notification subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to real-time notifications");
        } else if (status === "CHANNEL_ERROR") {
          console.error("Failed to subscribe to notifications channel");
        }
      });

    return channel;
  }
}
