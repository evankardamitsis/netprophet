'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Player, fetchPlayerById, getPlayerMatchHistory, updatePlayer, uploadAthletePhoto, deleteAthletePhoto, supabase } from '@netprophet/lib';
import { useDictionary } from '@/context/DictionaryContext';
import { Card, CardContent, Button } from '@netprophet/ui';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

// Icon components
function EditIcon({ className = "h-5 w-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
    );
}

function TrashIcon({ className = "h-5 w-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );
}

export default function PlayerDetailPage() {
    // TESTING HOT RELOAD WITH NEXT.JS 15.0.3
    const params = useParams();
    const router = useRouter();
    const { dict } = useDictionary();
    const { user } = useAuth();
    const [player, setPlayer] = useState<Player | null>(null);
    const [loading, setLoading] = useState(true);
    const [matchHistory, setMatchHistory] = useState<any[]>([]);
    const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);

    const playerId = params.id as string;

    useEffect(() => {
        const loadPlayer = async () => {
            try {
                setLoading(true);

                // Use parallel data fetching - no caching
                const [fetchedPlayer, history] = await Promise.allSettled([
                    fetchPlayerById(playerId),
                    getPlayerMatchHistory(playerId)
                ]);

                // Handle player data
                if (fetchedPlayer.status === 'fulfilled') {
                    const playerData = fetchedPlayer.value;
                    setPlayer(playerData);
                    // Set photo preview if exists
                    if (playerData.photoUrl) {
                        setPhotoPreview(playerData.photoUrl);
                    }
                    // Check if user is owner or admin
                    if (user) {
                        const isOwner = playerData.claimedByUserId === user.id;
                        // Check if user is admin
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('is_admin')
                            .eq('id', user.id)
                            .single();
                        const userIsAdmin = profile?.is_admin || false;
                        setIsAdmin(userIsAdmin);
                        setIsOwnerOrAdmin(isOwner || userIsAdmin);
                    }
                } else {
                    console.error('Error loading player:', fetchedPlayer.reason);
                }

                // Handle match history
                if (history.status === 'fulfilled') {
                    // CRITICAL: Limit match history to prevent memory bloat
                    setMatchHistory(history.value.slice(0, 20));
                } else {
                    console.error('Error loading match history:', history.reason);
                }
            } catch (error) {
                console.error('Error loading player data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (playerId) {
            loadPlayer();
        }
    }, [playerId, user]);

    if (loading) {
        return (
            <div className="min-h-screen relative" style={{ backgroundColor: '#121A39' }}>
                <div className="text-center py-12">
                    <div className="inline-block p-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto" />
                    </div>
                    <p className="text-white text-lg font-bold">Loading player details...</p>
                </div>
            </div>
        );
    }

    if (!player) {
        return (
            <div className="min-h-screen relative" style={{ backgroundColor: '#121A39' }}>
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <div className="inline-block p-6 rounded-full bg-gradient-to-r from-red-500 to-pink-500 mb-4">
                            <span className="text-4xl">⚠️</span>
                        </div>
                        <div className="text-white text-lg font-bold mb-6">
                            {dict?.athletes?.athleteNotFound || 'Athlete not found'}
                        </div>
                        <button
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-lg font-bold transition-all transform hover:scale-105"
                        >
                            {dict?.common?.back || 'Go Back'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const winRate = player.wins + player.losses > 0
        ? Math.round((player.wins / (player.wins + player.losses)) * 100)
        : 0;

    const getWinRateColor = (rate: number) => {
        if (rate >= 70) return 'text-green-400';
        if (rate >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getNTRPColor = (rating: number) => {
        if (rating >= 4.5) return 'text-purple-400';
        if (rating >= 4.0) return 'text-blue-400';
        if (rating >= 3.5) return 'text-green-400';
        if (rating >= 3.0) return 'text-yellow-400';
        return 'text-orange-400';
    };

    const getSurfaceColor = (surface: string) => {
        switch (surface.toLowerCase()) {
            case 'hard':
                return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'clay':
                return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
            case 'grass':
                return 'bg-green-500/20 text-green-300 border-green-500/30';
            default:
                return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    const getSurfaceTitle = (surface: string) => {
        const surfaceLower = surface.toLowerCase().trim();
        switch (surfaceLower) {
            case 'hard':
            case 'hard court':
            case 'hardcourt':
                return 'The Hardcourt Powerhouse';
            case 'clay':
            case 'clay court':
            case 'claycourt':
                return 'The Clay Specialist';
            case 'grass':
            case 'grass court':
            case 'grasscourt':
                return 'The Green Finesse';
            default:
                return 'The Tennis Player';
        }
    };

    const getSurfaceTitleColor = (surface: string) => {
        const surfaceLower = surface.toLowerCase().trim();
        switch (surfaceLower) {
            case 'hard':
            case 'hard court':
            case 'hardcourt':
                return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
            case 'clay':
            case 'clay court':
            case 'claycourt':
                return 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
            case 'grass':
            case 'grass court':
            case 'grasscourt':
                return 'bg-green-500/20 text-green-300 border border-green-500/30';
            default:
                return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
        }
    };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !player) return;

        // Security check: Verify user is owner or admin
        if (!isOwnerOrAdmin) {
            toast.error('You do not have permission to edit this photo.');
            event.target.value = '';
            return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error(dict?.athletes?.invalidFileType || 'Invalid file type. Allowed: JPEG, PNG, WEBP');
            event.target.value = '';
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error(dict?.athletes?.fileTooLarge || 'File size exceeds 5MB limit');
            event.target.value = '';
            return;
        }

        setUploadingPhoto(true);

        try {
            // Create preview
            const previewUrl = URL.createObjectURL(file);
            setPhotoPreview(previewUrl);

            // Upload to storage
            const result = await uploadAthletePhoto(file, player.id);

            if (result.success && result.publicUrl) {
                // Update player with new photo URL
                await updatePlayer(player.id, { photoUrl: result.publicUrl });
                setPlayer(prev => prev ? { ...prev, photoUrl: result.publicUrl } : null);
                toast.success(dict?.athletes?.photoUploadSuccess || 'Photo uploaded successfully!');
            } else {
                setPhotoPreview(player.photoUrl || null);
                toast.error(result.error || (dict?.athletes?.photoUploadError || 'Failed to upload photo'));
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            setPhotoPreview(player.photoUrl || null);
            toast.error(dict?.athletes?.photoUploadError || 'Error uploading photo');
        } finally {
            setUploadingPhoto(false);
            // Reset input
            event.target.value = '';
        }
    };

    const handlePhotoDelete = async () => {
        if (!player?.photoUrl || !player.id) return;

        // Security check: Verify user is owner or admin
        if (!isOwnerOrAdmin) {
            toast.error('You do not have permission to delete this photo.');
            return;
        }

        setShowDeletePhotoModal(true);
    };

    const confirmPhotoDelete = async () => {
        if (!player?.photoUrl || !player.id) return;

        // Security check: Verify user is owner or admin
        if (!isOwnerOrAdmin) {
            toast.error('You do not have permission to delete this photo.');
            setShowDeletePhotoModal(false);
            return;
        }

        try {
            setUploadingPhoto(true);
            // Extract file path from URL
            const urlParts = player.photoUrl.split('/athlete-photos/');
            if (urlParts.length > 1) {
                const filePath = urlParts[1];
                await deleteAthletePhoto(filePath);
            }

            // Update player to remove photo URL
            await updatePlayer(player.id, { photoUrl: null });
            setPlayer(prev => prev ? { ...prev, photoUrl: null } : null);
            setPhotoPreview(null);
            setShowDeletePhotoModal(false);
            toast.success(dict?.athletes?.photoDeletedSuccess || 'Photo deleted successfully');
        } catch (error) {
            console.error('Error deleting photo:', error);
            toast.error(dict?.athletes?.photoDeleteError || 'Error deleting photo');
        } finally {
            setUploadingPhoto(false);
        }
    };

    return (
        <div className="min-h-screen relative" style={{ backgroundColor: '#121A39' }}>
            {/* Decorative circles */}
            <div className="absolute top-20 left-10 w-32 h-32 bg-purple-400 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute top-40 right-20 w-48 h-48 bg-pink-400 rounded-full opacity-15 blur-3xl"></div>
            <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-indigo-400 rounded-full opacity-20 blur-3xl"></div>

            <div className="container mx-auto px-4 py-8 relative z-10">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="mb-6 sm:mb-8 flex items-center gap-2 text-purple-300 hover:text-white transition-colors text-sm sm:text-base font-bold group"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> {dict?.common?.back || 'Back'}
                </button>

                {/* Player Header */}
                <div className="mb-8 sm:mb-12">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-3xl opacity-40 group-hover:opacity-60 blur transition"></div>
                        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-purple-500/30">
                            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-center">
                                {/* Left Side: Name and Basic Info (50% on large screens) */}
                                <div className="flex-1 lg:w-1/2 flex flex-col justify-center">
                                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 drop-shadow-lg">
                                        {player.firstName} {player.lastName}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-3 text-base sm:text-lg text-purple-200">
                                        <span className="font-bold">{player.age} {dict?.athletes?.years || 'years'}</span>
                                        <span className="text-purple-400">•</span>
                                        <span className="capitalize font-bold">{dict?.athletes?.[player.hand.toLowerCase() as 'left' | 'right'] || player.hand} {dict?.athletes?.handed || 'handed'}</span>
                                        <span className="text-purple-400">•</span>
                                        <span className={`font-black ${getNTRPColor(player.ntrpRating)} text-xl`}>
                                            NTRP {player.ntrpRating.toFixed(1)}
                                        </span>
                                    </div>

                                    {/* Upload controls if no photo exists */}
                                    {!photoPreview && isOwnerOrAdmin && (
                                        <div className="mt-4">
                                            <label
                                                htmlFor="photo-upload-web-no-photo"
                                                className="inline-block px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-bold rounded-lg cursor-pointer transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {uploadingPhoto ? (dict?.athletes?.uploading || 'Uploading...') : (dict?.athletes?.uploadPhoto || 'Upload Photo')}
                                            </label>
                                            <input
                                                id="photo-upload-web-no-photo"
                                                type="file"
                                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                                onChange={handlePhotoUpload}
                                                disabled={uploadingPhoto}
                                                className="hidden"
                                            />
                                        </div>
                                    )}

                                    {/* Surface Information Badges */}
                                    <div className="flex flex-col gap-4 mt-6">
                                        <div>
                                            <div className="text-xs text-purple-300 mb-2 font-bold">
                                                {dict?.athletes?.preferredSurface || 'Preferred Surface'}
                                            </div>
                                            <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold border shadow-lg ${getSurfaceColor(player.surfacePreference)}`}>
                                                {player.surfacePreference}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-purple-300 mb-2 font-bold">
                                                Specialization
                                            </div>
                                            <span className={`inline-block px-4 py-2 rounded-full text-sm font-black ${getSurfaceTitleColor(player.surfacePreference)} shadow-lg`}>
                                                {getSurfaceTitle(player.surfacePreference)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Hero Photo (50% on large screens) */}
                                <div className="lg:w-1/2 lg:flex-shrink-0">
                                    {photoPreview ? (
                                        <div className="relative w-full min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-xl bg-slate-800">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={photoPreview}
                                                alt={`${player.firstName} ${player.lastName}`}
                                                className="absolute inset-0 w-full h-full object-cover object-center"
                                            />
                                            {isOwnerOrAdmin && (
                                                <div className="absolute top-4 right-4 flex gap-2 z-10">
                                                    <label
                                                        htmlFor="photo-upload-web"
                                                        className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-purple-600/90 to-pink-600/90 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg cursor-pointer transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm shadow-lg"
                                                        title={uploadingPhoto ? (dict?.athletes?.uploading || 'Uploading...') : (dict?.athletes?.changePhoto || 'Change Photo')}
                                                    >
                                                        <EditIcon className="h-5 w-5" />
                                                    </label>
                                                    <input
                                                        id="photo-upload-web"
                                                        type="file"
                                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                                        onChange={handlePhotoUpload}
                                                        disabled={uploadingPhoto}
                                                        className="hidden"
                                                    />
                                                    <button
                                                        onClick={handlePhotoDelete}
                                                        disabled={uploadingPhoto}
                                                        className="w-10 h-10 flex items-center justify-center bg-red-600/90 hover:bg-red-700 text-white rounded-lg transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm shadow-lg"
                                                        title={dict?.athletes?.deletePhoto || 'Delete'}
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="relative w-full min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-2 border-purple-500/30 flex items-center justify-center">
                                            <span className="text-6xl">🎾</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
                    {/* Win Rate */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                        <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                            <CardContent className="p-4 sm:p-6 text-center">
                                <div className={`text-3xl sm:text-4xl font-black ${getWinRateColor(winRate)} mb-2 drop-shadow-lg`}>
                                    {winRate}%
                                </div>
                                <div className="text-xs sm:text-sm text-purple-300 font-bold">
                                    {dict?.athletes?.winRate || 'Win Rate'}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Record */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                        <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                            <CardContent className="p-4 sm:p-6 text-center">
                                <div className="text-3xl sm:text-4xl font-black text-white mb-2 drop-shadow-lg">
                                    {player.wins}-{player.losses}
                                </div>
                                <div className="text-xs sm:text-sm text-purple-300 font-bold">
                                    {dict?.athletes?.record || 'Record'}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Current Streak */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                        <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                            <CardContent className="p-4 sm:p-6 text-center">
                                <div className="text-3xl sm:text-4xl font-black text-white mb-2 drop-shadow-lg">
                                    {player.currentStreak} {player.streakType === 'W'
                                        ? (player.currentStreak === 1 ? (dict?.athletes?.win || 'Win') : (dict?.athletes?.wins || 'Wins'))
                                        : (player.currentStreak === 1 ? (dict?.athletes?.loss || 'Loss') : (dict?.athletes?.losses || 'Losses'))
                                    }
                                </div>
                                <div className="text-xs sm:text-sm text-purple-300 font-bold">
                                    {dict?.athletes?.currentStreak || 'Current Streak'}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Total Matches */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                        <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                            <CardContent className="p-4 sm:p-6 text-center">
                                <div className="text-3xl sm:text-4xl font-black text-white mb-2 drop-shadow-lg">
                                    {player.wins + player.losses}
                                </div>
                                <div className="text-xs sm:text-sm text-purple-300 font-bold">
                                    {dict?.athletes?.totalMatches || 'Total Matches'}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Surface Statistics */}
                <div className="mb-8 sm:mb-12">
                    <h2 className="text-2xl sm:text-3xl font-black text-white mb-6 drop-shadow-lg">
                        {dict?.athletes?.surfaceStats || 'Surface Statistics'}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Hard Court Stats */}
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                            <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-black text-white">Hard Court</h3>
                                        <div className="w-4 h-4 bg-blue-500 rounded-full shadow-lg"></div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-purple-300 font-bold">Win Rate:</span>
                                            <span className="text-white font-black">
                                                {player.hardWinRate ? `${player.hardWinRate}%` : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-purple-300 font-bold">Record:</span>
                                            <span className="text-white font-bold">
                                                {player.hardWins || 0}-{player.hardLosses || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-purple-300 font-bold">Matches:</span>
                                            <span className="text-white font-bold">
                                                {player.hardMatches || 0}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Clay Court Stats */}
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                            <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-black text-white">Clay Court</h3>
                                        <div className="w-4 h-4 bg-orange-500 rounded-full shadow-lg"></div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-purple-300 font-bold">Win Rate:</span>
                                            <span className="text-white font-black">
                                                {player.clayWinRate ? `${player.clayWinRate}%` : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-purple-300 font-bold">Record:</span>
                                            <span className="text-white font-bold">
                                                {player.clayWins || 0}-{player.clayLosses || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-purple-300 font-bold">Matches:</span>
                                            <span className="text-white font-bold">
                                                {player.clayMatches || 0}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Grass Court Stats */}
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                            <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-black text-white">Grass Court</h3>
                                        <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg"></div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-purple-300 font-bold">Win Rate:</span>
                                            <span className="text-white font-black">
                                                {player.grassWinRate ? `${player.grassWinRate}%` : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-purple-300 font-bold">Record:</span>
                                            <span className="text-white font-bold">
                                                {player.grassWins || 0}-{player.grassLosses || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-purple-300 font-bold">Matches:</span>
                                            <span className="text-white font-bold">
                                                {player.grassMatches || 0}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Detailed Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Last 5 Matches */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                        <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                            <CardContent className="p-6">
                                <h3 className="text-xl font-black text-white mb-6 drop-shadow-lg">
                                    {dict?.athletes?.last5 || 'Last 5 Matches'}
                                </h3>

                                {matchHistory.length > 0 ? (
                                    <div className="space-y-3">
                                        {matchHistory.map((match: any) => {
                                            const isPlayerA = match.player_a_id === playerId;
                                            const opponent = isPlayerA ? match.player_b : match.player_a;
                                            const opponentName = `${opponent?.first_name || ''} ${opponent?.last_name || ''}`.trim();
                                            const isWinner = match.winner_id === playerId;
                                            const matchResult = Array.isArray(match.match_results) ? match.match_results[0] : match.match_results;
                                            const score = matchResult?.set1_score ?
                                                `${matchResult.set1_score}${matchResult.set2_score ? `, ${matchResult.set2_score}` : ''}${matchResult.set3_score ? `, ${matchResult.set3_score}` : ''}` :
                                                'N/A';

                                            const tournament = Array.isArray(match.tournaments) ? match.tournaments[0] : match.tournaments;
                                            const tournamentName = tournament?.name || 'Tournament';

                                            return (
                                                <div
                                                    key={match.id}
                                                    className={`p-4 rounded-xl border-2 transition-all ${isWinner
                                                        ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50'
                                                        : 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/50'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${isWinner
                                                                ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                                                                : 'bg-gradient-to-br from-red-500 to-pink-500 text-white'
                                                                }`}>
                                                                {isWinner ? 'W' : 'L'}
                                                            </div>
                                                            <div>
                                                                <div className="text-white font-bold text-sm">
                                                                    vs {opponentName}
                                                                </div>
                                                                <div className="text-purple-300 text-xs">
                                                                    {tournamentName}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-white font-black text-sm">
                                                                {score}
                                                            </div>
                                                            <div className="text-purple-300 text-xs">
                                                                {new Date(match.start_time).toLocaleDateString('en-GB', {
                                                                    day: 'numeric',
                                                                    month: 'short'
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex gap-3 justify-center">
                                        {player.last5.map((result, idx) => (
                                            <div
                                                key={idx}
                                                className={`w-14 h-14 rounded-full text-lg font-black flex items-center justify-center shadow-lg transform hover:scale-110 transition-all ${result === 'W'
                                                    ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                                                    : 'bg-gradient-to-br from-red-500 to-pink-500 text-white'
                                                    }`}
                                            >
                                                {result}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Player Attributes */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                        <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                            <CardContent className="p-6">
                                <h3 className="text-xl font-black text-white mb-6 drop-shadow-lg">
                                    {dict?.athletes?.attributes || 'Player Attributes'}
                                </h3>
                                <div className="space-y-5">
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-purple-300 font-bold">{dict?.athletes?.aggressiveness || 'Aggressiveness'}</span>
                                            <span className="text-white font-black">{player.aggressiveness}/10</span>
                                        </div>
                                        <div className="w-full bg-slate-700/50 rounded-full h-3 shadow-inner">
                                            <div
                                                className="bg-gradient-to-r from-red-500 to-orange-500 h-3 rounded-full transition-all duration-300 shadow-lg"
                                                style={{ width: `${(player.aggressiveness / 10) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-purple-300 font-bold">{dict?.athletes?.stamina || 'Stamina'}</span>
                                            <span className="text-white font-black">{player.stamina}/10</span>
                                        </div>
                                        <div className="w-full bg-slate-700/50 rounded-full h-3 shadow-inner">
                                            <div
                                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-300 shadow-lg"
                                                style={{ width: `${(player.stamina / 10) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-purple-300 font-bold">{dict?.athletes?.consistency || 'Consistency'}</span>
                                            <span className="text-white font-black">{player.consistency}/10</span>
                                        </div>
                                        <div className="w-full bg-slate-700/50 rounded-full h-3 shadow-inner">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-300 shadow-lg"
                                                style={{ width: `${(player.consistency / 10) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Additional Info */}
                {(player.notes || player.injuryStatus !== undefined) && (
                    <div className="mt-8 sm:mt-12">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                            <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                                <CardContent className="p-6">
                                    <h3 className="text-xl font-black text-white mb-6 drop-shadow-lg">
                                        {dict?.athletes?.additionalInfo || 'Additional Information'}
                                    </h3>
                                    <div className="space-y-4">
                                        {player.notes && (
                                            <div>
                                                <div className="text-sm text-purple-300 mb-2 font-bold">
                                                    {dict?.athletes?.notes || 'Notes'}
                                                </div>
                                                <div className="text-base text-white font-bold">{player.notes}</div>
                                            </div>
                                        )}

                                        {player.injuryStatus && player.injuryStatus !== 'healthy' && (
                                            <div>
                                                <div className="text-sm text-purple-300 mb-2 font-bold">
                                                    {dict?.athletes?.injuryStatus || 'Injury Status'}
                                                </div>
                                                <div className="inline-block px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full text-sm font-bold shadow-lg">
                                                    {player.injuryStatus === 'minor' ? (dict?.athletes?.minorInjury || 'Minor Injury') : (dict?.athletes?.majorInjury || 'Major Injury')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Photo Confirmation Modal */}
            {showDeletePhotoModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-lg max-w-md w-full p-6 border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {dict?.athletes?.deletePhoto || 'Delete Photo'}
                        </h3>
                        <p className="text-gray-300 mb-6">
                            {dict?.athletes?.confirmDeletePhoto || 'Are you sure you want to delete this photo?'}
                        </p>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowDeletePhotoModal(false)}
                                variant="outline"
                                className="flex-1 border-slate-600"
                                disabled={uploadingPhoto}
                            >
                                {dict?.common?.cancel || 'Cancel'}
                            </Button>
                            <Button
                                onClick={confirmPhotoDelete}
                                disabled={uploadingPhoto}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                                {uploadingPhoto
                                    ? (dict?.athletes?.uploading || 'Deleting...')
                                    : (dict?.athletes?.deletePhoto || 'Delete')
                                }
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
