import { useState, useEffect } from 'react';
import { Player, fetchPlayerById, getPlayerMatchHistory, supabase } from '@netprophet/lib';
import { createSlug } from '@/lib/utils';

interface UsePlayerDataResult {
    player: Player | null;
    matchHistory: any[];
    doublesMatchHistory: any[];
    loading: boolean;
    isOwner: boolean;
    isAdmin: boolean;
    isOwnerOrAdmin: boolean;
}

export function usePlayerData(playerId: string, userId?: string): UsePlayerDataResult {
    const [player, setPlayer] = useState<Player | null>(null);
    const [loading, setLoading] = useState(true);
    const [matchHistory, setMatchHistory] = useState<any[]>([]);
    const [doublesMatchHistory, setDoublesMatchHistory] = useState<any[]>([]);
    const [isOwner, setIsOwner] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);

    useEffect(() => {
        const loadPlayer = async () => {
            try {
                setLoading(true);

                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId);
                let fetchedPlayerResult;

                if (isUUID) {
                    fetchedPlayerResult = await Promise.allSettled([
                        fetchPlayerById(playerId),
                        getPlayerMatchHistory(playerId, 'singles'),
                        getPlayerMatchHistory(playerId, 'doubles')
                    ]);
                } else {
                    let playerData: any = null;

                    const { data: slugMatchData, error: slugError } = await supabase
                        .rpc('get_player_by_slug', { slug_param: playerId });

                    if (!slugError && slugMatchData && slugMatchData.length > 0) {
                        playerData = slugMatchData[0];
                    } else {
                        const { data: idMatchData, error: idError } = await supabase
                            .from("players")
                            .select("*")
                            .eq("id", playerId)
                            .maybeSingle();

                        if (!idError && idMatchData) {
                            playerData = idMatchData;
                        } else {
                            const { data: limitedPlayers, error: playersError } = await supabase
                                .from("players")
                                .select("id, first_name, last_name")
                                .limit(5000);

                            if (playersError) {
                                console.error('Error fetching players for slug lookup:', playersError);
                                throw new Error(`Player not found with slug: ${playerId}`);
                            }

                            if (limitedPlayers && limitedPlayers.length > 0) {
                                const foundPlayer = limitedPlayers.find((p: any) => {
                                    if (!p.first_name || !p.last_name) return false;
                                    const playerName = `${p.first_name} ${p.last_name}`.trim();
                                    if (!playerName) return false;
                                    const slug = createSlug(playerName);
                                    return slug === playerId;
                                });

                                if (foundPlayer) {
                                    const { data: fullPlayer, error: fullError } = await supabase
                                        .from("players")
                                        .select("*")
                                        .eq("id", foundPlayer.id)
                                        .single();

                                    if (!fullError && fullPlayer) {
                                        playerData = fullPlayer;
                                    }
                                }
                            }

                            if (!playerData) {
                                const sampleSlugs = limitedPlayers?.slice(0, 10).map((p: any) => {
                                    if (!p.first_name || !p.last_name) return null;
                                    const name = `${p.first_name} ${p.last_name}`.trim();
                                    return { name, slug: createSlug(name) };
                                }).filter(Boolean) || [];

                                console.error('Player lookup failed:', {
                                    searchedSlug: playerId,
                                    slugError: slugError?.message,
                                    idError: idError?.message,
                                    limitedPlayersCount: limitedPlayers?.length || 0,
                                    sampleSlugs,
                                    suggestion: 'Check if player name matches slug generation logic'
                                });
                                throw new Error(`Player not found with slug or ID: ${playerId}`);
                            }
                        }
                    }

                    const mappedPlayer = {
                        id: playerData.id,
                        firstName: playerData.first_name,
                        lastName: playerData.last_name,
                        age: playerData.age,
                        ntrpRating: playerData.ntrp_rating,
                        hand: playerData.handed,
                        surfacePreference: playerData.surface_preference,
                        wins: playerData.wins || 0,
                        losses: playerData.losses || 0,
                        last5: playerData.last5 || [],
                        currentStreak: playerData.current_streak || 0,
                        streakType: playerData.streak_type,
                        aggressiveness: playerData.aggressiveness,
                        stamina: playerData.stamina,
                        consistency: playerData.consistency,
                        injuryStatus: playerData.injury_status,
                        isHidden: playerData.is_hidden,
                        isActive: playerData.is_active,
                        claimedByUserId: playerData.claimed_by_user_id,
                        photoUrl: playerData.photo_url,
                        hardWins: playerData.hard_wins,
                        hardLosses: playerData.hard_losses,
                        hardMatches: playerData.hard_matches,
                        hardWinRate: playerData.hard_win_rate,
                        clayWins: playerData.clay_wins,
                        clayLosses: playerData.clay_losses,
                        clayMatches: playerData.clay_matches,
                        clayWinRate: playerData.clay_win_rate,
                        grassWins: playerData.grass_wins,
                        grassLosses: playerData.grass_losses,
                        grassMatches: playerData.grass_matches,
                        grassWinRate: playerData.grass_win_rate,
                        doublesWins: playerData.doubles_wins ?? 0,
                        doublesLosses: playerData.doubles_losses ?? 0,
                        doublesLast5: playerData.doubles_last5 || [],
                        doublesCurrentStreak: playerData.doubles_current_streak ?? 0,
                        doublesStreakType: playerData.doubles_streak_type || 'W',
                    };

                    fetchedPlayerResult = await Promise.allSettled([
                        Promise.resolve(mappedPlayer),
                        getPlayerMatchHistory(mappedPlayer.id, 'singles'),
                        getPlayerMatchHistory(mappedPlayer.id, 'doubles')
                    ]);
                }

                const [fetchedPlayer, singlesHistory, doublesHistory] = fetchedPlayerResult;

                if (fetchedPlayer.status === 'fulfilled') {
                    const playerData = fetchedPlayer.value;
                    setPlayer(playerData);

                    if (userId) {
                        const userIsOwner = playerData.claimedByUserId === userId;
                        setIsOwner(userIsOwner);
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('is_admin')
                            .eq('id', userId)
                            .single();
                        const userIsAdmin = profile?.is_admin || false;
                        setIsAdmin(userIsAdmin);
                        setIsOwnerOrAdmin(userIsOwner || userIsAdmin);
                    }
                } else {
                    console.error('Error loading player:', fetchedPlayer.reason);
                }

                if (singlesHistory.status === 'fulfilled') {
                    setMatchHistory(singlesHistory.value.slice(0, 20));
                } else if (singlesHistory.status === 'rejected') {
                    console.error('Error loading singles match history:', singlesHistory.reason);
                }
                if (doublesHistory.status === 'fulfilled') {
                    setDoublesMatchHistory(doublesHistory.value.slice(0, 20));
                } else if (doublesHistory.status === 'rejected') {
                    console.error('Error loading doubles match history:', doublesHistory.reason);
                }
            } catch (error) {
                console.error('Error loading player data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (playerId) {
            loadPlayer();
        }
    }, [playerId, userId]);

    return {
        player,
        matchHistory,
        doublesMatchHistory,
        loading,
        isOwner,
        isAdmin,
        isOwnerOrAdmin,
    };
}
