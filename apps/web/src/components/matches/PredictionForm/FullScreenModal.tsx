'use client';

import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { cloneElement, isValidElement } from 'react';
import { useDictionary } from '@/context/DictionaryContext';

interface FullScreenModalProps {
    isOpen: boolean;
    mounted: boolean;
    children: React.ReactNode;
    onSubmitButton?: React.ReactNode;
    onSubmitSuccess?: () => void;
    onClose: () => void;
    onBackdropClick: () => void;
}

export function FullScreenModal({
    isOpen,
    mounted,
    children,
    onSubmitButton,
    onSubmitSuccess,
    onClose,
    onBackdropClick
}: FullScreenModalProps) {
    const { dict } = useDictionary();

    if (!isOpen || !mounted) return null;

    return createPortal(
        <motion.div
            key="fullscreen-modal"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900 md:hidden"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '90dvh',
                minHeight: '-webkit-fill-available',
                zIndex: 99999,
                margin: 0,
                padding: 0
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onBackdropClick();
            }}
        >
            <div
                className="h-full w-full flex flex-col bg-slate-900 overflow-hidden"
                style={{ width: '100vw', height: '100%', minHeight: '-webkit-fill-available' }}
            >
                <div
                    className="flex-shrink-0 flex items-center justify-between border-b border-slate-700/50 bg-slate-800/90 backdrop-blur-sm"
                    style={{
                        paddingTop: 'max(1rem, env(safe-area-inset-top))',
                        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
                        paddingRight: 'max(1rem, env(safe-area-inset-right))',
                        paddingBottom: '1rem'
                    }}
                >
                    <h3 className="text-lg font-semibold text-white">
                        {dict?.matches?.makePredictions || 'Make Your Predictions'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-white transition-colors active:scale-95"
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div
                        className="p-4"
                        style={{
                            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
                            paddingRight: 'max(1rem, env(safe-area-inset-right))',
                            paddingBottom: onSubmitButton ? 'calc(65px + env(safe-area-inset-bottom))' : '1rem'
                        }}
                    >
                        {children}
                    </div>
                </div>
                {onSubmitButton && (
                    <div
                        className="flex-shrink-0 border-t border-slate-700/50 bg-slate-800/95 backdrop-blur-md"
                        style={{
                            paddingTop: '0.75rem',
                            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
                            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
                            paddingRight: 'max(1rem, env(safe-area-inset-right))'
                        }}
                    >
                        {isValidElement(onSubmitButton) && typeof (onSubmitButton.props as { onClick?: (e: React.MouseEvent) => void | Promise<void> }).onClick === 'function'
                            ? cloneElement(onSubmitButton, {
                                onClick: async (e: React.MouseEvent) => {
                                    try {
                                        await (onSubmitButton.props as { onClick: (e: React.MouseEvent) => void | Promise<void> }).onClick(e);
                                        if (onSubmitSuccess) {
                                            onSubmitSuccess();
                                        } else {
                                            onClose();
                                        }
                                    } catch (err) {
                                        console.error('Submission error:', err);
                                    }
                                }
                            } as Record<string, unknown>)
                            : onSubmitButton}
                    </div>
                )}
            </div>
        </motion.div>,
        document.body
    );
}
