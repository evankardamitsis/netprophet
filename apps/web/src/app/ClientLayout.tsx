'use client';
import { ReactNode, useState, cloneElement, createContext, useContext, useEffect } from 'react';
import { Sidebar } from '@/components/matches/Sidebar';
import { TopNavigation } from '@/components/matches/TopNavigation';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MatchSelectContext } from '@/context/MatchSelectContext';
import { PredictionSlip, FloatingPredictionButton } from '../components/matches/PredictionSlip/index';
import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { Dictionary } from '@/types/dictionary';
import { DictionaryProvider } from '@/context/DictionaryContext';
import { LowBalanceNotification } from '@/components/matches/LowBalanceNotification';
import { SuccessModalProvider, useSuccessModal } from '@/context/SuccessModalContext';
import { BetSuccessModal } from '@/components/matches/PredictionSlip/BetSuccessModal';
import { ProfileSetupModalProvider, useProfileSetupModal } from '@/context/ProfileSetupModalContext';
import { ProfileSetupModal } from '@/components/ProfileSetupModal';
import { ProfileClaimNotification } from '@/components/ProfileClaimNotification';
import { NavigationLoader } from '@/components/NavigationLoader';
import { AppFooter } from '@/components/AppFooter';
import { InfoBar } from '@/components/InfoBar';

import React from 'react';
import type { ReactElement } from 'react';

// Inline SVG components to replace react-icons/fi
function ChevronLeftIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
    );
}

function ChevronRightIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    );
}

const PredictionSlipCollapseContext = createContext<{ setIsPredictionSlipCollapsed: (collapsed: boolean) => void }>({
    setIsPredictionSlipCollapsed: () => { }
});

export function usePredictionSlipCollapse() {
    const ctx = useContext(PredictionSlipCollapseContext);
    if (!ctx) throw new Error('usePredictionSlipCollapse must be used within PredictionSlipCollapseContext.Provider');
    return ctx;
}

interface ClientLayoutProps {
    children: ReactNode | ReactElement;
    dict?: Dictionary;
    lang?: 'en' | 'el';
}

