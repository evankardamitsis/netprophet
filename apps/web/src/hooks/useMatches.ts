import { useState, useEffect, useMemo } from "react";
import { Match } from "@/types/dashboard";
import { fetchSyncedMatches } from "@/components/MatchesList";

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tournament filter state
  const [selectedTournament, setSelectedTournament] = useState<string | null>(
    null
  );

  // Load matches
  const loadMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedMatches = await fetchSyncedMatches();
      setMatches(fetchedMatches);
    } catch (err) {
      console.error("Error loading matches:", err);
      setError(err instanceof Error ? err.message : "Failed to load matches");
    } finally {
      setLoading(false);
    }
  };

  // Filter matches by selected tournament
  const filteredMatches = useMemo(() => {
    if (!selectedTournament) return matches;
    return matches.filter((match) => match.tournament === selectedTournament);
  }, [matches, selectedTournament]);

  // Memoize filtered match arrays
  const { liveMatches, upcomingMatches } = useMemo(() => {
    const live = filteredMatches.filter(
      (match) => match.status_display === "live"
    );
    const upcoming = filteredMatches.filter(
      (match) => match.status_display === "upcoming"
    );
    return { liveMatches: live, upcomingMatches: upcoming };
  }, [filteredMatches]);

  // Get unique tournaments for filter
  const tournaments = useMemo(() => {
    const uniqueTournaments = Array.from(
      new Set(matches.map((match) => match.tournament))
    );
    return uniqueTournaments.sort();
  }, [matches]);

  useEffect(() => {
    loadMatches();
  }, []);

  return {
    matches,
    filteredMatches,
    liveMatches,
    upcomingMatches,
    tournaments,
    selectedTournament,
    setSelectedTournament,
    loading,
    error,
    refresh: loadMatches,
  };
}
