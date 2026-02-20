'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Player, updatePlayer, uploadAthletePhoto, deleteAthletePhoto, supabase, TransactionsService } from '@netprophet/lib';
import { useDictionary } from '@/context/DictionaryContext';
import { Card, CardContent, Button } from '@netprophet/ui';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/context/WalletContext';
import CoinIcon from '@/components/CoinIcon';
import { toast } from 'sonner';
import { usePlayerData } from './hooks/usePlayerData';
import { PlayerStatsGrid, SurfaceStats, MatchHistory, DoublesSection, PlayerAttributes, AdditionalInfo, DeletePhotoModal, PlayerHeader } from './components';

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

export default function PlayerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { dict } = useDictionary();
    const { user } = useAuth();
    const { updateBalance } = useWallet();
    const playerId = params.id as string;

    const { player: playerData, matchHistory, doublesMatchHistory, loading, isOwner, isAdmin, isOwnerOrAdmin } = usePlayerData(playerId, user?.id);
    
    const [player, setPlayer] = useState<Player | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
    const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(null);
    const [croppedPhotoFile, setCroppedPhotoFile] = useState<File | null>(null);
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number; aspectRatio: number } | null>(null);
    const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);

    // Sync playerData to local state for photo updates
    useEffect(() => {
        if (playerData) {
            setPlayer(playerData);
            if (playerData.photoUrl) {
                setPhotoPreview(playerData.photoUrl);
            }
        }
    }, [playerData]);

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


    const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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

        // Load image to get dimensions and auto-crop to 4:3
        const img = new Image();
        const previewUrl = URL.createObjectURL(file);

        img.onload = async () => {
            const width = img.width;
            const height = img.height;
            const aspectRatio = width / height;
            const targetRatio = 4 / 3; // Target aspect ratio for athlete cards

            setImageDimensions({ width, height, aspectRatio });

            // Auto-crop to 4:3 aspect ratio (center crop) if needed
            if (Math.abs(aspectRatio - targetRatio) > 0.05) {
                // Only crop if significantly different from 4:3
                const croppedFile = await cropImageTo4x3(img, file);
                if (croppedFile) {
                    const croppedPreviewUrl = URL.createObjectURL(croppedFile);
                    setCroppedPhotoFile(croppedFile);
                    setPendingPhotoFile(croppedFile); // Use cropped file for upload
                    setPendingPhotoPreview(croppedPreviewUrl);

                    // Clean up original preview
                    URL.revokeObjectURL(previewUrl);

                    // Show info toast
                    toast.success('Image automatically cropped to 4:3 ratio for optimal display', { duration: 4000 });
                } else {
                    // Fallback if cropping fails
                    setPendingPhotoFile(file);
                    setPendingPhotoPreview(previewUrl);
                }
            } else {
                // Already close to 4:3, use original
                setPendingPhotoFile(file);
                setPendingPhotoPreview(previewUrl);
            }
        };

        img.onerror = () => {
            toast.error('Failed to load image. Please try another file.');
            event.target.value = '';
            URL.revokeObjectURL(previewUrl);
        };

        img.src = previewUrl;

        // Reset input
        event.target.value = '';
    };

    // Function to crop image to 4:3 aspect ratio (center crop)
    const cropImageTo4x3 = async (img: HTMLImageElement, originalFile: File): Promise<File | null> => {
        try {
            const targetRatio = 4 / 3;
            const sourceRatio = img.width / img.height;

            let cropWidth = img.width;
            let cropHeight = img.height;
            let cropX = 0;
            let cropY = 0;

            // Calculate crop dimensions to get 4:3 ratio
            if (sourceRatio > targetRatio) {
                // Image is wider than 4:3 - crop width (center horizontally)
                cropHeight = img.height;
                cropWidth = img.height * targetRatio;
                cropX = (img.width - cropWidth) / 2; // Center horizontally
                cropY = 0;
            } else {
                // Image is taller than 4:3 - crop height (center vertically)
                cropWidth = img.width;
                cropHeight = img.width / targetRatio;
                cropX = 0;
                cropY = (img.height - cropHeight) / 2; // Center vertically
            }

            // Create canvas and crop
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            // Set canvas size to target dimensions (use original resolution or scale down if too large)
            const maxDimension = 2000; // Max width/height to keep file size reasonable
            let outputWidth = cropWidth;
            let outputHeight = cropHeight;

            if (cropWidth > maxDimension || cropHeight > maxDimension) {
                const scale = Math.min(maxDimension / cropWidth, maxDimension / cropHeight);
                outputWidth = cropWidth * scale;
                outputHeight = cropHeight * scale;
            }

            canvas.width = outputWidth;
            canvas.height = outputHeight;

            // Draw cropped image
            ctx.drawImage(
                img,
                cropX, cropY, cropWidth, cropHeight, // Source crop area
                0, 0, outputWidth, outputHeight // Destination size
            );

            // Convert canvas to blob
            return new Promise<File | null>((resolve) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const fileExtension = originalFile.name.split('.').pop() || 'jpg';
                        const croppedFile = new File(
                            [blob],
                            `cropped-${Date.now()}.${fileExtension}`,
                            { type: originalFile.type }
                        );
                        resolve(croppedFile);
                    } else {
                        resolve(null);
                    }
                }, originalFile.type, 0.92); // 0.92 quality for JPEG
            });
        } catch (error) {
            console.error('Error cropping image:', error);
            return null;
        }
    };

    const handleSavePhoto = async () => {
        if (!pendingPhotoFile || !player) return;

        setUploadingPhoto(true);

        try {
            // Upload to storage
            const result = await uploadAthletePhoto(pendingPhotoFile, player.id);

            if (result.success && result.publicUrl) {
                // Check if this is the first photo upload (player had no photo before upload started)
                const hadNoPhotoBefore = !player.photoUrl;

                // Update player with new photo URL
                try {
                    const updatedPlayer = await updatePlayer(player.id, { photoUrl: result.publicUrl });
                    if (!updatedPlayer) {
                        throw new Error('Failed to update player - no data returned');
                    }
                    console.log('Player photo_url updated successfully:', updatedPlayer.photoUrl);
                    setPlayer(prev => prev ? { ...prev, photoUrl: result.publicUrl } : null);
                } catch (updateError) {
                    console.error('Error updating player photo_url:', updateError);
                    toast.error('Photo uploaded but failed to update player record. Please refresh the page.');
                    // Still update local state so user sees the photo
                    setPlayer(prev => prev ? { ...prev, photoUrl: result.publicUrl } : null);
                }

                // Update preview to show the uploaded photo
                setPhotoPreview(result.publicUrl);
                setPendingPhotoFile(null);
                setPendingPhotoPreview(null);

                // Award 10 coins for first photo upload (only to owners, not admins, and only once ever)
                if (hadNoPhotoBefore && isOwner && !isAdmin && user) {
                    // Check if user has already received this reward
                    try {
                        const transactions = await TransactionsService.getRecentTransactions(100);
                        const hasReceivedReward = transactions.some(
                            t => t.description === 'Photo upload reward' && t.amount === 10
                        );

                        if (!hasReceivedReward) {
                            updateBalance(10, 'daily_login', 'Photo upload reward');
                            toast.success('Photo uploaded! You earned 10 coins! 🎉');
                        } else {
                            toast.success(dict?.athletes?.photoUploadSuccess || 'Photo uploaded successfully!');
                        }
                    } catch (error) {
                        console.error('Error checking photo upload reward:', error);
                        // If we can't check, don't award to be safe
                        toast.success(dict?.athletes?.photoUploadSuccess || 'Photo uploaded successfully!');
                    }
                } else {
                    toast.success(dict?.athletes?.photoUploadSuccess || 'Photo uploaded successfully!');
                }
            } else {
                toast.error(result.error || (dict?.athletes?.photoUploadError || 'Failed to upload photo'));
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            toast.error(dict?.athletes?.photoUploadError || 'Error uploading photo');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleCancelPhoto = () => {
        // Clean up preview URLs
        if (pendingPhotoPreview) {
            URL.revokeObjectURL(pendingPhotoPreview);
        }
        if (croppedPhotoFile) {
            // Clean up cropped file blob URL if it exists
            setCroppedPhotoFile(null);
        }
        setPendingPhotoFile(null);
        setPendingPhotoPreview(null);
        setImageDimensions(null);
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
                {player && (
                    <PlayerHeader
                        player={player}
                        photoPreview={photoPreview}
                        pendingPhotoPreview={pendingPhotoPreview}
                        imageDimensions={imageDimensions}
                        croppedPhotoFile={croppedPhotoFile}
                        isOwnerOrAdmin={isOwnerOrAdmin}
                        isOwner={isOwner}
                        isAdmin={isAdmin}
                        uploadingPhoto={uploadingPhoto}
                        onPhotoSelect={handlePhotoSelect}
                        onPhotoDelete={handlePhotoDelete}
                        onSavePhoto={handleSavePhoto}
                        onCancelPhoto={handleCancelPhoto}
                    />
                )}

                {/* Stats Grid */}
                {player && <PlayerStatsGrid player={player} />}

                {/* Surface Statistics */}
                {player && <SurfaceStats player={player} />}

                {/* Detailed Stats */}
                {player && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <MatchHistory player={player} matches={matchHistory} />
                        <DoublesSection player={player} matches={doublesMatchHistory} />
                        <PlayerAttributes player={player} />
                    </div>
                )}

                {/* Additional Info */}
                {player && <AdditionalInfo player={player} />}
            </div>

            {/* Delete Photo Confirmation Modal */}
            <DeletePhotoModal
                isOpen={showDeletePhotoModal}
                onClose={() => setShowDeletePhotoModal(false)}
                onConfirm={confirmPhotoDelete}
                isDeleting={uploadingPhoto}
            />
        </div>
    );
}
