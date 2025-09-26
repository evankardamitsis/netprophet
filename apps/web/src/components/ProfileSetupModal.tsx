"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfileClaim } from "@/hooks/useProfileClaim";
import { ProfileClaimFlow } from "@/components/auth/ProfileClaimFlow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@netprophet/ui";
import { X } from "lucide-react";
import { useDictionary } from "@/context/DictionaryContext";

interface ProfileSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileSetupModal({ isOpen, onClose }: ProfileSetupModalProps) {
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
    };

    if (!isOpen || !needsProfileSetup || loading) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <Card className="w-full max-w-lg mx-auto relative shadow-2xl border-0 bg-white animate-in fade-in-0 zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>

                <CardContent className="bg-white p-6">
                    <ProfileClaimFlow
                        userId={user?.id || ""}
                        onComplete={handleComplete}
                        onSkip={handleSkip}
                        onRefresh={refreshStatus}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
