'use client';
import { ReactNode, useState, cloneElement, createContext, useContext } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopNavigation } from '@/components/dashboard/TopNavigation';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { MatchSelectContext } from '@/context/MatchSelectContext';
import { PredictionSlip, FloatingPredictionButton } from '@/components/dashboard/PredictionSlip';
import { usePredictionSlip } from '@/context/PredictionSlipContext';
import { useTheme } from '../components/Providers';

// Add context for controlling slip collapse
const PredictionSlipCollapseContext = createContext<{ setIsPredictionSlipCollapsed: (collapsed: boolean) => void } | undefined>(undefined);
export function usePredictionSlipCollapse() {
    const ctx = useContext(PredictionSlipCollapseContext);
    if (!ctx) throw new Error('usePredictionSlipCollapse must be used within PredictionSlipCollapseContext');
    return ctx;
}

export default function ClientLayout({ children }: { children: ReactNode }) {
    const { user, signOut, loading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState<'dashboard' | 'leaderboard' | 'rewards'>('dashboard');
    const [isPredictionSlipCollapsed, setIsPredictionSlipCollapsed] = useState(false);
    const router = useRouter();
    const { predictions, removePrediction } = usePredictionSlip();
    const { theme } = useTheme();

    const handleSignOut = async () => {
        await signOut();
        window.location.href = '/';
    };

    // New: handle match selection by routing
    const handleMatchSelect = (match: any) => {
        router.push(`/dashboard/match/${match.id}`);
        setSidebarOpen(false);
    };

    // Handler to expand slip from floating button
    const handleExpandPredictionSlip = () => {
        setTimeout(() => {
            setIsPredictionSlipCollapsed(false);
        }, 100);
    };

    if (loading) return null;

    return (
        <PredictionSlipCollapseContext.Provider value={{ setIsPredictionSlipCollapsed }}>
            <MatchSelectContext.Provider value={handleMatchSelect}>
                <div className={`relative h-screen ${theme === 'dark' ? 'bg-[#181A20] text-white' : 'bg-white text-black'}`}>
                    <TopNavigation
                        userEmail={user?.email}
                        onMenuClick={() => setSidebarOpen(true)}
                        onSignOut={handleSignOut}
                    />
                    <div className="flex h-full min-h-0">
                        {/* Sidebar (desktop) */}
                        <div className="hidden xl:block h-full w-80 flex-shrink-0">
                            <Sidebar
                                onClose={() => setSidebarOpen(false)}
                            />
                        </div>
                        {/* Sidebar (mobile overlay) */}
                        {sidebarOpen && (
                            <div className="fixed inset-0 z-40 flex xl:hidden">
                                <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
                                <div className={`relative w-80 h-full ${theme === 'dark' ? 'bg-[#1F222A]' : 'bg-gray-100'} z-50 pt-[64px]`}>
                                    <Sidebar
                                        onClose={() => setSidebarOpen(false)}
                                    />
                                </div>
                            </div>
                        )}
                        {/* Main content */}
                        <div className="flex-1 flex flex-col min-w-0 h-full">
                            <div className={`flex-1 overflow-y-auto p-4 md:p-8 ${theme === 'dark' ? 'bg-[#181A20]' : 'bg-white'}`}>
                                {children}
                            </div>
                        </div>
                        {/* Global Prediction Slip (desktop) as a flex child */}
                        <div className={
                            `${theme === 'dark' ? 'bg-[#23262F] border-l border-[#2A2D38]' : 'bg-gray-100 border-l border-gray-200'}
                            xl:flex hidden
                            transition-all duration-300
                            ${isPredictionSlipCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-96 opacity-100 pointer-events-auto'}
                            mb-16
                            flex-shrink-0
                            overflow-hidden`
                        }>
                            <div className="overflow-y-auto min-h-[100px] w-full">
                                <PredictionSlip
                                    onRemovePrediction={removePrediction}
                                    onSubmitPredictions={() => { }}
                                    isCollapsed={isPredictionSlipCollapsed}
                                    onToggleCollapse={() => setIsPredictionSlipCollapsed(!isPredictionSlipCollapsed)}
                                />
                            </div>
                        </div>
                        {/* Floating Prediction Button */}
                        {typeof window !== 'undefined' && window.innerWidth >= 1280 && isPredictionSlipCollapsed && predictions.length > 0 && (
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