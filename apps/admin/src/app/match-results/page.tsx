'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase, MatchResultsService, MATCH_STATUSES, isFinishedStatus } from '@netprophet/lib';
import { MatchResultWithDetails } from '@/types';
import { toast } from 'sonner';

interface Match {
    id: string;
    player_a: {
        id: string;
        first_name: string;
        last_name: string;
    };
    player_b: {
        id: string;
        first_name: string;
        last_name: string;
    };
    tournaments: {
        name: string;
        matches_type: string;
    } | null;
    status: string;
    start_time: string | null;
    web_synced: boolean | null;
}

export default function MatchResultsPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [matchResults, setMatchResults] = useState<MatchResultWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingResult, setEditingResult] = useState<MatchResultWithDetails | null>(null);

    // Form state for new result
    const [formData, setFormData] = useState({
        winner_id: '',
        match_result: '',
        set1_score: '',
        set2_score: '',
        set3_score: '',
        set4_score: '',
        set5_score: '',
        set1_winner_id: '',
        set2_winner_id: '',
        set3_winner_id: '',
        set4_winner_id: '',
        set5_winner_id: '',
        set1_tiebreak_score: '',
        set2_tiebreak_score: '',
        set3_tiebreak_score: '',
        set4_tiebreak_score: '',
        set5_tiebreak_score: '',
        super_tiebreak_score: '',
        super_tiebreak_winner_id: '',
        total_games: '',
        aces_leader_id: '',
        double_faults_count: '',
        break_points_count: ''
    });

    useEffect(() => {
        fetchMatches();
        fetchMatchResults();
    }, []);

    const fetchMatches = async () => {
        try {
            const { data, error } = await supabase
                .from('matches')
                .select(`
          id,
          player_a_id,
          player_b_id,
          player_a,
          player_b,
          tournaments(id, name, matches_type),
          status,
          start_time,
          web_synced
        `)
                .eq('web_synced', true)
                .order('start_time', { ascending: false });

            if (error) throw error;

            // Transform the data to match our interface
            const transformedMatches = (data || []).map(match => ({
                id: match.id,
                player_a: {
                    id: match.player_a_id || '',
                    first_name: match.player_a ? match.player_a.split(' ')[0] : '',
                    last_name: match.player_a ? match.player_a.split(' ').slice(1).join(' ') : ''
                },
                player_b: {
                    id: match.player_b_id || '',
                    first_name: match.player_b ? match.player_b.split(' ')[0] : '',
                    last_name: match.player_b ? match.player_b.split(' ').slice(1).join(' ') : ''
                },
                tournaments: Array.isArray(match.tournaments) ? match.tournaments[0] : match.tournaments,
                status: match.status,
                start_time: match.start_time,
                web_synced: match.web_synced
            }));

            setMatches(transformedMatches);
        } catch (error) {
            console.error('Error fetching matches:', error);
            toast.error('Failed to fetch matches');
        } finally {
            setLoading(false);
        }
    };

    const fetchMatchResults = async () => {
        try {
            // Get all match results from the database
            const { data, error } = await supabase
                .from('match_results')
                .select(`
                    *,
                    winner:players!match_results_winner_id_fkey(id, first_name, last_name),
                    set1_winner:players!match_results_set1_winner_id_fkey(id, first_name, last_name),
                    set2_winner:players!match_results_set2_winner_id_fkey(id, first_name, last_name),
                    set3_winner:players!match_results_set3_winner_id_fkey(id, first_name, last_name),
                    set4_winner:players!match_results_set4_winner_id_fkey(id, first_name, last_name),
                    set5_winner:players!match_results_set5_winner_id_fkey(id, first_name, last_name),
                    super_tiebreak_winner:players!match_results_super_tiebreak_winner_id_fkey(id, first_name, last_name),
                    aces_leader:players!match_results_aces_leader_id_fkey(id, first_name, last_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMatchResults((data || []) as MatchResultWithDetails[]);
        } catch (error) {
            console.error('Error fetching match results:', error);
        }
    };

    const handleAddResult = (match: Match) => {
        setSelectedMatch(match);
        setFormData({
            winner_id: '',
            match_result: '',
            set1_score: '',
            set2_score: '',
            set3_score: '',
            set4_score: '',
            set5_score: '',
            set1_winner_id: '',
            set2_winner_id: '',
            set3_winner_id: '',
            set4_winner_id: '',
            set5_winner_id: '',
            set1_tiebreak_score: '',
            set2_tiebreak_score: '',
            set3_tiebreak_score: '',
            set4_tiebreak_score: '',
            set5_tiebreak_score: '',
            super_tiebreak_score: '',
            super_tiebreak_winner_id: '',
            total_games: '',
            aces_leader_id: '',
            double_faults_count: '',
            break_points_count: ''
        });
        setIsResultDialogOpen(true);
    };

    const handleEditResult = (result: MatchResultWithDetails) => {
        setEditingResult(result);
        setFormData({
            winner_id: result.winner_id,
            match_result: result.match_result,
            set1_score: result.set1_score || '',
            set2_score: result.set2_score || '',
            set3_score: result.set3_score || '',
            set4_score: result.set4_score || '',
            set5_score: result.set5_score || '',
            set1_winner_id: result.set1_winner_id || '',
            set2_winner_id: result.set2_winner_id || '',
            set3_winner_id: result.set3_winner_id || '',
            set4_winner_id: result.set4_winner_id || '',
            set5_winner_id: result.set5_winner_id || '',
            set1_tiebreak_score: result.set1_tiebreak_score || '',
            set2_tiebreak_score: result.set2_tiebreak_score || '',
            set3_tiebreak_score: result.set3_tiebreak_score || '',
            set4_tiebreak_score: result.set4_tiebreak_score || '',
            set5_tiebreak_score: result.set5_tiebreak_score || '',
            super_tiebreak_score: result.super_tiebreak_score || '',
            super_tiebreak_winner_id: result.super_tiebreak_winner_id || '',
            total_games: result.total_games?.toString() || '',
            aces_leader_id: result.aces_leader_id || '',
            double_faults_count: result.double_faults_count?.toString() || '',
            break_points_count: result.break_points_count?.toString() || ''
        });
        setIsEditDialogOpen(true);
    };

    const handleSubmitResult = async () => {
        if (!selectedMatch) return;

        try {
            const resultData = {
                match_id: selectedMatch.id,
                winner_id: formData.winner_id,
                match_result: formData.match_result,
                set1_score: formData.set1_score || null,
                set2_score: formData.set2_score || null,
                set3_score: formData.set3_score || null,
                set4_score: formData.set4_score || null,
                set5_score: formData.set5_score || null,
                set1_winner_id: formData.set1_winner_id || null,
                set2_winner_id: formData.set2_winner_id || null,
                set3_winner_id: formData.set3_winner_id || null,
                set4_winner_id: formData.set4_winner_id || null,
                set5_winner_id: formData.set5_winner_id || null,
                set1_tiebreak_score: formData.set1_tiebreak_score || null,
                set2_tiebreak_score: formData.set2_tiebreak_score || null,
                set3_tiebreak_score: formData.set3_tiebreak_score || null,
                set4_tiebreak_score: formData.set4_tiebreak_score || null,
                set5_tiebreak_score: formData.set5_tiebreak_score || null,
                super_tiebreak_score: formData.super_tiebreak_score || null,
                super_tiebreak_winner_id: formData.super_tiebreak_winner_id || null,
                total_games: formData.total_games ? parseInt(formData.total_games) : null,
                aces_leader_id: formData.aces_leader_id || null,
                double_faults_count: formData.double_faults_count ? parseInt(formData.double_faults_count) : null,
                break_points_count: formData.break_points_count ? parseInt(formData.break_points_count) : null
            };

            const { error } = await MatchResultsService.createMatchResult(resultData);
            if (error) throw error;

            toast.success('Match result added successfully');
            setIsResultDialogOpen(false);
            fetchMatchResults();
        } catch (error) {
            console.error('Error adding match result:', error);
            toast.error('Failed to add match result');
        }
    };

    const handleUpdateResult = async () => {
        if (!editingResult) return;

        try {
            const resultData = {
                winner_id: formData.winner_id,
                match_result: formData.match_result,
                set1_score: formData.set1_score || null,
                set2_score: formData.set2_score || null,
                set3_score: formData.set3_score || null,
                set4_score: formData.set4_score || null,
                set5_score: formData.set5_score || null,
                set1_winner_id: formData.set1_winner_id || null,
                set2_winner_id: formData.set2_winner_id || null,
                set3_winner_id: formData.set3_winner_id || null,
                set4_winner_id: formData.set4_winner_id || null,
                set5_winner_id: formData.set5_winner_id || null,
                set1_tiebreak_score: formData.set1_tiebreak_score || null,
                set2_tiebreak_score: formData.set2_tiebreak_score || null,
                set3_tiebreak_score: formData.set3_tiebreak_score || null,
                set4_tiebreak_score: formData.set4_tiebreak_score || null,
                set5_tiebreak_score: formData.set5_tiebreak_score || null,
                super_tiebreak_score: formData.super_tiebreak_score || null,
                super_tiebreak_winner_id: formData.super_tiebreak_winner_id || null,
                total_games: formData.total_games ? parseInt(formData.total_games) : null,
                aces_leader_id: formData.aces_leader_id || null,
                double_faults_count: formData.double_faults_count ? parseInt(formData.double_faults_count) : null,
                break_points_count: formData.break_points_count ? parseInt(formData.break_points_count) : null
            };

            const { error } = await MatchResultsService.updateMatchResult(editingResult.id, resultData);
            if (error) throw error;

            toast.success('Match result updated successfully');
            setIsEditDialogOpen(false);
            fetchMatchResults();
        } catch (error) {
            console.error('Error updating match result:', error);
            toast.error('Failed to update match result');
        }
    };

    const hasResult = (matchId: string) => {
        return matchResults.some(result => result.match_id === matchId);
    };

    const getResult = (matchId: string) => {
        return matchResults.find(result => result.match_id === matchId);
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8">
                <div className="text-center">Loading matches...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Match Results Management</h1>
                <p className="text-muted-foreground">
                    Add and manage detailed match results for prediction evaluation
                </p>
            </div>

            <div className="grid gap-6">
                {matches.length === 0 && (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
                            <p className="text-gray-600 mb-4">
                                No web-synced matches available. Make sure you have:
                            </p>
                            <ul className="text-sm text-gray-500 space-y-1">
                                <li>• Created matches in tournaments</li>
                                <li>• Synced matches to the web app</li>
                                <li>• Set match status to &apos;finished&apos; to add results</li>
                            </ul>
                        </CardContent>
                    </Card>
                )}
                {matches.map((match) => {
                    const result = getResult(match.id);
                    const hasExistingResult = hasResult(match.id);

                    return (
                        <Card key={match.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg">
                                            {match.player_a.first_name} {match.player_a.last_name} vs {match.player_b.first_name} {match.player_b.last_name}
                                        </CardTitle>
                                        <CardDescription>
                                            {match.tournaments?.name} • {match.tournaments?.matches_type} • {match.start_time ? new Date(match.start_time).toLocaleDateString() : 'No date'}
                                            <br />
                                            <span className="text-xs text-gray-500">Status: {match.status} | Web Synced: {match.web_synced ? 'Yes' : 'No'}</span>
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={match.status === 'finished' ? 'default' : 'secondary'}>
                                            {match.status}
                                        </Badge>
                                        {hasExistingResult && (
                                            <Badge variant="outline" className="text-green-600">
                                                Results Added
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        {result ? (
                                            <span>
                                                Winner: {result.winner?.first_name} {result.winner?.last_name} •
                                                Result: {result.match_result}
                                            </span>
                                        ) : (
                                            <span>No results added yet</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {hasExistingResult ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEditResult(result!)}
                                            >
                                                Edit Results
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => handleAddResult(match)}
                                                disabled={!isFinishedStatus(match.status as any)}
                                                title={!isFinishedStatus(match.status as any) ? `Match status is "${match.status}" - change to "finished" to add results` : 'Add match results'}
                                            >
                                                Add Results
                                                {!isFinishedStatus(match.status as any) && (
                                                    <span className="ml-2 text-xs opacity-70">({match.status})</span>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Add Result Dialog */}
            <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Match Results</DialogTitle>
                        <DialogDescription>
                            Enter detailed match results for {selectedMatch?.player_a.first_name} {selectedMatch?.player_a.last_name} vs {selectedMatch?.player_b.first_name} {selectedMatch?.player_b.last_name}
                        </DialogDescription>
                    </DialogHeader>

                    <MatchResultForm
                        formData={formData}
                        setFormData={setFormData}
                        match={selectedMatch}
                        onSubmit={handleSubmitResult}
                        submitLabel="Add Results"
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Result Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Match Results</DialogTitle>
                        <DialogDescription>
                            Update match results for {editingResult?.match?.player_a_id} vs {editingResult?.match?.player_b_id}
                        </DialogDescription>
                    </DialogHeader>

                    <MatchResultForm
                        formData={formData}
                        setFormData={setFormData}
                        match={selectedMatch}
                        onSubmit={handleUpdateResult}
                        submitLabel="Update Results"
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Match Result Form Component
interface MatchResultFormProps {
    formData: any;
    setFormData: (data: any) => void;
    match: Match | null;
    onSubmit: () => void;
    submitLabel: string;
}

function MatchResultForm({ formData, setFormData, match, onSubmit, submitLabel }: MatchResultFormProps) {
    if (!match) return null;

    const isAmateurFormat = match.tournaments?.matches_type === 'best-of-3-super-tiebreak';
    const isBestOf5 = match.tournaments?.matches_type === 'best-of-5';

    return (
        <div className="space-y-6">
            {/* Match Winner */}
            <div className="space-y-2">
                <Label>Match Winner *</Label>
                <Select value={formData.winner_id} onValueChange={(value) => setFormData({ ...formData, winner_id: value })}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select winner" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={match.player_a.id}>
                            {match.player_a.first_name} {match.player_a.last_name}
                        </SelectItem>
                        <SelectItem value={match.player_b.id}>
                            {match.player_b.first_name} {match.player_b.last_name}
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Match Result */}
            <div className="space-y-2">
                <Label>Match Result *</Label>
                <Select value={formData.match_result} onValueChange={(value) => setFormData({ ...formData, match_result: value })}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select match result" />
                    </SelectTrigger>
                    <SelectContent>
                        {isBestOf5 ? (
                            <>
                                <SelectItem value="3-0">3-0 (Straight sets)</SelectItem>
                                <SelectItem value="3-1">3-1 (Four sets)</SelectItem>
                                <SelectItem value="3-2">3-2 (Five sets)</SelectItem>
                                <SelectItem value="0-3">0-3 (Straight sets)</SelectItem>
                                <SelectItem value="1-3">1-3 (Four sets)</SelectItem>
                                <SelectItem value="2-3">2-3 (Five sets)</SelectItem>
                            </>
                        ) : (
                            <>
                                <SelectItem value="2-0">2-0 (Straight sets)</SelectItem>
                                <SelectItem value="2-1">2-1 ({isAmateurFormat ? 'Super tiebreak' : 'Three sets'})</SelectItem>
                                <SelectItem value="0-2">0-2 (Straight sets)</SelectItem>
                                <SelectItem value="1-2">1-2 ({isAmateurFormat ? 'Super tiebreak' : 'Three sets'})</SelectItem>
                            </>
                        )}
                    </SelectContent>
                </Select>
            </div>

            {/* Set Scores */}
            <div className="space-y-4">
                <Label>Set Scores</Label>
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5].map((setNum) => {
                        if (isBestOf5 || setNum <= 3) {
                            return (
                                <div key={setNum} className="space-y-2">
                                    <Label>Set {setNum} Score</Label>
                                    <Input
                                        placeholder="e.g., 6-4"
                                        value={formData[`set${setNum}_score`]}
                                        onChange={(e) => setFormData({ ...formData, [`set${setNum}_score`]: e.target.value })}
                                    />
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            </div>

            {/* Set Winners */}
            <div className="space-y-4">
                <Label>Set Winners</Label>
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5].map((setNum) => {
                        if (isBestOf5 || setNum <= 3) {
                            return (
                                <div key={setNum} className="space-y-2">
                                    <Label>Set {setNum} Winner</Label>
                                    <Select
                                        value={formData[`set${setNum}_winner_id`]}
                                        onValueChange={(value) => setFormData({ ...formData, [`set${setNum}_winner_id`]: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select winner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={match.player_a.id}>
                                                {match.player_a.first_name} {match.player_a.last_name}
                                            </SelectItem>
                                            <SelectItem value={match.player_b.id}>
                                                {match.player_b.first_name} {match.player_b.last_name}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            </div>

            {/* Tiebreak Scores */}
            <div className="space-y-4">
                <Label>Tiebreak Scores</Label>
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5].map((setNum) => {
                        if (isBestOf5 || setNum <= 3) {
                            return (
                                <div key={setNum} className="space-y-2">
                                    <Label>Set {setNum} Tiebreak Score</Label>
                                    <Input
                                        placeholder="e.g., 7-5"
                                        value={formData[`set${setNum}_tiebreak_score`]}
                                        onChange={(e) => setFormData({ ...formData, [`set${setNum}_tiebreak_score`]: e.target.value })}
                                    />
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            </div>

            {/* Super Tiebreak (for amateur format) */}
            {isAmateurFormat && (
                <div className="space-y-4">
                    <Label>Super Tiebreak</Label>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Super Tiebreak Score</Label>
                            <Input
                                placeholder="e.g., 10-8"
                                value={formData.super_tiebreak_score}
                                onChange={(e) => setFormData({ ...formData, super_tiebreak_score: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Super Tiebreak Winner</Label>
                            <Select
                                value={formData.super_tiebreak_winner_id}
                                onValueChange={(value) => setFormData({ ...formData, super_tiebreak_winner_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select winner" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={match.player_a.id}>
                                        {match.player_a.first_name} {match.player_a.last_name}
                                    </SelectItem>
                                    <SelectItem value={match.player_b.id}>
                                        {match.player_b.first_name} {match.player_b.last_name}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            )}

            {/* Additional Statistics */}
            <div className="space-y-4">
                <Label>Additional Statistics</Label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Total Games</Label>
                        <Input
                            type="number"
                            placeholder="e.g., 24"
                            value={formData.total_games}
                            onChange={(e) => setFormData({ ...formData, total_games: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Aces Leader</Label>
                        <Select
                            value={formData.aces_leader_id}
                            onValueChange={(value) => setFormData({ ...formData, aces_leader_id: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select player" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={match.player_a.id}>
                                    {match.player_a.first_name} {match.player_a.last_name}
                                </SelectItem>
                                <SelectItem value={match.player_b.id}>
                                    {match.player_b.first_name} {match.player_b.last_name}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Double Faults Count</Label>
                        <Input
                            type="number"
                            placeholder="e.g., 8"
                            value={formData.double_faults_count}
                            onChange={(e) => setFormData({ ...formData, double_faults_count: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Break Points Count</Label>
                        <Input
                            type="number"
                            placeholder="e.g., 12"
                            value={formData.break_points_count}
                            onChange={(e) => setFormData({ ...formData, break_points_count: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { }}>
                    Cancel
                </Button>
                <Button onClick={onSubmit}>
                    {submitLabel}
                </Button>
            </div>
        </div>
    );
}
