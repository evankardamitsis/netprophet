'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { CategoryForm } from './CategoryForm';
import { Category } from '@/types';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    category?: Category | null;
    onSubmit: (data: any) => void;
}

export function CategoryModal({ isOpen, onClose, category, onSubmit }: CategoryModalProps) {
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
                        {category ? 'Edit Category' : 'Create New Category'}
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <CategoryForm
                        category={category}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
} 