function ClientLayoutContent({ children, dict, lang = 'en' }: ClientLayoutProps) {
    const { user, signOut, loading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState<'matches' | 'leaderboard' | 'rewards'>('matches');
    const router = useRouter();
    const { predictions, removePrediction, slipCollapsed, setSlipCollapsed } = usePredictionSlip();

    const handleSignOut = () => {
        // Immediate redirect - logout will be handled by the redirect
        window.location.href = '/';
    };

    // New: handle match selection by routing
    const handleMatchSelect = (match: any) => {
        router.push(`/${lang}/matches/match/${match.id}`);
    };

    // Handler to expand slip from floating button
    const handleExpandPredictionSlip = () => {
        setTimeout(() => {
            setSlipCollapsed?.(false);
        }, 100);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4" />
                    <p className="text-white text-lg font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <DictionaryProvider dict={dict} lang={lang}>
            <NavigationLoader />
            <PredictionSlipCollapseContext.Provider value={{ setIsPredictionSlipCollapsed: setSlipCollapsed || (() => { }) }}>
                <MatchSelectContext.Provider value={handleMatchSelect}>
                    <div className="relative h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 text-white flex flex-col overflow-hidden">
                        {/* Fantasy Ace 2026 Banner - Fixed at top */}
                        <Link
                            href={`/${lang}/tournaments/844fa43b-53c2-4116-9ba6-b41c7dd96c6b`}
                            className="relative z-[60] w-full flex-shrink-0 block bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 border-b-2 border-yellow-500 shadow-lg hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300 transition-all cursor-pointer active:scale-[0.98]"
                        >
                            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-1 md:py-2">
                                <div className="flex items-center justify-center gap-1.5 md:gap-2">
                                    <svg className="h-3 w-3 md:h-4 md:w-4 text-purple-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                    <span className="font-black text-purple-900 text-xs sm:text-sm md:text-base tracking-wide">
                                        FANTASY ACE 2026
                                    </span>
                                    <svg className="h-3 w-3 md:h-4 md:w-4 text-purple-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                        {/* InfoBar - Below banner */}
                        <div className="relative z-[60] flex-shrink-0">
                            <InfoBar lang={lang} />
                        </div>
                        {/* TopNavigation - Below InfoBar, sticky */}
                        <div className="relative z-[60] flex-shrink-0">
                            <TopNavigation
                                userEmail={user?.email}
                                onMenuClick={() => setSidebarOpen(true)}
                                onSignOut={handleSignOut}
                                dict={dict}
                                lang={lang}
                            />
                        </div>
                        {/* Main content area - flex to fill remaining space */}
                        <div className="flex flex-1 min-h-0 relative overflow-hidden">
                            {/* Toggle button - only visible on xl+ */}
                            <button
                                className="hidden xl:flex fixed top-1/2 -translate-y-1/2 z-40 items-center justify-center w-4 h-12 rounded-r-md transition-all duration-300 bg-slate-600/90 hover:bg-slate-700 backdrop-blur-sm border-r border-slate-500/60 hover:border-slate-400/70 shadow-lg hover:shadow-xl"
                                style={{
                                    left: sidebarOpen ? '400px' : '192px',
                                    transition: 'left 0.3s ease-in-out'
                                }}
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                            >
                                {sidebarOpen
                                    ? <ChevronLeftIcon size={12} color="white" />
                                    : <ChevronRightIcon size={12} color="white" />
                                }
                            </button>

                            {/* Sidebar - only visible on xl+, positioned after TopNavigation */}
                            <div className={`hidden xl:block fixed top-[112px] left-0 bottom-0 transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden ${sidebarOpen ? 'w-[400px]' : 'w-48'}`}>
                                <Sidebar
                                    onClose={() => setSidebarOpen(false)}
                                    sidebarOpen={sidebarOpen}
                                    setSidebarOpen={setSidebarOpen}
                                    dict={dict}
                                    lang={lang}
                                />
                            </div>

                            {/* Main content */}
                            <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${sidebarOpen ? 'xl:ml-[400px]' : 'xl:ml-48'} transition-all duration-300 ease-in-out relative z-10`}>
                                <div className="flex-1 p-0 overflow-y-auto bg-gradient-to-br from-slate-950/90 via-blue-950/80 to-purple-950/90 backdrop-blur-sm pb-4 md:pb-0">
                                    {children}
                                    {/* Bottom spacing for mobile to ensure footer/content isn't clipped */}
                                    <div className="h-4 md:hidden" aria-hidden="true" />
                                </div>
                                <AppFooter lang={lang} />
                            </div>

                            {/* Global Prediction Slip - overlay on smaller screens, drawer on xl+ */}
                            <div className={
                                `bg-gradient-to-b from-slate-900 via-blue-950 to-purple-950 border-l border-blue-700/50 shadow-2xl
                                xl:flex hidden
                                transition-all duration-300
                                ${slipCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-96 opacity-100 pointer-events-auto'}
                                flex-shrink-0
                                overflow-hidden`
                            }>
                                <div className="overflow-y-auto h-full w-full">
                                    <PredictionSlip
                                        onRemovePrediction={removePrediction}
                                        onSubmitPredictions={() => { }}
                                        isCollapsed={slipCollapsed}
                                        onToggleCollapse={() => setSlipCollapsed?.(!slipCollapsed)}
                                    />
                                </div>
                            </div>

                            {/* Prediction Slip overlay for smaller screens - positioned on the right */}
                            {!slipCollapsed && (
                                <div className="fixed inset-0 z-40 flex xl:hidden">
                                    <div className="fixed inset-0 bg-black/40" onClick={() => setSlipCollapsed?.(true)} />
                                    <div className="relative w-full max-w-[320px] h-full bg-gradient-to-b from-slate-900 via-blue-950 to-purple-950 z-50 pt-[64px] ml-auto overflow-hidden shadow-2xl">
                                        <div className="overflow-y-auto h-full w-full">
                                            <PredictionSlip
                                                onRemovePrediction={removePrediction}
                                                onSubmitPredictions={() => { }}
                                                isCollapsed={slipCollapsed}
                                                onToggleCollapse={() => setSlipCollapsed?.(!slipCollapsed)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Floating Prediction Button */}
                            {slipCollapsed && predictions.length > 0 && (
                                <FloatingPredictionButton
                                    predictions={predictions}
                                    onClick={handleExpandPredictionSlip}
                                />
                            )}

                            {/* Global Low Balance Notification */}
                            <LowBalanceNotification lang={lang} />

                            {/* Success Modal */}
                            <SuccessModalContent lang={lang} />

                            {/* Profile Setup Modal */}
                            <ProfileSetupModalContent />

                            {/* Profile Claim Notification */}
                            <ProfileClaimNotification />
                        </div>
                    </div>
                </MatchSelectContext.Provider>
            </PredictionSlipCollapseContext.Provider>
        </DictionaryProvider>
    );
}

function SuccessModalContent({ lang }: { lang: string }) {
    const { showSuccessModal, setShowSuccessModal } = useSuccessModal();

    return (
        <BetSuccessModal
            isOpen={showSuccessModal}
            onClose={() => setShowSuccessModal(false)}
            lang={lang}
        />
    );
}

function ProfileSetupModalContent() {
    const { showProfileSetup, setShowProfileSetup, profileRefreshKey } = useProfileSetupModal();

    return (
        <ProfileSetupModal
            isOpen={showProfileSetup}
            onClose={() => setShowProfileSetup(false)}
            forceRefresh={profileRefreshKey}
        />
    );
}

export default function ClientLayout({ children, dict, lang = 'el' }: ClientLayoutProps) {
    return (
        <SuccessModalProvider>
            <ProfileSetupModalProvider>
                <ClientLayoutContent dict={dict} lang={lang}>
                    {children}
                </ClientLayoutContent>
            </ProfileSetupModalProvider>
        </SuccessModalProvider>
    );
}