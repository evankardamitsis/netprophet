import { useEmail } from "@/hooks/useEmail";
import { Match } from "@/types/dashboard";

export class PromotionalEmailService {
  /**
   * Send promotional email when featured matches are available
   */
  static async sendFeaturedMatchesEmail(
    userEmail: string,
    featuredMatches: Match[],
    language: "en" | "el" = "en"
  ): Promise<boolean> {
    try {
      // Call the API endpoint to send promotional email
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          type: "promotional",
          language: language,
          featuredMatches: featuredMatches,
        }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("Failed to send promotional email:", error);
      return false;
    }
  }

  /**
   * Check if user should receive promotional emails
   */
  static shouldSendPromotionalEmail(lastSentDate?: Date): boolean {
    if (!lastSentDate) return true;

    const now = new Date();
    const hoursSinceLastSent =
      (now.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60);

    // Send promotional emails at most once every 6 hours
    return hoursSinceLastSent >= 6;
  }

  /**
   * Get featured matches for promotional emails
   */
  static getFeaturedMatchesForEmail(matches: Match[]): Match[] {
    return matches
      .filter(
        (match) =>
          match.status === "upcoming" && new Date(match.time) > new Date() // Only future matches
      )
      .slice(0, 3); // Limit to 3 featured matches
  }
}
