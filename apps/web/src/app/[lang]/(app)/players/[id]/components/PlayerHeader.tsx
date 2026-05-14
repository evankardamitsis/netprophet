'use client';

import { Player } from '@netprophet/lib';
import { useDictionary } from '@/context/DictionaryContext';
import CoinIcon from '@/components/CoinIcon';
import { EditIcon, TrashIcon } from './icons';
import { getNTRPColor, getSurfaceColor, getSurfaceTitle, getSurfaceTitleColor } from '../utils';

interface PlayerHeaderProps {
    player: Player;
    photoPreview: string | null;
    pendingPhotoPreview: string | null;
    imageDimensions: { width: number; height: number; aspectRatio: number } | null;
    croppedPhotoFile: File | null;
    isOwnerOrAdmin: boolean;
    isOwner: boolean;
    isAdmin: boolean;
    uploadingPhoto: boolean;
    onPhotoSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onPhotoDelete: () => void;
    onSavePhoto: () => void;
    onCancelPhoto: () => void;
}

export function PlayerHeader({
    player,
    photoPreview,
    pendingPhotoPreview,
    imageDimensions,
    croppedPhotoFile,
    isOwnerOrAdmin,
    isOwner,
    isAdmin,
    uploadingPhoto,
    onPhotoSelect,
    onPhotoDelete,
    onSavePhoto,
    onCancelPhoto,
}: PlayerHeaderProps) {
    const { dict } = useDictionary();

    const ntrpColor = getNTRPColor(player.ntrpRating);
    const surfaceTitle = getSurfaceTitle(player.surfacePreference);
    const surfaceTitleColor = getSurfaceTitleColor(player.surfacePreference);
    const surfaceBadgeClass = getSurfaceColor(player.surfacePreference);

    return (
        <div className="relative overflow-hidden rounded-2xl bg-[#161F35] border border-white/[0.08] mb-4">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />

            <div className={`flex flex-col ${(photoPreview || pendingPhotoPreview) ? 'lg:flex-row' : ''}`}>

                {/* Left: Info panel */}
                <div className={`p-5 flex flex-col justify-center gap-4 ${(photoPreview || pendingPhotoPreview) ? 'lg:w-1/2' : 'w-full'}`}>

                    {/* Name + NTRP */}
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                            {player.firstName} {player.lastName}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="text-[13px] text-[#94A3B8]">
                                {player.age} {dict?.athletes?.years || 'χρ.'}
                            </span>
                            {player.hand && (
                                <>
                                    <span className="text-[#263354]">·</span>
                                    <span className="text-[13px] text-[#94A3B8] capitalize">
                                        {dict?.athletes?.[player.hand.toLowerCase() as 'left' | 'right'] || player.hand} {dict?.athletes?.handed || ''}
                                    </span>
                                </>
                            )}
                            <span className="text-[#263354]">·</span>
                            <span className="text-base font-black tabular-nums" style={{ color: ntrpColor }}>
                                NTRP {player.ntrpRating.toFixed(1)}
                            </span>
                        </div>
                    </div>

                    {/* Surface badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${surfaceBadgeClass}`}>
                            {dict?.athletes?.preferredSurface || 'Προτιμώμενη Επιφάνεια'}: {player.surfacePreference}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${surfaceTitleColor}`}>
                            {surfaceTitle}
                        </span>
                    </div>

                    {/* Upload CTA (no existing photo) */}
                    {!photoPreview && !pendingPhotoPreview && isOwnerOrAdmin && (
                        <div className="flex items-center gap-3">
                            <label
                                htmlFor="photo-upload-web-no-photo"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E2A45] border border-white/[0.08] text-white text-sm font-bold cursor-pointer hover:border-white/[0.16] transition-colors"
                            >
                                📷 {dict?.athletes?.uploadPhoto || 'Ανέβασε Φωτογραφία'}
                            </label>
                            {isOwner && !isAdmin && (
                                <div className="flex items-center gap-1 text-[#FFD60A] text-sm font-bold">
                                    +10 <CoinIcon className="h-4 w-4" />
                                </div>
                            )}
                            <input
                                id="photo-upload-web-no-photo"
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={onPhotoSelect}
                                disabled={uploadingPhoto}
                                className="hidden"
                            />
                        </div>
                    )}

                    {/* Pending photo: dimensions info + save/cancel */}
                    {pendingPhotoPreview && (
                        <div className="space-y-3">
                            {imageDimensions && (
                                <div className="bg-[#0F1628] border border-white/[0.06] rounded-xl p-3 text-xs space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-[#4B5975]">Διαστάσεις</span>
                                        <span className="text-white font-bold">
                                            {imageDimensions.width} × {imageDimensions.height}px
                                            {croppedPhotoFile && <span className="text-[#00E676] ml-1">(auto-crop)</span>}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#4B5975]">Αναλογία</span>
                                        <span className="text-white font-bold">{imageDimensions.aspectRatio.toFixed(2)}:1</span>
                                    </div>
                                    {Math.abs(imageDimensions.aspectRatio - (4 / 3)) <= 0.05
                                        ? <p className="text-[#00E676] font-semibold">✓ Βέλτιστη αναλογία 4:3</p>
                                        : <p className="text-[#FFD60A] font-semibold">⚠ Συνιστάται αναλογία 4:3</p>
                                    }
                                </div>
                            )}

                            <div className="relative w-full max-w-sm mx-auto">
                                <div className="aspect-[4/3] rounded-xl overflow-hidden border border-white/[0.12] bg-[#0F1628]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={pendingPhotoPreview} alt="Preview" className="w-full h-full object-cover object-center" />
                                    {imageDimensions && Math.abs(imageDimensions.aspectRatio - (4 / 3)) <= 0.05 && (
                                        <div className="absolute top-2 right-2 bg-[#00E676]/90 text-[#080C18] text-[10px] font-black px-2 py-0.5 rounded-full">
                                            ✓ Auto-cropped
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onSavePhoto}
                                    disabled={uploadingPhoto}
                                    className="px-5 py-2.5 rounded-xl bg-[#00E676] text-[#080C18] font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00FF85] transition-colors"
                                >
                                    {uploadingPhoto ? (dict?.athletes?.uploading || 'Μεταφόρτωση...') : (dict?.common?.save || 'Αποθήκευση')}
                                </button>
                                <button
                                    onClick={onCancelPhoto}
                                    disabled={uploadingPhoto}
                                    className="px-5 py-2.5 rounded-xl bg-[#1E2A45] border border-white/[0.08] text-[#94A3B8] font-bold text-sm disabled:opacity-50 hover:border-white/[0.16] hover:text-white transition-colors"
                                >
                                    {dict?.common?.cancel || 'Ακύρωση'}
                                </button>
                                {isOwner && !isAdmin && (
                                    <div className="flex items-center gap-1 text-[#FFD60A] text-sm font-bold ml-1">
                                        +10 <CoinIcon className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Hero photo */}
                {photoPreview && !pendingPhotoPreview && (
                    <div className="lg:w-1/2 flex-shrink-0">
                        <div className="relative w-full min-h-[240px] sm:min-h-[320px] lg:min-h-[400px] overflow-hidden lg:rounded-r-2xl bg-[#0F1628]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={photoPreview}
                                alt={`${player.firstName} ${player.lastName}`}
                                className="absolute inset-0 w-full h-full object-cover object-center"
                            />
                            {isOwnerOrAdmin && (
                                <div className="absolute top-3 right-3 flex gap-2 z-10">
                                    <label
                                        htmlFor="photo-upload-web"
                                        className="w-9 h-9 flex items-center justify-center bg-[#0F1628]/80 backdrop-blur-sm border border-white/[0.12] text-white rounded-xl cursor-pointer hover:border-white/[0.24] transition-colors"
                                        title={dict?.athletes?.changePhoto || 'Αλλαγή'}
                                    >
                                        <EditIcon className="h-4 w-4" />
                                    </label>
                                    <input
                                        id="photo-upload-web"
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                        onChange={onPhotoSelect}
                                        disabled={uploadingPhoto}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={onPhotoDelete}
                                        disabled={uploadingPhoto}
                                        className="w-9 h-9 flex items-center justify-center bg-[#FF4545]/80 backdrop-blur-sm border border-[#FF4545]/30 text-white rounded-xl hover:bg-[#FF4545] transition-colors disabled:opacity-50"
                                        title={dict?.athletes?.deletePhoto || 'Διαγραφή'}
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Right: Pending photo large preview */}
                {pendingPhotoPreview && (
                    <div className="lg:w-1/2 flex-shrink-0 p-5">
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#FFD60A]/30 bg-[#0F1628]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={pendingPhotoPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover object-center" />
                            {imageDimensions && Math.abs(imageDimensions.aspectRatio - (4 / 3)) <= 0.05 && (
                                <div className="absolute top-2 right-2 bg-[#00E676]/90 text-[#080C18] text-[10px] font-black px-2 py-0.5 rounded-full z-20">
                                    ✓ Auto-cropped
                                </div>
                            )}
                        </div>
                        <p className="text-[11px] text-[#4B5975] text-center mt-2">
                            Προεπισκόπηση φωτογραφίας (αναλογία 4:3)
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
