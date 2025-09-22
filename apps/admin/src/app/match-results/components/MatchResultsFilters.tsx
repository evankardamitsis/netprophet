'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Calendar, Trophy } from 'lucide-react';
import { FilterStatus } from '../types';

interface MatchResultsFiltersProps {
    statusFilter: FilterStatus;
    setStatusFilter: (value: FilterStatus) => void;
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    tournamentFilter: string;
    setTournamentFilter: (value: string) => void;
    dateFilter: string;
    setDateFilter: (value: string) => void;
    tournaments: string[];
    dates: string[];
}

export function MatchResultsFilters({
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    tournamentFilter,
    setTournamentFilter,
    dateFilter,
    setDateFilter,
    tournaments,
    dates
}: MatchResultsFiltersProps) {
    return (
        <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                    Filters
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Search */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            Search
                        </Label>
                        <Input
                            placeholder="Search players or tournaments..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={statusFilter} onValueChange={(value: FilterStatus) => setStatusFilter(value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="finished">Finished</SelectItem>
                                <SelectItem value="live">Live</SelectItem>
                                <SelectItem value="upcoming">Upcoming</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tournament Filter */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            Tournament
                        </Label>
                        <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Tournaments</SelectItem>
                                {tournaments.map(tournament => (
                                    <SelectItem key={tournament} value={tournament}>
                                        {tournament}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Filter */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Date
                        </Label>
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Dates</SelectItem>
                                {dates.map(date => (
                                    <SelectItem key={date} value={date}>
                                        {new Date(date).toLocaleDateString()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
