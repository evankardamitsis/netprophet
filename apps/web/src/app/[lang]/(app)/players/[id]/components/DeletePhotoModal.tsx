'use client';

import { Button } from '@netprophet/ui';
import { useDictionary } from '@/context/DictionaryContext';

interface DeletePhotoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

export function DeletePhotoModal({ isOpen, onClose, onConfirm, isDeleting }: DeletePhotoModalProps) {
    const { dict } = useDictionary();

    if (!isOpen) return null;

    return (
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
                        onClick={onClose}
                        variant="outline"
                        className="flex-1 border-slate-600"
                        disabled={isDeleting}
                    >
                        {dict?.common?.cancel || 'Cancel'}
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                        {isDeleting
                            ? (dict?.athletes?.uploading || 'Deleting...')
                            : (dict?.athletes?.deletePhoto || 'Delete')
                        }
                    </Button>
                </div>
            </div>
        </div>
    );
}
