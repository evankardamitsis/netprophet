"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfileClaim } from "@/hooks/useProfileClaim";
import { ProfileClaimFlowNew } from "@/components/auth/ProfileClaimFlowNew";
import { X } from "lucide-react";
import { useDictionary } from "@/context/DictionaryContext";

interface ProfileSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    forceRefresh?: number;
}

export function ProfileSetupModal({ isOpen, onClose, forceRefresh }: ProfileSetupModalProps) {
    const { user } = useAuth();
    const { needsProfileSetup, loading, refreshStatus } = useProfileClaim(user?.id || null);
    const { dict } = useDictionary();

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleComplete = () => {
        onClose();
        // Refresh the profile claim status
        if (refreshStatus) {
            refreshStatus();
        }
    };

    const handleSkip = () => {
        onClose();
        // Refresh the profile claim status
        if (refreshStatus) {
            refreshStatus();
        }
    };

    // Only show modal if explicitly opened (isOpen)
    // Don't check needsProfileSetup here because user might be manually triggering it
    if (!isOpen || loading) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="w-full max-w-3xl mx-auto relative my-4 sm:my-8 animate-in fade-in-0 zoom-in-95 duration-300">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute -top-10 sm:-top-12 right-0 text-white hover:text-gray-300 z-10 transition-colors flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg font-medium text-sm"
                >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">{dict?.profileSetup?.success?.close || "Close"}</span>
                </button>

                {/* Flow Content */}
                <ProfileClaimFlowNew
                    userId={user?.id || ""}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                    onRefresh={refreshStatus}
                    forceRefresh={forceRefresh}
                />
            </div>
        </div>
    );
}
