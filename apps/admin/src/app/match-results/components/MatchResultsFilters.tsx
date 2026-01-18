'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, Calendar, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
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
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900">
                    <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                    Filters
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2"
                >
                    {isExpanded ? (
                        <>
                            <span className="hidden sm:inline">Collapse</span>
                            <ChevronUp className="h-4 w-4" />
                        </>
                    ) : (
                        <>
                            <span className="hidden sm:inline">Expand</span>
                            <ChevronDown className="h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
            {isExpanded && (
                <div className="pt-4 space-y-4">
                    {/* Mobile-Optimized Search */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <Search className="h-4 w-4 text-gray-500" />
                            Search Players or Tournaments
                        </Label>
                        <Input
                            placeholder="Type to search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-11 text-base"
                        />
                    </div>

                    {/* Mobile-Optimized Filter Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Status Filter */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">Match Status</Label>
                            <Select value={statusFilter} onValueChange={(value: FilterStatus) => setStatusFilter(value)}>
                                <SelectTrigger className="h-11 text-base">
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
                            <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <Trophy className="h-4 w-4 text-gray-500" />
                                Tournament
                            </Label>
                            <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
                                <SelectTrigger className="h-11 text-base">
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
                        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                            <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                Date
                            </Label>
                            <Select value={dateFilter} onValueChange={setDateFilter}>
                                <SelectTrigger className="h-11 text-base">
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
                </div>
            )}
        </div>
    );
}
