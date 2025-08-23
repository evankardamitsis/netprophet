'use client';

import { useState, useEffect, useMemo } from 'react';
import { MatchResultsService, supabase } from '@netprophet/lib';
import { MatchResultsTable } from './components/MatchResultsTable';
import { MatchResultsFilters } from './components/MatchResultsFilters';
import { MatchResultForm } from './components/MatchResultForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Match, FormData } from './types';
import { MatchResultWithDetails } from '@/types';
import { normalizeText } from '@/lib/utils';

export default function MatchResultsPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [matchResults, setMatchResults] = useState<MatchResultWithDetails[]>([]);
    const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Filter states
    const [statusFilter, setStatusFilter] = useState<'all' | 'finished' | 'live' | 'upcoming'>('finished');
    const [searchTerm, setSearchTerm] = useState('');
    const [tournamentFilter, setTournamentFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');

    // Get unique tournaments and dates for filters
    const tournaments = [...new Set(matches.map(match => match.tournaments?.name).filter((name): name is string => Boolean(name)))].sort();
    const dates = [...new Set(matches.map(match =>
        match.start_time ? new Date(match.start_time).toDateString() : null
    ).filter((date): date is string => date !== null))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const [formData, setFormData] = useState<FormData>({
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
        super_tiebreak_winner_id: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Get matches from the matches service
            const { data: matchesData, error: matchesError } = await supabase
                .from('matches')
                .select(`
                    *,
                    player_a:players!matches_player_a_id_fkey(id, first_name, last_name),
                    player_b:players!matches_player_b_id_fkey(id, first_name, last_name),
                    tournaments:tournaments!matches_tournament_id_fkey(id, name)
                `)
                .order('start_time', { ascending: true });

            if (matchesError) throw matchesError;

            // Transform the data to match our interface
            const transformedMatches = (matchesData || []).map((match: any) => ({
                id: match.id,
                player_a: {
                    id: match.player_a?.id || '',
                    first_name: match.player_a?.first_name || '',
                    last_name: match.player_a?.last_name || ''
                },
                player_b: {
                    id: match.player_b?.id || '',
                    first_name: match.player_b?.first_name || '',
                    last_name: match.player_b?.last_name || ''
                },
                tournaments: Array.isArray(match.tournaments) ? match.tournaments[0] : match.tournaments,
                status: match.status,
                start_time: match.start_time,
                web_synced: match.web_synced
            }));

            setMatches(transformedMatches);
            setFilteredMatches(transformedMatches);

            // Get match results
            const { data: resultsData, error: resultsError } = await supabase
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

            if (resultsError) throw resultsError;
            setMatchResults((resultsData || []) as MatchResultWithDetails[]);

        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
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
            super_tiebreak_winner_id: ''
        });
        setIsAddDialogOpen(true);
    };

    const handleEditResult = async (result: MatchResultWithDetails) => {
        const match = matches.find(m => m.id === result.match_id);
        if (!match) return;

        setSelectedMatch(match);
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
            super_tiebreak_winner_id: result.super_tiebreak_winner_id || ''
        });
        setIsEditDialogOpen(true);
    };

    const handleSubmitResult = async () => {
        if (!selectedMatch) return;

        try {
            // Helper function to clear regular set score if tiebreak exists
            const getSetScore = (setNum: number) => {
                const tiebreakScore = formData[`set${setNum}_tiebreak_score` as keyof typeof formData];
                const regularScore = formData[`set${setNum}_score` as keyof typeof formData];

                // If there's a tiebreak, don't save the regular set score
                if (tiebreakScore && tiebreakScore !== 'none') {
                    return null;
                }
                return regularScore || null;
            };

            const resultData = {
                match_id: selectedMatch.id,
                winner_id: formData.winner_id,
                match_result: formData.match_result,
                set1_score: getSetScore(1),
                set2_score: getSetScore(2),
                set3_score: getSetScore(3),
                set4_score: getSetScore(4),
                set5_score: getSetScore(5),
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
                super_tiebreak_winner_id: formData.super_tiebreak_winner_id || null
            };

            await MatchResultsService.createMatchResult(resultData);

            toast.success('Match result added successfully');
            setIsAddDialogOpen(false);
            loadData();
        } catch (error) {
            console.error('Error adding match result:', error);
            toast.error('Failed to add match result');
        }
    };

    const handleUpdateResult = async () => {
        if (!selectedMatch) return;

        try {
            // Helper function to clear regular set score if tiebreak exists
            const getSetScore = (setNum: number) => {
                const tiebreakScore = formData[`set${setNum}_tiebreak_score` as keyof typeof formData];
                const regularScore = formData[`set${setNum}_score` as keyof typeof formData];

                // If there's a tiebreak, don't save the regular set score
                if (tiebreakScore && tiebreakScore !== 'none') {
                    return null;
                }
                return regularScore || null;
            };

            const resultData = {
                match_id: selectedMatch.id,
                winner_id: formData.winner_id,
                match_result: formData.match_result,
                set1_score: getSetScore(1),
                set2_score: getSetScore(2),
                set3_score: getSetScore(3),
                set4_score: getSetScore(4),
                set5_score: getSetScore(5),
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
                super_tiebreak_winner_id: formData.super_tiebreak_winner_id || null
            };

            await MatchResultsService.updateMatchResult(selectedMatch.id, resultData);

            toast.success('Match result updated successfully');
            setIsEditDialogOpen(false);
            loadData();
        } catch (error) {
            console.error('Error updating match result:', error);
            toast.error('Failed to update match result');
        }
    };

    const handleDeleteResult = async (resultId: string) => {
        if (!confirm('Are you sure you want to delete this match result?')) return;

        try {
            await MatchResultsService.deleteMatchResult(resultId);
            toast.success('Match result deleted successfully');
            loadData();
        } catch (error) {
            console.error('Error deleting match result:', error);
            toast.error('Failed to delete match result');
        }
    };

    // Apply filters whenever filter states change
    useEffect(() => {
        let filtered = matches;

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(match => match.status === statusFilter);
        }

        // Apply search term filter
        if (searchTerm) {
            filtered = filtered.filter(match =>
                normalizeText(match.player_a.first_name).includes(normalizeText(searchTerm)) ||
                normalizeText(match.player_a.last_name).includes(normalizeText(searchTerm)) ||
                normalizeText(match.player_b.first_name).includes(normalizeText(searchTerm)) ||
                normalizeText(match.player_b.last_name).includes(normalizeText(searchTerm)) ||
                normalizeText(match.tournaments?.name || '').includes(normalizeText(searchTerm))
            );
        }

        // Apply tournament filter
        if (tournamentFilter !== 'all') {
            filtered = filtered.filter(match => match.tournaments?.name === tournamentFilter);
        }

        // Apply date filter
        if (dateFilter !== 'all') {
            filtered = filtered.filter(match =>
                match.start_time && new Date(match.start_time).toDateString() === dateFilter
            );
        }

        setFilteredMatches(filtered);
    }, [matches, statusFilter, searchTerm, tournamentFilter, dateFilter]);

    // Group matches by date
    const groupedMatches = filteredMatches.reduce((groups, match) => {
        const date = match.start_time ? new Date(match.start_time).toDateString() : 'No Date';
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(match);
        return groups;
    }, {} as Record<string, Match[]>);

    const sortedGroups = Object.entries(groupedMatches).sort(([a], [b]) => {
        if (a === 'No Date') return 1;
        if (b === 'No Date') return -1;
        return new Date(b).getTime() - new Date(a).getTime();
    });

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Match Results</h1>
                <div className="flex gap-2">
                    <Button onClick={() => loadData()}>
                        Refresh
                    </Button>
                </div>
            </div>

            <MatchResultsFilters
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                tournamentFilter={tournamentFilter}
                setTournamentFilter={setTournamentFilter}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                tournaments={tournaments}
                dates={dates}
            />

            <MatchResultsTable
                groupedMatches={sortedGroups}
                matchResults={matchResults}
                onAddResult={handleAddResult}
                onEditResult={handleEditResult}
            />

            {/* Add Result Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Match Result</DialogTitle>
                    </DialogHeader>
                    <MatchResultForm
                        formData={formData}
                        setFormData={setFormData}
                        match={selectedMatch}
                        onSubmit={handleSubmitResult}
                        submitLabel="Add Result"
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Result Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Match Result</DialogTitle>
                    </DialogHeader>
                    <MatchResultForm
                        formData={formData}
                        setFormData={setFormData}
                        match={selectedMatch}
                        onSubmit={handleUpdateResult}
                        submitLabel="Update Result"
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
