'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardTitle, Button, Badge, CardHeader } from '@netprophet/ui';
import { useAuth } from '@/hooks/useAuth';
import { TopNavigation } from '@/components/matches/TopNavigation';
import { useDictionary } from '@/context/DictionaryContext';
import { BetsService, supabase } from '@netprophet/lib';

// Prevent static generation for this page
export const dynamic = 'force-dynamic';
import { useWallet } from '@/context/WalletContext';
import { ProfileSetupModal } from '@/components/ProfileSetupModal';
import { useProfileClaim } from '@/hooks/useProfileClaim';
import { toast } from 'sonner';
import CoinIcon from '@/components/CoinIcon';
import { useTawkToChat } from '@/context/TawkToChatContext';

export default function MyProfilePage() {
    const router = useRouter();
    const params = useParams();
    const lang = params?.lang;
    const { user, signOut, loading } = useAuth();
    const { dict } = useDictionary();
    const { wallet } = useWallet();
    const { refreshStatus } = useProfileClaim(user?.id || null);
    const [profileStats, setProfileStats] = useState({
        totalCoins: 0,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        dailyStreak: 0,
        totalBets: 0,
        ranking: 0
    });
    const [loadingStats, setLoadingStats] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showProfileSetup, setShowProfileSetup] = useState(false);
    const [hasPlayerProfile, setHasPlayerProfile] = useState(false);
    const [claimedPlayerId, setClaimedPlayerId] = useState<string | null>(null);
    const [profileRefreshKey, setProfileRefreshKey] = useState(0); // Add this to force refresh
    const [username, setUsername] = useState('');
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [savingUsername, setSavingUsername] = useState(false);
    const [removingProfile, setRemovingProfile] = useState(false);
    const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
    const { showChat } = useTawkToChat();

    // Check if user is admin and has player profile
    const checkUserStatus = useCallback(async () => {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin, claimed_player_id, profile_claim_status, username')
                .eq('id', user?.id || '')
                .single();

            setIsAdmin(profile?.is_admin || false);
            setHasPlayerProfile(!!profile?.claimed_player_id || profile?.profile_claim_status === 'claimed');
            setClaimedPlayerId(profile?.claimed_player_id || null);
            setUsername(profile?.username || '');
        } catch (err) {
            console.error('Failed to check user status:', err);
            setIsAdmin(false);
            setHasPlayerProfile(false);
            setClaimedPlayerId(null);
            setUsername('');
        }
    }, [user?.id]);

    // Load profile statistics
    const loadProfileStats = useCallback(async () => {
        try {
            setLoadingStats(true);
            setError(null);

            // Ensure user is authenticated
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Use wallet data for statistics (more accurate and already filtered)
            const totalCoins = wallet.totalWinnings || 0;
            const totalWins = wallet.wonBets || 0;
            const totalLosses = wallet.lostBets || 0;
            const totalBets = wallet.totalBets || 0;
            const winRate = totalBets > 0 ? Math.round((totalWins / totalBets) * 100) : 0;
            const dailyStreak = wallet.dailyLoginStreak || 0;

            setProfileStats({
                totalCoins,
                totalWins,
                totalLosses,
                winRate,
                dailyStreak,
                totalBets,
                ranking: 0 // Ranking feature to be implemented in future release
            });
        } catch (err) {
            console.error('Failed to load profile stats:', err);
            setError('Failed to load profile statistics');
        } finally {
            setLoadingStats(false);
        }
    }, [user, wallet]);

    useEffect(() => {
        if (!loading && !user) {
            router.push(`/${lang}/auth/signin`);
        } else if (user && !loading) {
            // Wait for wallet data to be loaded before showing stats
            if (wallet.totalBets !== undefined) {
                loadProfileStats();
            }
            checkUserStatus();
        }
    }, [user, loading, router, lang, loadProfileStats, checkUserStatus, wallet]);

    const handleSignOut = async () => {
        await signOut();
        router.push(`/${lang}`);
    };

    const handleStartPlayerSetup = async () => {
        try {
            // Reset user's profile claim status from 'skipped' to 'pending'
            // This allows them to go through the full flow again
            const { error } = await supabase
                .from('profiles')
                .update({
                    profile_claim_status: 'pending',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user?.id);

            if (error) {
                console.error('Error resetting profile claim status:', error);
            }

            // Refresh the profile claim status
            if (refreshStatus) {
                refreshStatus();
            }

            // Force ProfileClaimFlow to re-check for matching players
            setProfileRefreshKey(prev => prev + 1);

            // Open the modal
            setShowProfileSetup(true);
        } catch (err) {
            console.error('Error starting player setup:', err);
            // Still open the modal even if there's an error
            setShowProfileSetup(true);
        }
    };

    const handleRemovePlayerProfile = async () => {
        if (!user?.id || !claimedPlayerId) return;

        setRemovingProfile(true);
        setShowRemoveConfirmation(false);
        try {
            // Update profile to remove player claim
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    claimed_player_id: null,
                    profile_claim_status: 'skipped',
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // Update player to set back to hidden/unclaimed
            const { error: playerError } = await supabase
                .from('players')
                .update({
                    claimed_by_user_id: null,
                    is_hidden: true,
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', claimedPlayerId);

            if (playerError) throw playerError;

            // Update local state
            setHasPlayerProfile(false);
            setClaimedPlayerId(null);

            toast.success(lang === 'el'
                ? 'Το προφίλ παίκτη αφαιρέθηκε επιτυχώς'
                : 'Player profile removed successfully');

            // Refresh status
            if (refreshStatus) {
                refreshStatus();
            }
        } catch (err: any) {
            console.error('Error removing player profile:', err);
            toast.error(lang === 'el'
                ? 'Αποτυχία αφαίρεσης προφίλ παίκτη'
                : 'Failed to remove player profile');
        } finally {
            setRemovingProfile(false);
        }
    };

    const handleSaveUsername = async () => {
        if (!user?.id) return;

        // Validate username
        if (!username.trim()) {
            return;
        }

        if (username.length < 3 || username.length > 20) {
            toast.error(lang === 'el'
                ? 'Το όνομα χρήστη πρέπει να είναι 3-20 χαρακτήρες'
                : 'Username must be 3-20 characters');
            return;
        }

        setSavingUsername(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    username: username.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            setIsEditingUsername(false);
            // Show success message
            toast.success(lang === 'el'
                ? 'Το όνομα χρήστη ενημερώθηκε επιτυχώς!'
                : 'Username updated successfully!');
        } catch (err: any) {
            console.error('Error updating username:', err);
            const errorMsg = lang === 'el'
                ? 'Αποτυχία ενημέρωσης ονόματος χρήστη'
                : 'Failed to update username';
            toast.error(errorMsg + (err?.message ? `: ${err.message}` : ''));
        } finally {
            setSavingUsername(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Back to Dashboard Button */}
            <div className="max-w-6xl mx-auto px-6 pt-6">
                <Button
                    variant="outline"
                    onClick={() => router.push(`/${lang}/matches`)}
                    className="mb-6 bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                >
                    {dict?.navigation?.backToMatches || '← Back to Matches'}
                </Button>
            </div>

            {/* Content Area */}
            <div className="max-w-6xl mx-auto px-6 pb-6">
                {/* Page Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-4">
                        {dict?.profile?.title || 'My Profile'}
                    </h1>
                    <p className="text-gray-300 max-w-2xl mx-auto">
                        {dict?.profile?.subtitle || 'Manage your account information and settings.'}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Profile Information */}
                    <Card className="bg-slate-800 border border-slate-700 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-white">
                                {dict?.profile?.profileInformation || 'Profile Information'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
                                    <span className="text-2xl text-white font-bold">
                                        {user.email?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{dict?.profile?.netProphetUser || 'NetProphet User'}</h3>
                                    <p className="text-gray-300">{user.email}</p>
                                    <div className="flex gap-2 mt-1">
                                        <Badge variant="secondary" className="bg-green-600 text-white">
                                            {dict?.profile?.activeMember || 'Active Member'}
                                        </Badge>
                                        {isAdmin && (
                                            <Badge variant="secondary" className="bg-purple-600 text-white">
                                                {dict?.profile?.admin || 'Admin'}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-slate-600">
                                    <span className="text-gray-300">{dict?.profile?.email || 'Email'}:</span>
                                    <span className="font-medium text-white">{user.email}</span>
                                </div>
                                <div className="py-2 border-b border-slate-600">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-300">{lang === 'el' ? 'Όνομα χρήστη:' : 'Username:'}</span>
                                        {!isEditingUsername ? (
                                            <div className="flex items-center space-x-2">
                                                <span className="font-medium text-white">
                                                    {username || (lang === 'el' ? 'Μη ορισμένο' : 'Not set')}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setIsEditingUsername(true)}
                                                    className="text-blue-400 hover:text-blue-300 h-7 px-2"
                                                >
                                                    ✏️
                                                </Button>
                                            </div>
                                        ) : null}
                                    </div>
                                    {isEditingUsername && (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                placeholder={lang === 'el' ? 'Εισάγετε όνομα χρήστη' : 'Enter username'}
                                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                                maxLength={20}
                                            />
                                            <p className="text-xs text-gray-400">
                                                {lang === 'el'
                                                    ? '3-20 χαρακτήρες • Εμφανίζεται στον πίνακα κατάταξης'
                                                    : '3-20 characters • Displayed on leaderboard'}
                                            </p>
                                            <div className="flex space-x-2">
                                                <Button
                                                    size="sm"
                                                    onClick={handleSaveUsername}
                                                    disabled={savingUsername || !username.trim() || username.length < 3}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    {savingUsername ? (lang === 'el' ? 'Αποθήκευση...' : 'Saving...') : (lang === 'el' ? 'Αποθήκευση' : 'Save')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setIsEditingUsername(false);
                                                        checkUserStatus(); // Reload original username
                                                    }}
                                                    className="border-slate-600"
                                                >
                                                    {lang === 'el' ? 'Ακύρωση' : 'Cancel'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-600">
                                    <span className="text-gray-300">{dict?.profile?.memberSince || 'Member since'}:</span>
                                    <span className="font-medium text-white">
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', {
                                            month: 'long',
                                            year: 'numeric'
                                        }) : 'January 2024'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-gray-300">{dict?.profile?.status || 'Status'}:</span>
                                    <Badge variant="default" className="bg-green-600 text-white">
                                        {dict?.profile?.verified || 'Verified'}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Statistics */}
                    <Card className="bg-slate-800 border border-slate-700 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-white">
                                {dict?.profile?.statistics || 'Statistics'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loadingStats ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4" />
                                    <p className="text-gray-300">{dict?.profile?.loadingStatistics || 'Loading statistics...'}</p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-8">
                                    <p className="text-red-400 mb-4">{error}</p>
                                    <Button onClick={loadProfileStats} variant="outline" className="border-slate-600 text-gray-300">
                                        {dict?.profile?.tryAgain || 'Try Again'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-4 bg-slate-700 rounded-lg border border-slate-600">
                                        <div className="text-2xl font-bold text-purple-400 flex items-center justify-center gap-2">{profileStats.totalCoins.toLocaleString()} <CoinIcon size={24} /></div>
                                        <div className="text-sm text-gray-300">{dict?.profile?.totalWinnings || 'Total Winnings'}</div>
                                    </div>
                                    <div className="text-center p-4 bg-slate-700 rounded-lg border border-slate-600">
                                        <div className="text-2xl font-bold text-green-400">{profileStats.totalWins}</div>
                                        <div className="text-sm text-gray-300">{lang === 'el' ? 'Σωστές Προβλέψεις' : 'Correct Predictions'}</div>
                                    </div>
                                    <div className="text-center p-4 bg-slate-700 rounded-lg border border-slate-600">
                                        <div className="text-2xl font-bold text-red-400">{profileStats.totalLosses}</div>
                                        <div className="text-sm text-gray-300">{lang === 'el' ? 'Λάθος Προβλέψεις' : 'Wrong Predictions'}</div>
                                    </div>
                                    <div className="text-center p-4 bg-slate-700 rounded-lg border border-slate-600">
                                        <div className="text-2xl font-bold text-blue-400">{profileStats.winRate}%</div>
                                        <div className="text-sm text-gray-300">{lang === 'el' ? 'Ακρίβεια Προβλέψεων' : 'Prediction Accuracy'}</div>
                                    </div>
                                    <div className="text-center p-4 bg-slate-700 rounded-lg border border-slate-600">
                                        <div className="text-2xl font-bold text-yellow-400">{profileStats.dailyStreak}</div>
                                        <div className="text-sm text-gray-300">{dict?.profile?.dailyStreak || 'Daily Streak'}</div>
                                    </div>
                                    <div className="text-center p-4 bg-slate-700 rounded-lg border border-slate-600">
                                        <div className="text-2xl font-bold text-cyan-400">{profileStats.totalBets}</div>
                                        <div className="text-sm text-gray-300">{dict?.profile?.totalBets || 'Total Predictions'}</div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Player Profile Section */}
                    {!hasPlayerProfile ? (
                        <Card className="bg-slate-800 border border-slate-700 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-xl font-semibold text-white">
                                    {(dict as any)?.profile?.becomePlayer || 'Become a Player'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-4 border border-purple-500/30">
                                    <div className="flex items-center space-x-3 mb-3">
                                        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-lg">🎾</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">{(dict as any)?.profile?.playerBenefits || 'Player Benefits'}</h3>
                                            <p className="text-sm text-gray-300">{(dict as any)?.profile?.playerBenefitsDesc || 'Join as a tennis player'}</p>
                                        </div>
                                    </div>
                                    <ul className="text-sm text-gray-300 space-y-1 mb-4">
                                        <li>• {(dict as any)?.profile?.participateTournaments || 'Participate in tournaments'}</li>
                                        <li>• {(dict as any)?.profile?.competeMatches || 'Compete in matches'}</li>
                                        <li>• {(dict as any)?.profile?.earnRewards || 'Earn rewards and prizes'}</li>
                                        <li>• {(dict as any)?.profile?.trackStats || 'Track your performance statistics'}</li>
                                    </ul>
                                    <Button
                                        onClick={handleStartPlayerSetup}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                    >
                                        {(dict as any)?.profile?.startPlayerSetup || 'Start Player Setup'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-slate-800 border border-slate-700 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-xl font-semibold text-white">
                                    {(dict as any)?.profile?.playerProfile || 'Player Profile'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-green-600/20 rounded-lg p-4 border border-green-500/30">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-lg">✓</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">{(dict as any)?.profile?.playerActive || 'Player Profile Active'}</h3>
                                            <p className="text-sm text-gray-300">{(dict as any)?.profile?.playerActiveDesc || 'You are registered as a tennis player'}</p>
                                        </div>
                                    </div>
                                    {claimedPlayerId && (
                                        <div className="space-y-3">
                                            <Link
                                                href={`/${lang}/players/${claimedPlayerId}`}
                                                className="block w-full"
                                            >
                                                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                                                    {(dict as any)?.profileSetup?.success?.viewPlayerProfile || 'View My Player Profile'}
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowRemoveConfirmation(true)}
                                                disabled={removingProfile}
                                                className="w-full border-red-500 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                                            >
                                                {lang === 'el' ? 'Αφαίρεση Προφίλ Παίκτη' : 'Remove Player Profile'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Account Actions */}
                    <Card className="bg-slate-800 border border-slate-700 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-white">
                                {dict?.profile?.accountActions || 'Account Actions'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start border-slate-600 text-gray-300 hover:bg-slate-700"
                                    onClick={() => router.push(`/${lang}/my-picks`)}
                                >
                                    <span className="mr-2">📊</span>
                                    {dict?.profile?.viewMyPicks || 'View My Picks'}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start border-slate-600 text-gray-300 hover:bg-slate-700"
                                    onClick={showChat}
                                >
                                    <span className="mr-2">📧</span>
                                    {dict?.profile?.contactSupport || 'Contact Support'}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start border-slate-600 text-gray-300 hover:bg-slate-700"
                                >
                                    <span className="mr-2">📖</span>
                                    {dict?.profile?.helpAndFaq || 'Help & FAQ'}
                                </Button>
                                <div className="border-t border-slate-600 pt-3">
                                    <Button
                                        variant="destructive"
                                        className="w-full justify-start"
                                        onClick={handleSignOut}
                                    >
                                        <span className="mr-2">🚪</span>
                                        {dict?.profile?.signOut || 'Sign Out'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Profile Setup Modal */}
            <ProfileSetupModal
                isOpen={showProfileSetup}
                onClose={() => setShowProfileSetup(false)}
                forceRefresh={profileRefreshKey}
            />

            {/* Remove Player Profile Confirmation Modal */}
            {showRemoveConfirmation && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-lg max-w-md w-full p-6 border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {lang === 'el' ? 'Αφαίρεση Προφίλ Παίκτη' : 'Remove Player Profile'}
                        </h3>
                        <p className="text-gray-300 mb-6">
                            {lang === 'el'
                                ? 'Είστε σίγουροι ότι θέλετε να αφαιρέσετε το προφίλ παίκτη σας; Το προφίλ θα γίνει ανενεργό και μπορείτε να το διεκδικήσετε ξανά αργότερα.'
                                : 'Are you sure you want to remove your player profile? The profile will be set to inactive and you can claim it again later.'
                            }
                        </p>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowRemoveConfirmation(false)}
                                variant="outline"
                                className="flex-1 border-slate-600"
                                disabled={removingProfile}
                            >
                                {lang === 'el' ? 'Ακύρωση' : 'Cancel'}
                            </Button>
                            <Button
                                onClick={handleRemovePlayerProfile}
                                disabled={removingProfile}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                                {removingProfile
                                    ? (lang === 'el' ? 'Αφαίρεση...' : 'Removing...')
                                    : (lang === 'el' ? 'Αφαίρεση' : 'Remove')
                                }
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 