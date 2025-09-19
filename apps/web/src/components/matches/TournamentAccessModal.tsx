'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';
import { Button } from '@netprophet/ui';
import { Badge } from '@netprophet/ui';
import { Alert, AlertDescription } from '@netprophet/ui';
import { TournamentPurchaseService, TournamentAccessResult } from '@netprophet/lib';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '../Providers';
import { Lock, Coins, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface TournamentAccessModalProps {
    tournamentId: string;
    tournamentName: string;
    onAccessGranted: () => void;
    onClose: () => void;
}

export function TournamentAccessModal({
    tournamentId,
    tournamentName,
    onAccessGranted,
    onClose
}: TournamentAccessModalProps) {
    const { wallet, syncWalletWithDatabase } = useWallet();
    const { theme } = useTheme();
    const [accessResult, setAccessResult] = useState<TournamentAccessResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);

    const checkTournamentAccess = useCallback(async () => {
        try {
            setLoading(true);
            const result = await TournamentPurchaseService.checkTournamentAccess(tournamentId);
            setAccessResult(result);
        } catch (error) {
            console.error('Error checking tournament access:', error);
            toast.error('Failed to check tournament access');
        } finally {
            setLoading(false);
        }
    }, [tournamentId]);

    useEffect(() => {
        checkTournamentAccess();
    }, [tournamentId, checkTournamentAccess]);

    const handlePurchaseAccess = async () => {
        if (!accessResult || accessResult.buyInFee === 0) return;

        try {
            setPurchasing(true);
            const result = await TournamentPurchaseService.purchaseTournamentAccess(tournamentId);

            if (result.success) {
                toast.success(result.message);
                await syncWalletWithDatabase();
                onAccessGranted();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error('Error purchasing tournament access:', error);
            toast.error('Failed to purchase tournament access');
        } finally {
            setPurchasing(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className={`w-full max-w-md ${theme === 'dark' ? 'bg-[#23262F] border-[#2A2D38]' : 'bg-white border-gray-200'}`}>
                    <CardContent className="p-6">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Checking tournament access...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!accessResult) {
        return null;
    }

    // If user already has access, grant it immediately
    if (accessResult.hasAccess) {
        onAccessGranted();
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className={`w-full max-w-md ${theme === 'dark' ? 'bg-[#23262F] border-[#2A2D38]' : 'bg-white border-gray-200'}`}>
                <CardHeader>
                    <CardTitle className="text-center flex items-center justify-center gap-2">
                        <Lock className="h-5 w-5" />
                        Tournament Access Required
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold mb-2">{tournamentName}</h3>
                        <p className="text-gray-600 text-sm">
                            {accessResult.needsPurchase
                                ? `This tournament requires a ${accessResult.buyInFee} coin entry fee to place predictions.`
                                : 'You do not have access to this tournament.'
                            }
                        </p>
                    </div>

                    {accessResult.needsPurchase && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Coins className="h-5 w-5 text-yellow-500" />
                                    <span className="font-medium">Entry Fee</span>
                                </div>
                                <Badge variant="secondary" className="text-lg">
                                    {accessResult.buyInFee} 🌕
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Coins className="h-5 w-5 text-blue-500" />
                                    <span className="font-medium">Your Balance</span>
                                </div>
                                <Badge variant="outline" className="text-lg">
                                    {wallet.balance} 🌕
                                </Badge>
                            </div>

                            {wallet.balance < accessResult.buyInFee && (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Insufficient balance. You need {accessResult.buyInFee - wallet.balance} more coins.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {wallet.balance >= accessResult.buyInFee && (
                                <Alert>
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        You have sufficient balance to purchase access.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                            disabled={purchasing}
                        >
                            Cancel
                        </Button>
                        {accessResult.needsPurchase && wallet.balance >= accessResult.buyInFee && (
                            <Button
                                onClick={handlePurchaseAccess}
                                disabled={purchasing}
                                className="flex-1"
                            >
                                {purchasing ? 'Purchasing...' : `Pay ${accessResult.buyInFee} 🌕`}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
