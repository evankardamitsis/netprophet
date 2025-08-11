'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MatchForm } from './MatchForm';
import { Match, Tournament } from '@/types';

interface MatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    match?: Match | null;
    tournaments: Tournament[];
    onSubmit: (data: any) => void;
}

export function MatchModal({ isOpen, onClose, match, tournaments, onSubmit }: MatchModalProps) {
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
                        {match ? 'Edit Match' : 'Create New Match'}
                    </DialogTitle>
                </DialogHeader>
                <MatchForm
                    match={match}
                    tournaments={tournaments}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                />
            </DialogContent>
        </Dialog>
    );
} 