"use client";

import { useState, useEffect } from "react";
import { supabase } from "@netprophet/lib";

interface ProfileClaimStatus {
  needsProfileSetup: boolean;
  profileClaimStatus: string | null;
  claimedPlayerId: string | null;
  loading: boolean;
  error: string | null;
}

export function useProfileClaim(userId: string | null) {
  const [status, setStatus] = useState<ProfileClaimStatus>({
    needsProfileSetup: false,
    profileClaimStatus: null,
    claimedPlayerId: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!userId) {
      setStatus({
        needsProfileSetup: false,
        profileClaimStatus: null,
        claimedPlayerId: null,
        loading: false,
        error: null,
      });
      return;
    }

    const checkProfileStatus = async () => {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select(
            "first_name, last_name, terms_accepted, profile_claim_status, claimed_player_id, profile_claim_completed_at"
          )
          .eq("id", userId)
          .single();

        if (error) {
          throw new Error(`Failed to fetch profile: ${error.message}`);
        }

        // Also detect if a player is already claimed by this user
        const { data: claimedPlayers } = await supabase
          .from("players")
          .select("id")
          .eq("claimed_by_user_id", userId)
          .limit(1);

        const hasClaimedPlayer = !!(
          claimedPlayers && claimedPlayers.length > 0
        );

        // Determine whether setup is still needed
        // If there is a claimed player or a completion timestamp, do not show the flow even if status says pending
        const needsSetup =
          profile.profile_claim_status === "pending" &&
          !profile.claimed_player_id &&
          !hasClaimedPlayer &&
          !profile.profile_claim_completed_at;

        setStatus({
          needsProfileSetup: needsSetup,
          profileClaimStatus: profile.profile_claim_status,
          claimedPlayerId: profile.claimed_player_id,
          loading: false,
          error: null,
        });
      } catch (err) {
        setStatus({
          needsProfileSetup: false,
          profileClaimStatus: null,
          claimedPlayerId: null,
          loading: false,
          error:
            err instanceof Error ? err.message : "An unexpected error occurred",
        });
      }
    };

    checkProfileStatus();
  }, [userId]);

  const refreshStatus = async () => {
    if (!userId) return;

    setStatus((prev) => ({ ...prev, loading: true }));

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "first_name, last_name, terms_accepted, profile_claim_status, claimed_player_id, profile_claim_completed_at"
        )
        .eq("id", userId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch profile: ${error.message}`);
      }

      // Also detect if a player is already claimed by this user
      const { data: claimedPlayers } = await supabase
        .from("players")
        .select("id")
        .eq("claimed_by_user_id", userId)
        .limit(1);

      const hasClaimedPlayer = !!(claimedPlayers && claimedPlayers.length > 0);

      // Only show profile setup if pending AND nothing is already claimed and no completion timestamp
      const needsSetup =
        profile.profile_claim_status === "pending" &&
        !profile.claimed_player_id &&
        !hasClaimedPlayer &&
        !profile.profile_claim_completed_at;

      setStatus({
        needsProfileSetup: needsSetup,
        profileClaimStatus: profile.profile_claim_status,
        claimedPlayerId: profile.claimed_player_id,
        loading: false,
        error: null,
      });
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error:
          err instanceof Error ? err.message : "An unexpected error occurred",
      }));
    }
  };

  return {
    ...status,
    refreshStatus,
  };
}
