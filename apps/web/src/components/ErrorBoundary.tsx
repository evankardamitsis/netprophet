'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console
        console.error('Error Boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
                    <div className="max-w-md w-full text-center">
                        <div className="mb-6">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h1 className="text-2xl font-bold mb-2">Oops! Something went wrong</h1>
                            <p className="text-slate-400 mb-6">
                                We&apos;re sorry for the inconvenience. The error has been logged and we&apos;ll look into it.
                            </p>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-left">
                                <h3 className="font-semibold text-red-400 mb-2">Error Details (Dev Only):</h3>
                                <pre className="text-xs overflow-auto text-red-300">
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                            </div>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                            >
                                Reload Page
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                            >
                                Go to Homepage
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

