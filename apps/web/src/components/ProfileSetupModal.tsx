"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfileClaim } from "@/hooks/useProfileClaim";
import { ProfileClaimFlowNew } from "@/components/profile-claim-flow/ProfileClaimFlowNew";
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
    const flowRef = useRef<any>(null);

    // No longer triggering lookup - form shows immediately
    // Lookup will happen when user submits the form

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            // Store current scroll position
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
        } else {
            // Restore scroll position
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }

        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleComplete = () => {
        onClose();
        // Clear the "started" flag since process is completed
        if (user) {
            localStorage.removeItem(`profile-claim-started-${user.id}`);
        }
        // Refresh the profile claim status
        if (refreshStatus) {
            refreshStatus();
        }
    };

    const handleSkip = () => {
        onClose();
        // Clear the "started" flag since process is completed (skipped)
        if (user) {
            localStorage.removeItem(`profile-claim-started-${user.id}`);
        }
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999]"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="w-full h-full max-w-4xl max-h-[95vh] mx-auto flex flex-col p-4 sm:p-6">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white hover:text-gray-300 z-10 transition-colors flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg font-medium text-sm"
                >
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline">{dict?.profileSetup?.success?.close || "Close"}</span>
                </button>

                {/* Flow Content */}
                <div className="flex-1 overflow-y-auto">
                    <ProfileClaimFlowNew
                        ref={flowRef}
                        userId={user?.id || ""}
                        onComplete={handleComplete}
                        onSkip={handleSkip}
                        onClose={onClose}
                        onRefresh={refreshStatus}
                        forceRefresh={forceRefresh}
                    />
                </div>
            </div>
        </div>
    );
}
