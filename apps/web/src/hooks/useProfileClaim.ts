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
            "first_name, last_name, terms_accepted, profile_claim_status, claimed_player_id"
          )
          .eq("id", userId)
          .single();

        if (error) {
          throw new Error(`Failed to fetch profile: ${error.message}`);
        }

        // Check if user needs to complete profile setup
        const needsSetup =
          !profile.first_name ||
          !profile.last_name ||
          !profile.terms_accepted ||
          (profile.profile_claim_status !== "claimed" &&
            profile.profile_claim_status !== "completed" &&
            profile.profile_claim_status !== "creation_requested" &&
            !profile.claimed_player_id);

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
          "first_name, last_name, terms_accepted, profile_claim_status, claimed_player_id"
        )
        .eq("id", userId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch profile: ${error.message}`);
      }

      const needsSetup =
        !profile.first_name ||
        !profile.last_name ||
        !profile.terms_accepted ||
        (profile.profile_claim_status !== "claimed" &&
          profile.profile_claim_status !== "completed" &&
          profile.profile_claim_status !== "creation_requested" &&
          !profile.claimed_player_id);

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
