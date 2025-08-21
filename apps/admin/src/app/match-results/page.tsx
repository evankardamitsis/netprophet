'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase, MatchResultsService } from '@netprophet/lib';
import { MatchResultWithDetails } from '@/types';
import { toast } from 'sonner';
import { MatchResultsFilters } from './components/MatchResultsFilters';
import { MatchResultsTable } from './components/MatchResultsTable';
import { MatchResultForm } from './components/MatchResultForm';
import { Match, FilterStatus, FormData } from './types';

export default function MatchResultsPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [matchResults, setMatchResults] = useState<MatchResultWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingResult, setEditingResult] = useState<MatchResultWithDetails | null>(null);

    // Filter states
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('finished');
    const [searchTerm, setSearchTerm] = useState('');
    const [tournamentFilter, setTournamentFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');

    // Form state for new result
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
          player_a:players!matches_player_a_id_fkey(id, first_name, last_name),
          player_b:players!matches_player_b_id_fkey(id, first_name, last_name),
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
        } catch (error) {
            console.error('Error fetching matches:', error);
            toast.error('Failed to load matches');
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
            toast.error('Failed to load match results');
        }
    };

    // Filter matches based on current filters
    const filteredMatches = useMemo(() => {
        return matches.filter(match => {
            const matchesStatus = statusFilter === 'all' || match.status === statusFilter;
            const matchesSearch = !searchTerm ||
                match.player_a.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                match.player_a.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                match.player_b.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                match.player_b.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                match.tournaments?.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTournament = tournamentFilter === 'all' || match.tournaments?.name === tournamentFilter;
            const matchesDate = dateFilter === 'all' ||
                (match.start_time && new Date(match.start_time).toDateString() === dateFilter);

            return matchesStatus && matchesSearch && matchesTournament && matchesDate;
        });
    }, [matches, statusFilter, searchTerm, tournamentFilter, dateFilter]);

    // Group matches by date
    const groupedMatches = useMemo(() => {
        const groups: { [key: string]: Match[] } = {};

        filteredMatches.forEach(match => {
            const date = match.start_time ? new Date(match.start_time).toDateString() : 'No Date';
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(match);
        });

        return Object.entries(groups).sort(([a], [b]) => {
            if (a === 'No Date') return 1;
            if (b === 'No Date') return 1;
            return new Date(b).getTime() - new Date(a).getTime();
        });
    }, [filteredMatches]);

    // Get unique tournaments for filter
    const tournaments = useMemo(() => {
        const unique = [...new Set(matches.map(match => match.tournaments?.name).filter((name): name is string => Boolean(name)))];
        return unique.sort();
    }, [matches]);

    // Get unique dates for filter
    const dates = useMemo(() => {
        const unique = [...new Set(matches.map(match =>
            match.start_time ? new Date(match.start_time).toDateString() : null
        ).filter((date): date is string => date !== null))];
        return unique.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [matches]);

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
        setIsResultDialogOpen(true);
    };

    const handleEditResult = async (result: MatchResultWithDetails) => {
        setEditingResult(result);

        // Fetch the full match data for the form
        try {
            const { data: matchData, error } = await supabase
                .from('matches')
                .select(`
                    id,
                    player_a_id,
                    player_b_id,
                    player_a:players!matches_player_a_id_fkey(id, first_name, last_name),
                    player_b:players!matches_player_b_id_fkey(id, first_name, last_name),
                    tournaments(id, name, matches_type),
                    status,
                    start_time,
                    web_synced
                `)
                .eq('id', result.match_id)
                .single();

            if (error) throw error;

            // Transform the data to match our interface
            const transformedMatch = {
                id: matchData.id,
                player_a: {
                    id: matchData.player_a?.id || '',
                    first_name: matchData.player_a?.first_name || '',
                    last_name: matchData.player_a?.last_name || ''
                },
                player_b: {
                    id: matchData.player_b?.id || '',
                    first_name: matchData.player_b?.first_name || '',
                    last_name: matchData.player_b?.last_name || ''
                },
                tournaments: Array.isArray(matchData.tournaments) ? matchData.tournaments[0] : matchData.tournaments,
                status: matchData.status,
                start_time: matchData.start_time,
                web_synced: matchData.web_synced
            };

            setSelectedMatch(transformedMatch);
        } catch (error) {
            console.error('Error fetching match data for editing:', error);
            toast.error('Failed to load match data for editing');
            return;
        }

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
                const tiebreakScore = formData[`set${setNum}_tiebreak_score`];
                const regularScore = formData[`set${setNum}_score`];

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
            // Helper function to clear regular set score if tiebreak exists
            const getSetScore = (setNum: number) => {
                const tiebreakScore = formData[`set${setNum}_tiebreak_score`];
                const regularScore = formData[`set${setNum}_score`];

                // If there's a tiebreak, don't save the regular set score
                if (tiebreakScore && tiebreakScore !== 'none') {
                    return null;
                }
                return regularScore || null;
            };

            const resultData = {
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
                super_tiebreak_winner_id: formData.super_tiebreak_winner_id || null,
            };

            await MatchResultsService.updateMatchResult(editingResult.id, resultData);
            toast.success('Match result updated successfully');
            setIsEditDialogOpen(false);
            fetchMatchResults();
        } catch (error) {
            console.error('Error updating match result:', error);
            toast.error('Failed to update match result');
        }
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

            {/* Filters */}
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

            {/* Results Table */}
            <MatchResultsTable
                groupedMatches={groupedMatches}
                matchResults={matchResults}
                onAddResult={handleAddResult}
                onEditResult={handleEditResult}
            />

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
