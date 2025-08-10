'use client';

import { useState, useEffect } from 'react';
import { BetsService } from '@netprophet/lib';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui';

interface BetManagementProps { }

export default function BetManagement({ }: BetManagementProps) {
    const [bets, setBets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedBet, setSelectedBet] = useState<any | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        loadBets();
    }, []);

    const loadBets = async () => {
        try {
            setLoading(true);
            const allBets = await BetsService.getAllBets();
            setBets(allBets);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load bets');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBetStatus = async (betId: string, status: 'won' | 'lost' | 'cancelled', winningsPaid?: number) => {
        try {
            await BetsService.updateBetStatus(betId, status, winningsPaid);
            await loadBets(); // Reload to get updated data
            setIsDialogOpen(false);
            setSelectedBet(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update bet status');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Active</Badge>;
            case 'won':
                return <Badge variant="secondary" className="bg-green-100 text-green-800">Won</Badge>;
            case 'lost':
                return <Badge variant="secondary" className="bg-red-100 text-red-800">Lost</Badge>;
            case 'cancelled':
                return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatPrediction = (prediction: any) => {
        if (!prediction) return 'No prediction';

        const parts = [];
        if (prediction.winner) parts.push(`Winner: ${prediction.winner}`);
        if (prediction.matchResult) parts.push(`Result: ${prediction.matchResult}`);
        if (prediction.tieBreak) parts.push(`Tie-break: ${prediction.tieBreak}`);
        if (prediction.totalGames) parts.push(`Games: ${prediction.totalGames}`);
        if (prediction.acesLeader) parts.push(`Aces: ${prediction.acesLeader}`);
        if (prediction.doubleFaults) parts.push(`DF: ${prediction.doubleFaults}`);
        if (prediction.breakPoints) parts.push(`BP: ${prediction.breakPoints}`);

        return parts.length > 0 ? parts.join(' | ') : 'Complex prediction';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading bets...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-600">Error: {error}</div>
            </div>
        );
    }

    const activeBets = bets.filter(bet => bet.status === 'active');
    const resolvedBets = bets.filter(bet => bet.status !== 'active');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Bet Management</h1>
                <Button onClick={loadBets} variant="outline">
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bets</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bets.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Bets</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{activeBets.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bet Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bets.reduce((sum, bet) => sum + bet.bet_amount, 0)} 🌕</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Winnings Paid</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{bets.reduce((sum, bet) => sum + bet.winnings_paid, 0)} 🌕</div>
                    </CardContent>
                </Card>
            </div>

            {/* Active Bets */}
            <Card>
                <CardHeader>
                    <CardTitle>Active Bets ({activeBets.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {activeBets.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No active bets</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Match</TableHead>
                                    <TableHead>Prediction</TableHead>
                                    <TableHead>Bet Amount</TableHead>
                                    <TableHead>Multiplier</TableHead>
                                    <TableHead>Potential Win</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeBets.map((bet) => (
                                    <TableRow key={bet.id}>
                                        <TableCell className="font-medium">{bet.user_id.slice(0, 8)}...</TableCell>
                                        <TableCell>
                                            {bet.description || 'Match details not available'}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            {formatPrediction(bet.prediction)}
                                        </TableCell>
                                        <TableCell>{bet.bet_amount} 🌕</TableCell>
                                        <TableCell>{bet.multiplier}x</TableCell>
                                        <TableCell>{bet.potential_winnings} 🌕</TableCell>
                                        <TableCell>{formatDate(bet.created_at)}</TableCell>
                                        <TableCell>
                                            <Dialog open={isDialogOpen && selectedBet?.id === bet.id} onOpenChange={(open: boolean) => {
                                                setIsDialogOpen(open);
                                                if (open) {
                                                    setSelectedBet(bet);
                                                } else {
                                                    setSelectedBet(null);
                                                }
                                            }}>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm">
                                                        Resolve
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Resolve Bet</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <p className="text-sm text-gray-600 mb-2">Bet Details:</p>
                                                            <p><strong>Match:</strong> {bet.description || 'Match details not available'}</p>
                                                            <p><strong>Bet Amount:</strong> {bet.bet_amount} 🌕</p>
                                                            <p><strong>Multiplier:</strong> {bet.multiplier}x</p>
                                                            <p><strong>Potential Win:</strong> {bet.potential_winnings} 🌕</p>
                                                            <p><strong>Prediction:</strong> {formatPrediction(bet.prediction)}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                onClick={() => handleUpdateBetStatus(bet.id, 'won', bet.potential_winnings)}
                                                                className="bg-green-600 hover:bg-green-700"
                                                            >
                                                                Mark as Won
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleUpdateBetStatus(bet.id, 'lost')}
                                                                variant="destructive"
                                                            >
                                                                Mark as Lost
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleUpdateBetStatus(bet.id, 'cancelled')}
                                                                variant="outline"
                                                            >
                                                                Cancel Bet
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Resolved Bets */}
            <Card>
                <CardHeader>
                    <CardTitle>Resolved Bets ({resolvedBets.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {resolvedBets.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No resolved bets</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Match</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Bet Amount</TableHead>
                                    <TableHead>Winnings Paid</TableHead>
                                    <TableHead>Resolved</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {resolvedBets.map((bet) => (
                                    <TableRow key={bet.id}>
                                        <TableCell className="font-medium">{bet.user_id.slice(0, 8)}...</TableCell>
                                        <TableCell>
                                            {bet.description || 'Match details not available'}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(bet.status)}</TableCell>
                                        <TableCell>{bet.bet_amount} 🌕</TableCell>
                                        <TableCell>{bet.winnings_paid} 🌕</TableCell>
                                        <TableCell>{bet.resolved_at ? formatDate(bet.resolved_at) : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 