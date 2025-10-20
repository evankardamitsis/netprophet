"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useOptimizedNavigation() {
  const router = useRouter();

  const navigateWithFeedback = useCallback(
    (path: string, options?: { replace?: boolean }) => {
      // Immediate visual feedback
      if (typeof window !== "undefined") {
        // Add instant loading indicator
        const indicator = document.createElement("div");
        indicator.className =
          "fixed top-0 left-0 right-0 h-1 z-[9999] bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-pulse";
        document.body.appendChild(indicator);

        // Remove immediately after navigation starts
        requestAnimationFrame(() => {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        });
      }

      if (options?.replace) {
        router.replace(path);
      } else {
        router.push(path);
      }
    },
    [router]
  );

  const navigateBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    navigateWithFeedback,
    navigateBack,
  };
}
