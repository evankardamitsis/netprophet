import React from 'react';

export function FooterDisclaimer() {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white py-6 px-6 z-30">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-2">
                        <span className="text-yellow-400 text-lg">⚠️</span>
                        <span className="font-medium">
                            NetProphet is a points-only prediction game. No real-money betting.
                        </span>
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-gray-400">
                        <a
                            href="/privacy"
                            className="hover:text-white transition-colors"
                        >
                            Privacy Policy
                        </a>
                        <a
                            href="/terms"
                            className="hover:text-white transition-colors"
                        >
                            Terms of Service
                        </a>
                        <div className="flex items-center space-x-1">
                            <span>Made with</span>
                            <span className="text-red-400">❤️</span>
                            <span>in Athens</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
} 