'use client';
import { ReactNode, useState, cloneElement, createContext, useContext, useEffect } from 'react';
import { Sidebar } from '@/components/matches/Sidebar';
import { TopNavigation } from '@/components/matches/TopNavigation';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { MatchSelectContext } from '@/context/MatchSelectContext';
import { PredictionSlip, FloatingPredictionButton } from '../components/matches/PredictionSlip';
import { usePredictionSlip } from '@/context/PredictionSlipContext';

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

// Add context for controlling slip collapse
const PredictionSlipCollapseContext = createContext<{ setIsPredictionSlipCollapsed: (collapsed: boolean) => void } | undefined>(undefined);
export function usePredictionSlipCollapse() {
    const ctx = useContext(PredictionSlipCollapseContext);
    if (!ctx) throw new Error('usePredictionSlipCollapse must be used within PredictionSlipCollapseContext');
    return ctx;
}

export default function ClientLayout({ children }: { children: ReactNode | ReactElement }) {
    const { user, signOut, loading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [currentPage, setCurrentPage] = useState<'matches' | 'leaderboard' | 'rewards'>('matches');
    const router = useRouter();
    const { predictions, removePrediction, slipCollapsed, setSlipCollapsed } = usePredictionSlip();


    const handleSignOut = async () => {
        await signOut();
        window.location.href = '/';
    };

    // New: handle match selection by routing
    const handleMatchSelect = (match: any) => {
        router.push(`/matches/match/${match.id}`);
    };

    // Handler to expand slip from floating button
    const handleExpandPredictionSlip = () => {
        setTimeout(() => {
            setSlipCollapsed?.(false);
        }, 100);
    };

    if (loading) return null;

    return (
        <PredictionSlipCollapseContext.Provider value={{ setIsPredictionSlipCollapsed: setSlipCollapsed || (() => { }) }}>
            <MatchSelectContext.Provider value={handleMatchSelect}>
                <div className="relative h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
                    <TopNavigation
                        userEmail={user?.email}
                        onMenuClick={() => setSidebarOpen(true)}
                        onSignOut={handleSignOut}
                    />
                    <div className="flex h-[calc(100vh-64px)] min-h-0 relative">
                        {/* Toggle button - always visible */}
                        <button
                            className="fixed top-16 z-50 flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 transition-all duration-300 bg-white hover:bg-gray-200"
                            style={{
                                left: window.innerWidth >= 1280 ? (sidebarOpen ? '380px' : '192px') : '0px',
                                transition: 'left 0.3s ease-in-out'
                            }}
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                        >
                            {sidebarOpen
                                ? <ChevronLeftIcon size={20} color="black" />
                                : <ChevronRightIcon size={20} color="black" />
                            }
                        </button>

                        {/* Sidebar - only visible as drawer on xl+ */}
                        <div className={`hidden xl:block fixed top-16 left-0 bottom-0 transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden ${sidebarOpen ? 'w-[400px]' : 'w-48'}`}>
                            <Sidebar
                                onClose={() => setSidebarOpen(false)}
                                sidebarOpen={sidebarOpen}
                                setSidebarOpen={setSidebarOpen}
                            />
                        </div>

                        {/* Sidebar overlay for smaller screens */}
                        <div className={`fixed inset-0 z-40 flex xl:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                            <div className="fixed inset-0 bg-black/40 transition-opacity duration-300" onClick={() => setSidebarOpen(false)} />
                            <div className={`relative w-full max-w-[320px] h-full z-50 pt-[64px] transform transition-transform duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                                <Sidebar
                                    sidebarOpen={sidebarOpen}
                                    setSidebarOpen={setSidebarOpen}
                                    onClose={() => setSidebarOpen(false)}
                                />
                            </div>
                        </div>

                        {/* Main content */}
                        <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${sidebarOpen ? 'xl:ml-[400px]' : 'xl:ml-48'} transition-all duration-300 ease-in-out`}>
                            <div className="flex-1 p-0.5 sm:p-1 md:p-2 lg:p-3 overflow-y-auto bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90">
                                {React.isValidElement(children) && 'props' in children
                                    ? React.cloneElement(children as ReactElement<any>, { sidebarOpen })
                                    : children}
                            </div>
                        </div>

                        {/* Global Prediction Slip - overlay on smaller screens, drawer on xl+ */}
                        <div className={
                            `bg-gradient-to-b from-slate-800 via-slate-900 to-slate-800 border-l border-slate-700/50 shadow-2xl
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
                                <div className="relative w-full max-w-[320px] h-full bg-gradient-to-b from-slate-800 via-slate-900 to-slate-800 z-50 pt-[64px] ml-auto overflow-hidden shadow-2xl">
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
                    </div>
                </div>
            </MatchSelectContext.Provider>
        </PredictionSlipCollapseContext.Provider>
    );
}