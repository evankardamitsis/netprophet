'use client';

import { Player } from '@netprophet/lib';
import { Button } from '@netprophet/ui';
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

    return (
        <div className="mb-8 sm:mb-12">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-3xl opacity-40 group-hover:opacity-60 blur transition"></div>
                <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-purple-500/30">
                    <div className={`flex flex-col ${(photoPreview || pendingPhotoPreview) ? 'lg:flex-row gap-6 lg:gap-8 lg:items-center' : ''}`}>
                        {/* Left Side: Name and Basic Info */}
                        <div className={`flex-1 flex flex-col justify-center ${(photoPreview || pendingPhotoPreview) ? 'lg:w-1/2' : ''}`}>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 drop-shadow-lg">
                                {player.firstName} {player.lastName}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 text-base sm:text-lg text-purple-200">
                                <span className="font-bold">{player.age} {dict?.athletes?.years || 'years'}</span>
                                {player.hand && (
                                    <>
                                        <span className="text-purple-400">•</span>
                                        <span className="capitalize font-bold">{dict?.athletes?.[player.hand.toLowerCase() as 'left' | 'right'] || player.hand} {dict?.athletes?.handed || 'handed'}</span>
                                        <span className="text-purple-400">•</span>
                                    </>
                                )}
                                {!player.hand && <span className="text-purple-400">•</span>}
                                <span className={`font-black ${getNTRPColor(player.ntrpRating)} text-xl`}>
                                    NTRP {player.ntrpRating.toFixed(1)}
                                </span>
                            </div>

                            {/* Upload controls if no photo exists */}
                            {!photoPreview && !pendingPhotoPreview && isOwnerOrAdmin && (
                                <div className="mt-4 flex items-center gap-2">
                                    <label
                                        htmlFor="photo-upload-web-no-photo"
                                        className="inline-block px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-bold rounded-lg cursor-pointer transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {dict?.athletes?.uploadPhoto || 'Upload Photo'}
                                    </label>
                                    {isOwner && !isAdmin && (
                                        <div className="flex items-center gap-1 text-yellow-400">
                                            <span className="text-sm font-bold">+10</span>
                                            <CoinIcon className="h-4 w-4" />
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

                            {/* Pending photo preview with Save/Cancel buttons */}
                            {pendingPhotoPreview && (
                                <div className="mt-4 space-y-3">
                                    {imageDimensions && (
                                        <div className="bg-slate-800/50 rounded-lg p-3 border border-purple-500/30">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                                <div className="text-sm">
                                                    <span className="text-purple-300 font-bold">Dimensions: </span>
                                                    <span className="text-white">{imageDimensions.width} × {imageDimensions.height}px</span>
                                                    {croppedPhotoFile && (
                                                        <span className="text-green-400 text-xs ml-2">(auto-cropped)</span>
                                                    )}
                                                </div>
                                                <div className="text-sm">
                                                    <span className="text-purple-300 font-bold">Aspect Ratio: </span>
                                                    <span className="text-white">{imageDimensions.aspectRatio.toFixed(2)}:1</span>
                                                    {Math.abs(imageDimensions.aspectRatio - (4 / 3)) <= 0.05 && (
                                                        <span className="text-green-400 text-xs ml-2">(4:3)</span>
                                                    )}
                                                </div>
                                            </div>
                                            {(() => {
                                                const targetRatio = 4 / 3;
                                                const ratioDifference = Math.abs(imageDimensions.aspectRatio - targetRatio) / targetRatio;
                                                const isOptimal = ratioDifference <= 0.05;

                                                if (isOptimal) {
                                                    return (
                                                        <div className="text-xs text-green-400 font-bold">
                                                            ✅ Perfect! Image automatically cropped to 4:3 ratio for optimal display on athlete cards
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <div className="text-xs text-yellow-400 font-bold">
                                                            ⚠️ For best results, use a 4:3 ratio image (e.g., 800×600, 1200×900, 1600×1200px)
                                                        </div>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    )}

                                    <div className="relative w-full max-w-md mx-auto">
                                        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border-2 border-purple-500/50 shadow-xl bg-slate-800">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={pendingPhotoPreview}
                                                alt="Preview"
                                                className="w-full h-full object-cover object-center"
                                            />
                                            {imageDimensions && Math.abs(imageDimensions.aspectRatio - (4 / 3)) <= 0.05 && (
                                                <div className="absolute top-2 right-2 bg-green-600/90 text-white text-xs px-2 py-1 rounded font-bold flex items-center gap-1">
                                                    ✓ Auto-cropped
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-purple-300 text-center mt-2">
                                            {imageDimensions && Math.abs(imageDimensions.aspectRatio - (4 / 3)) <= 0.05
                                                ? 'Image automatically cropped to 4:3 ratio - ready to upload!'
                                                : 'This is how your photo will appear on athlete cards'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button
                                            onClick={onSavePhoto}
                                            disabled={uploadingPhoto}
                                            className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {uploadingPhoto ? (dict?.athletes?.uploading || 'Uploading...') : (dict?.common?.save || 'Save')}
                                        </Button>
                                        <Button
                                            onClick={onCancelPhoto}
                                            disabled={uploadingPhoto}
                                            variant="outline"
                                            className="px-6 py-2 border-slate-600 text-slate-300 hover:bg-slate-700 font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {dict?.common?.cancel || 'Cancel'}
                                        </Button>
                                        {isOwner && !isAdmin && (
                                            <div className="flex items-center gap-1 text-yellow-400">
                                                <span className="text-sm font-bold">+10</span>
                                                <CoinIcon className="h-4 w-4" />
                                            </div>
                                        )}
                                    </div>
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

                        {/* Right Side: Hero Photo */}
                        {photoPreview && !pendingPhotoPreview && (
                            <div className="lg:w-1/2 lg:flex-shrink-0">
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
                                                title={dict?.athletes?.changePhoto || 'Change Photo'}
                                            >
                                                <EditIcon className="h-5 w-5" />
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
                                                className="w-10 h-10 flex items-center justify-center bg-red-600/90 hover:bg-red-700 text-white rounded-lg transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm shadow-lg"
                                                title={dict?.athletes?.deletePhoto || 'Delete'}
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Pending photo preview in header area */}
                        {pendingPhotoPreview && (
                            <div className="lg:w-1/2 lg:flex-shrink-0 space-y-3">
                                {imageDimensions && (
                                    <div className="bg-slate-800/80 rounded-lg p-3 border border-yellow-500/30 backdrop-blur-sm">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                            <div className="text-sm">
                                                <span className="text-yellow-300 font-bold">Dimensions: </span>
                                                <span className="text-white">{imageDimensions.width} × {imageDimensions.height}px</span>
                                                {croppedPhotoFile && (
                                                    <span className="text-green-400 text-xs ml-2">(auto-cropped)</span>
                                                )}
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-yellow-300 font-bold">Aspect Ratio: </span>
                                                <span className="text-white">{imageDimensions.aspectRatio.toFixed(2)}:1</span>
                                                {Math.abs(imageDimensions.aspectRatio - (4 / 3)) <= 0.05 && (
                                                    <span className="text-green-400 text-xs ml-2">(4:3)</span>
                                                )}
                                            </div>
                                        </div>
                                        {(() => {
                                            const targetRatio = 4 / 3;
                                            const ratioDifference = Math.abs(imageDimensions.aspectRatio - targetRatio) / targetRatio;
                                            const isOptimal = ratioDifference <= 0.05;

                                            if (isOptimal) {
                                                return (
                                                    <div className="text-xs text-green-400 font-bold">
                                                        ✅ Perfect! Image automatically cropped to 4:3 ratio for optimal display on athlete cards
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="text-xs text-yellow-400 font-bold">
                                                        ⚠️ For best results, use a 4:3 ratio image (e.g., 800×600, 1200×900, 1600×1200px)
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </div>
                                )}

                                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-yellow-500/50 shadow-xl bg-slate-800">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={pendingPhotoPreview}
                                        alt="Preview"
                                        className="absolute inset-0 w-full h-full object-cover object-center"
                                    />
                                    {imageDimensions && Math.abs(imageDimensions.aspectRatio - (4 / 3)) <= 0.05 && (
                                        <div className="absolute top-2 right-2 bg-green-600/90 text-white text-xs px-2 py-1 rounded font-bold flex items-center gap-1 z-20">
                                            ✓ Auto-cropped
                                        </div>
                                    )}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/30 backdrop-blur-sm">
                                        <p className="text-white font-bold text-lg">Preview</p>
                                        <div className="flex items-center gap-3">
                                            <Button
                                                onClick={onSavePhoto}
                                                disabled={uploadingPhoto}
                                                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                            >
                                                {uploadingPhoto ? (dict?.athletes?.uploading || 'Uploading...') : (dict?.common?.save || 'Save')}
                                            </Button>
                                            <Button
                                                onClick={onCancelPhoto}
                                                disabled={uploadingPhoto}
                                                variant="outline"
                                                className="px-6 py-3 border-slate-400 text-white hover:bg-slate-700 font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                            >
                                                {dict?.common?.cancel || 'Cancel'}
                                            </Button>
                                        </div>
                                        {isOwner && !isAdmin && (
                                            <div className="flex items-center gap-2 text-yellow-400 mt-2">
                                                <span className="text-base font-bold">Earn +10</span>
                                                <CoinIcon className="h-5 w-5" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-purple-300 text-center">
                                    This is how your photo will appear on athlete cards (4:3 aspect ratio)
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
