'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { TournamentForm } from './TournamentForm';
import { Tournament } from '@/types';

interface TournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament?: Tournament | null;
    onSubmit: (data: any) => void;
}

export function TournamentModal({ isOpen, onClose, tournament, onSubmit }: TournamentModalProps) {
    const handleSubmit = (data: any) => {
        onSubmit(data);
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!max-w-[95vw] !w-[95vw] sm:!w-[800px] !max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl font-semibold">
                        {tournament ? 'Edit Tournament' : 'Create New Tournament'}
                    </DialogTitle>
                </DialogHeader>
                <div className="py-2 sm:py-4">
                    <TournamentForm
                        tournament={tournament}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
} 