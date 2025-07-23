'use client';
import { ReactNode, useState, cloneElement } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopNavigation } from '@/components/dashboard/TopNavigation';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { MatchSelectContext } from '@/context/MatchSelectContext';
import { PredictionSlip, FloatingPredictionButton } from '@/components/dashboard/PredictionSlip';
import { usePredictionSlip } from '@/context/PredictionSlipContext';

export default function ClientLayout({ children }: { children: ReactNode }) {
    const { user, signOut, loading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState<'dashboard' | 'leaderboard' | 'rewards'>('dashboard');
    const [isPredictionSlipCollapsed, setIsPredictionSlipCollapsed] = useState(false);
    const router = useRouter();
    const { predictions } = usePredictionSlip();

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
        <MatchSelectContext.Provider value={handleMatchSelect}>
            <div className="relative h-screen">
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
                            <div className="relative w-80 h-full bg-[#1F222A] z-50 pt-[64px]">
                                <Sidebar
                                    onClose={() => setSidebarOpen(false)}
                                />
                            </div>
                        </div>
                    )}
                    {/* Main content */}
                    <div className="flex-1 flex flex-col min-w-0 h-full">
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#181A20]">
                            {children}
                        </div>
                    </div>
                    {/* Global Prediction Slip (desktop) */}
                    <GlobalPredictionSlip
                        isCollapsed={isPredictionSlipCollapsed}
                        onToggleCollapse={() => setIsPredictionSlipCollapsed(!isPredictionSlipCollapsed)}
                    />
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
    );
}

// Global slip component
function GlobalPredictionSlip({ isCollapsed, onToggleCollapse }: { isCollapsed: boolean, onToggleCollapse: () => void }) {
    const { predictions, removePrediction } = usePredictionSlip();
    // You can add more handlers as needed
    if (typeof window !== 'undefined' && window.innerWidth < 1280) return null; // Hide on mobile
    return (
        <div className={`bg-[#23262F] border-l border-[#2A2D38] hidden xl:block transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0' : 'w-96'}`}>
            <div className="h-full overflow-y-auto">
                <PredictionSlip
                    onRemovePrediction={removePrediction}
                    onSubmitPredictions={() => { }}
                    isCollapsed={isCollapsed}
                    onToggleCollapse={onToggleCollapse}
                />
            </div>
        </div>
    );
} 