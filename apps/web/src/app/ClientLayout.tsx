'use client';
import { ReactNode, useState, cloneElement, createContext, useContext, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopNavigation } from '@/components/dashboard/TopNavigation';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { MatchSelectContext } from '@/context/MatchSelectContext';
import { PredictionSlip, FloatingPredictionButton } from '@/components/dashboard/PredictionSlip';
import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { useTheme } from '../components/Providers';
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
    const [currentPage, setCurrentPage] = useState<'dashboard' | 'leaderboard' | 'rewards'>('dashboard');
    const router = useRouter();
    const { predictions, removePrediction, slipCollapsed, setSlipCollapsed } = usePredictionSlip();
    const { theme } = useTheme();

    const handleSignOut = async () => {
        await signOut();
        window.location.href = '/';
    };

    // New: handle match selection by routing
    const handleMatchSelect = (match: any) => {
        router.push(`/dashboard/match/${match.id}`);
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
                <div className={`relative h-screen ${theme === 'dark' ? 'bg-[#181A20] text-white' : 'bg-white text-black'}`}>
                    <TopNavigation
                        userEmail={user?.email}
                        onMenuClick={() => setSidebarOpen(true)}
                        onSignOut={handleSignOut}
                    />
                    <div className="flex h-full min-h-0">
                        {/* Toggle button - always visible */}
                        <button
                            className={`fixed top-16 z-50 flex items-center justify-center w-8 h-8 rounded-full shadow-lg border border-gray-300 transition-colors duration-300
                                ${theme === 'dark' ? 'bg-white hover:bg-gray-200' : 'bg-black hover:bg-gray-800'}`}
                            style={{
                                left: window.innerWidth >= 1280 ? (sidebarOpen ? '450px' : '192px') : '0px',
                                transition: 'left 0.3s'
                            }}
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                        >
                            {sidebarOpen
                                ? <ChevronLeftIcon size={20} color={theme === 'dark' ? 'black' : 'white'} />
                                : <ChevronRightIcon size={20} color={theme === 'dark' ? 'black' : 'white'} />
                            }
                        </button>

                        {/* Sidebar - only visible as drawer on xl+ */}
                        <div className={`hidden xl:block h-full transition-all duration-300 flex-shrink-0 ${sidebarOpen ? 'w-[450px]' : 'w-48'}`}>
                            <Sidebar
                                onClose={() => setSidebarOpen(false)}
                                sidebarOpen={sidebarOpen}
                                setSidebarOpen={setSidebarOpen}
                            />
                        </div>

                        {/* Sidebar overlay for smaller screens */}
                        <div className={`fixed inset-0 z-40 flex xl:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                            <div className="fixed inset-0 bg-black/40 transition-opacity duration-300" onClick={() => setSidebarOpen(false)} />
                            <div className={`relative w-full max-w-[320px] h-full z-50 pt-[64px] transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                                <Sidebar
                                    sidebarOpen={sidebarOpen}
                                    setSidebarOpen={setSidebarOpen}
                                    onClose={() => setSidebarOpen(false)}
                                />
                            </div>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 flex flex-col min-w-0 h-full">
                            <div className={`flex-1 overflow-y-auto p-4 md:p-8 ${theme === 'dark' ? 'bg-[#181A20]' : 'bg-white'}`}>
                                {React.isValidElement(children) && 'props' in children
                                    ? React.cloneElement(children as ReactElement<any>, { sidebarOpen })
                                    : children}
                            </div>
                        </div>

                        {/* Global Prediction Slip - overlay on smaller screens, drawer on xl+ */}
                        <div className={
                            `${theme === 'dark' ? 'bg-[#23262F] border-l border-[#2A2D38]' : 'bg-gray-100 border-l border-gray-200'}
                            xl:flex hidden
                            transition-all duration-300
                            ${slipCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-96 opacity-100 pointer-events-auto'}
                            mb-16
                            flex-shrink-0
                            overflow-hidden`
                        }>
                            <div className="overflow-y-auto min-h-[100px] w-full">
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
                                <div className={`relative w-full max-w-[320px] h-full ${theme === 'dark' ? 'bg-[#23262F]' : 'bg-gray-100'} z-50 pt-[64px] ml-auto`}>
                                    <div className="overflow-y-auto min-h-[100px] w-full h-full">
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