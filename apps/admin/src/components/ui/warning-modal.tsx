import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './alert-dialog';

interface WarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'destructive' | 'warning' | 'info';
    isLoading?: boolean;
}

export function WarningModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'destructive',
    isLoading = false,
}: WarningModalProps) {
    const getVariantStyles = () => {
        switch (variant) {
            case 'destructive':
                return {
                    actionClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
                    icon: '⚠️',
                };
            case 'warning':
                return {
                    actionClass: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
                    icon: '⚠️',
                };
            case 'info':
                return {
                    actionClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
                    icon: 'ℹ️',
                };
            default:
                return {
                    actionClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
                    icon: '⚠️',
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <span>{styles.icon}</span>
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-600">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={onClose}
                        disabled={isLoading}
                        className="transition-all duration-200 hover:bg-gray-100 hover:scale-105"
                    >
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`${styles.actionClass} transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-offset-2`}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Processing...
                            </div>
                        ) : (
                            confirmText
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
} 