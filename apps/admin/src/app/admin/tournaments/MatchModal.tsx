'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { MatchForm } from './MatchForm';

interface Match {
    id: string;
    player_a: string;
    player_b: string;
    tournament_id: string | null;
    category_id: string | null;
    round: string | null;
    court_number: number | null;
    status: string;
    start_time: string | null;
    lock_time: string | null;
    points_value: number;
    odds_a: number | null;
    odds_b: number | null;
}

interface Tournament {
    id: string;
    name: string;
    tournament_categories?: Array<{
        id: string;
        name: string;
    }>;
}

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