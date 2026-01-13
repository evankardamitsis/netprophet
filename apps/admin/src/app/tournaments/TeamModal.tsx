'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { TeamForm } from './TeamForm';
import { Team } from '@/types';

interface TeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournamentId: string;
    team?: Team | null;
    onSubmit: (data: any) => void;
}

export function TeamModal({ isOpen, onClose, tournamentId, team, onSubmit }: TeamModalProps) {
    const handleSubmit = (data: any) => {
        onSubmit(data);
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!max-w-[95vw] !w-[800px] !max-h-[95vh] overflow-y-auto sm:!max-w-[95vw]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                        {team ? 'Edit Team' : 'Create New Team'}
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <TeamForm
                        team={team}
                        tournamentId={tournamentId}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
