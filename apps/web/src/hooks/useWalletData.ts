"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";

/**
 * Hook for components that need complete wallet data (bet stats, transactions, etc.)
 * This should be used on components like Wallet, My Picks, Results, Profile, etc.
 */
export function useWalletData() {
  const { loadAllData, isWalletSyncing } = useWallet();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // Load all wallet data when component mounts
    if (!hasLoaded) {
      loadAllData();
      setHasLoaded(true);
    }
  }, [loadAllData, hasLoaded]);

  return { isWalletSyncing };
}
