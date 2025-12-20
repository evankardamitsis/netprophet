/**
 * Utility functions for creating admin in-app notifications
 * This is separate from email notifications and provides real-time in-app alerts
 */

interface CreateNotificationParams {
  type: string;
  severity?: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Create an admin in-app notification
 * This should be called from server-side code (API routes, database functions, etc.)
 */
export async function createAdminNotification(
  params: CreateNotificationParams
): Promise<string | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-admin-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          type: params.type,
          severity: params.severity || "info",
          title: params.title,
          message: params.message,
          metadata: params.metadata || {},
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to create admin notification:", error);
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error("Error creating admin notification:", error);
    return null;
  }
}

/**
 * Helper functions for common notification types
 */
export const AdminNotifications = {
  /**
   * Notify about new user registration
   */
  async userRegistered(
    userId: string,
    email: string,
    firstName?: string,
    lastName?: string
  ) {
    return createAdminNotification({
      type: "user_registration",
      severity: "info",
      title: "New User Registration",
      message: `A new user has registered: ${email}`,
      metadata: {
        user_id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
      },
    });
  },

  /**
   * Notify about profile creation request
   */
  async profileCreationRequest(
    userId: string,
    email: string,
    firstName: string,
    lastName: string
  ) {
    return createAdminNotification({
      type: "profile_creation_request",
      severity: "warning",
      title: "Profile Creation Request",
      message: `${firstName} ${lastName} (${email}) has requested a new athlete profile`,
      metadata: {
        user_id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
      },
    });
  },

  /**
   * Notify about profile activation
   */
  async profileActivated(userId: string, playerId: string, playerName: string) {
    return createAdminNotification({
      type: "profile_activated",
      severity: "success",
      title: "Profile Activated",
      message: `Athlete profile activated for ${playerName}`,
      metadata: {
        user_id: userId,
        player_id: playerId,
        player_name: playerName,
      },
    });
  },

  /**
   * Notify about large bet
   */
  async largeBet(
    betId: string,
    userId: string,
    amount: number,
    currency: string = "coins"
  ) {
    return createAdminNotification({
      type: "large_bet",
      severity: "warning",
      title: "Large Bet Placed",
      message: `A large bet of ${amount} ${currency} has been placed`,
      metadata: {
        bet_id: betId,
        user_id: userId,
        amount,
        currency,
      },
    });
  },

  /**
   * Notify about system error
   */
  async systemError(errorMessage: string, context?: Record<string, any>) {
    return createAdminNotification({
      type: "system_error",
      severity: "error",
      title: "System Error",
      message: errorMessage,
      metadata: {
        ...context,
        timestamp: new Date().toISOString(),
      },
    });
  },

  /**
   * Notify about tournament creation
   */
  async tournamentCreated(tournamentId: string, tournamentName: string) {
    return createAdminNotification({
      type: "tournament_created",
      severity: "info",
      title: "Tournament Created",
      message: `New tournament created: ${tournamentName}`,
      metadata: {
        tournament_id: tournamentId,
        tournament_name: tournamentName,
      },
    });
  },

  /**
   * Notify about payment received
   */
  async paymentReceived(
    paymentId: string,
    userId: string,
    amount: number,
    currency: string = "EUR"
  ) {
    return createAdminNotification({
      type: "payment_received",
      severity: "success",
      title: "Payment Received",
      message: `Payment of ${amount} ${currency} received`,
      metadata: {
        payment_id: paymentId,
        user_id: userId,
        amount,
        currency,
      },
    });
  },

  /**
   * Notify about user deletion
   */
  async userDeleted(userId: string, email: string) {
    return createAdminNotification({
      type: "user_deleted",
      severity: "warning",
      title: "User Deleted",
      message: `User ${email} has been deleted`,
      metadata: {
        user_id: userId,
        email,
      },
    });
  },

  /**
   * Notify about suspicious activity
   */
  async suspiciousActivity(
    activityType: string,
    userId: string,
    details: Record<string, any>
  ) {
    return createAdminNotification({
      type: "suspicious_activity",
      severity: "error",
      title: "Suspicious Activity Detected",
      message: `Suspicious activity detected: ${activityType}`,
      metadata: {
        activity_type: activityType,
        user_id: userId,
        ...details,
      },
    });
  },
};
