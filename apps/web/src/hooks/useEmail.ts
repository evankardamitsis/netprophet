import { useState, useCallback } from "react";
import { emailService, EmailData } from "@netprophet/lib";

export interface EmailHook {
  send2FAEmail: (
    userEmail: string,
    verificationCode: string,
    language?: "en" | "el"
  ) => Promise<boolean>;
  sendWinningsEmail: (
    userEmail: string,
    matchName: string,
    prediction: string,
    winningsAmount: number,
    language?: "en" | "el"
  ) => Promise<boolean>;
  sendPromotionalEmail: (
    userEmail: string,
    featuredMatches: any[],
    language?: "en" | "el"
  ) => Promise<boolean>;
  sendAdminAlert: (
    alertType: string,
    message: string,
    details?: any
  ) => Promise<boolean>;
  sendWelcomeEmail: (
    userEmail: string,
    userName: string,
    language?: "en" | "el"
  ) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useEmail(): EmailHook {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const send2FAEmail = useCallback(
    async (
      userEmail: string,
      verificationCode: string,
      language: "en" | "el" = "en"
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        // 2FA email functionality removed - using Supabase native features
        const result = false;
        if (!result) {
          setError("Failed to send 2FA email");
          return false;
        }
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(`Error sending 2FA email: ${errorMessage}`);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const sendWinningsEmail = useCallback(
    async (
      userEmail: string,
      matchName: string,
      prediction: string,
      winningsAmount: number,
      language: "en" | "el" = "en"
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await emailService.sendWinningsEmail(
          userEmail,
          matchName,
          prediction,
          winningsAmount,
          language
        );
        if (!result) {
          setError("Failed to send winnings email");
          return false;
        }
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(`Error sending winnings email: ${errorMessage}`);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const sendPromotionalEmail = useCallback(
    async (
      userEmail: string,
      featuredMatches: any[],
      language: "en" | "el" = "en"
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await emailService.sendPromotionalEmail(
          userEmail,
          featuredMatches,
          language
        );
        if (!result) {
          setError("Failed to send promotional email");
          return false;
        }
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(`Error sending promotional email: ${errorMessage}`);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const sendAdminAlert = useCallback(
    async (
      alertType: string,
      message: string,
      details?: any
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await emailService.sendAdminAlert(
          alertType,
          message,
          details
        );
        if (!result) {
          setError("Failed to send admin alert");
          return false;
        }
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(`Error sending admin alert: ${errorMessage}`);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const sendWelcomeEmail = useCallback(
    async (
      userEmail: string,
      userName: string,
      language: "en" | "el" = "en"
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await emailService.sendWelcomeEmail(
          userEmail,
          userName,
          language
        );
        if (!result) {
          setError("Failed to send welcome email");
          return false;
        }
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(`Error sending welcome email: ${errorMessage}`);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    send2FAEmail,
    sendWinningsEmail,
    sendPromotionalEmail,
    sendAdminAlert,
    sendWelcomeEmail,
    isLoading,
    error,
    clearError,
  };
}
