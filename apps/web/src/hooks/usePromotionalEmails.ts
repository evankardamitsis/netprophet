import { useState, useCallback } from "react";
import { Match } from "@/types/dashboard";
import { PromotionalEmailService } from "@/services/promotionalEmailService";
import { useAuth } from "./useAuth";
import { useDictionary } from "@/context/DictionaryContext";

export function usePromotionalEmails() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { lang } = useDictionary();

  const sendFeaturedMatchesEmail = useCallback(
    async (featuredMatches: Match[]) => {
      if (!user?.email) {
        console.error("No user email available for promotional email");
        return false;
      }

      setIsLoading(true);
      try {
        const success = await PromotionalEmailService.sendFeaturedMatchesEmail(
          user.email,
          featuredMatches,
          lang as "en" | "el"
        );
        return success;
      } catch (error) {
        console.error("Failed to send promotional email:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user?.email, lang]
  );

  const checkAndSendPromotionalEmail = useCallback(
    async (matches: Match[]) => {
      const featuredMatches =
        PromotionalEmailService.getFeaturedMatchesForEmail(matches);

      if (featuredMatches.length === 0) {
        return false; // No featured matches to promote
      }

      // Check if we should send promotional email
      const lastSentKey = `promotional_email_last_sent_${user?.id}`;
      const lastSentDate = localStorage.getItem(lastSentKey);

      if (
        lastSentDate &&
        !PromotionalEmailService.shouldSendPromotionalEmail(
          new Date(lastSentDate)
        )
      ) {
        return false; // Too soon to send another promotional email
      }

      const success = await sendFeaturedMatchesEmail(featuredMatches);

      if (success) {
        // Update last sent date
        localStorage.setItem(lastSentKey, new Date().toISOString());
      }

      return success;
    },
    [sendFeaturedMatchesEmail, user?.id]
  );

  return {
    sendFeaturedMatchesEmail,
    checkAndSendPromotionalEmail,
    isLoading,
  };
}
