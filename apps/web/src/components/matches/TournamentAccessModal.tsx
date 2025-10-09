'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@netprophet/ui';
import { Button } from '@netprophet/ui';
import { Badge } from '@netprophet/ui';
import { Alert, AlertDescription } from '@netprophet/ui';
import { TournamentPurchaseService, TournamentAccessResult } from '@netprophet/lib';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '../Providers';
import { useDictionary } from '@/context/DictionaryContext';
import { Lock, Coins, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import CoinIcon from '@/components/CoinIcon';

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
    const { dict } = useDictionary();
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

            // Check if user has tournament pass and use it first
            if (wallet.hasTournamentPass && !wallet.tournamentPassUsed) {
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const passResult = await TournamentPurchaseService.useTournamentPass(tournamentId);
                if (passResult.success) {
                    toast.success('Tournament pass used successfully!');
                    await syncWalletWithDatabase();
                    onAccessGranted();
                    return;
                }
            }

            // If no pass or pass failed, try to purchase
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
                            <p className="text-gray-600">{dict?.tournamentAccess?.checkingAccess || 'Checking tournament access...'}</p>
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
                        {dict?.tournamentAccess?.title || 'Tournament Access Required'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-purple-400 mb-2">{tournamentName}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            {accessResult.needsPurchase
                                ? (dict?.tournamentAccess?.description?.replace('{buyInFee}', accessResult.buyInFee.toString()) || `This tournament requires a ${accessResult.buyInFee} coin entry fee to place predictions.`)
                                : (dict?.tournamentAccess?.descriptionFree || 'You do not have access to this tournament.')
                            }
                        </p>
                    </div>

                    {accessResult.needsPurchase && (
                        <div className="space-y-3">
                            {/* Tournament Pass Info */}
                            {wallet.hasTournamentPass && !wallet.tournamentPassUsed && (
                                <div className="flex items-center justify-between p-4 bg-purple-700/30 dark:bg-purple-800/50 rounded-lg border border-purple-600/30">
                                    <div className="flex items-center gap-3">
                                        <div className="text-purple-400">🎫</div>
                                        <span className="font-semibold text-white">Tournament Pass Available</span>
                                    </div>
                                    <Badge variant="outline" className="text-purple-400 border-purple-400">
                                        Free Access
                                    </Badge>
                                </div>
                            )}

                            <div className="flex items-center justify-between p-4 bg-slate-700/30 dark:bg-slate-800/50 rounded-lg border border-slate-600/30">
                                <div className="flex items-center gap-3">
                                    <Coins className="h-5 w-5 text-yellow-500" />
                                    <span className="font-semibold text-white">{dict?.tournamentAccess?.entryFee || 'Entry Fee'}</span>
                                </div>
                                <Badge variant="secondary" className="text-lg font-bold flex items-center gap-1">
                                    {accessResult.buyInFee} <CoinIcon size={18} />
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-700/30 dark:bg-slate-800/50 rounded-lg border border-slate-600/30">
                                <div className="flex items-center gap-3">
                                    <Coins className="h-5 w-5 text-blue-400" />
                                    <span className="font-semibold text-white">{dict?.tournamentAccess?.yourBalance || 'Your Balance'}</span>
                                </div>
                                <Badge variant="outline" className="text-lg font-bold flex items-center gap-1">
                                    {wallet.balance} <CoinIcon size={18} />
                                </Badge>
                            </div>

                            {wallet.balance < accessResult.buyInFee && (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        {dict?.tournamentAccess?.insufficientBalance?.replace('{neededCoins}', (accessResult.buyInFee - wallet.balance).toString()) || `Insufficient balance. You need ${accessResult.buyInFee - wallet.balance} more coins.`}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {wallet.balance >= accessResult.buyInFee && (
                                <Alert>
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        {dict?.tournamentAccess?.sufficientBalance || 'You have sufficient balance to purchase access.'}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                            disabled={purchasing}
                        >
                            {dict?.tournamentAccess?.cancel || 'Cancel'}
                        </Button>
                        {accessResult.needsPurchase && (
                            <Button
                                onClick={handlePurchaseAccess}
                                disabled={purchasing}
                                className="flex-1"
                            >
                                {purchasing
                                    ? (dict?.tournamentAccess?.purchasing || 'Processing...')
                                    : (wallet.hasTournamentPass && !wallet.tournamentPassUsed)
                                        ? (dict?.tournamentAccess?.usePass || 'Use Tournament Pass')
                                        : (wallet.balance >= accessResult.buyInFee)
                                            ? (dict?.tournamentAccess?.payButton?.replace('{buyInFee}', accessResult.buyInFee.toString()) || `Pay ${accessResult.buyInFee} 🌕`)
                                            : (dict?.tournamentAccess?.insufficientFunds || 'Insufficient Funds')
                                }
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
