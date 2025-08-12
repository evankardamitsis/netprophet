'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MatchForm } from './MatchForm';
import { Match, Tournament } from '@/types';

interface MatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    match?: Match | null;
    tournaments: Tournament[];
    currentTournament?: Tournament | null; // For read-only tournament display
    onSubmit: (data: any) => void;
}

export function MatchModal({ isOpen, onClose, match, tournaments, currentTournament, onSubmit }: MatchModalProps) {
    const handleSubmit = (data: any): void => {
        onSubmit(data);
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!max-w-[95vw] !w-[1400px] !max-h-[95vh] overflow-y-auto sm:!max-w-[95vw]">
                <DialogHeader>
                    <DialogTitle>
                        {match ? 'Edit Match' : 'Create New Match'}
                    </DialogTitle>
                </DialogHeader>
                <MatchForm
                    match={match}
                    tournaments={tournaments}
                    currentTournament={currentTournament}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                />
            </DialogContent>
        </Dialog>
    );
} 