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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {tournament ? 'Edit Tournament' : 'Create New Tournament'}
                    </DialogTitle>
                </DialogHeader>
                <TournamentForm
                    tournament={tournament}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                />
            </DialogContent>
        </Dialog>
    );
} 