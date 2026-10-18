import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from './types';
import type {
  BlockedUser,
  CastVoteResult,
  ClaimCandidate,
  ConfirmationAnswer,
  GetFeedResult,
  GetBadgesResult,
  GetLookResult,
  GetMyLevelResult,
  LookCategory,
  GetQuestsResult,
  GetQuizResult,
  GetTournamentResult,
  GetTournamentsResult,
  UpcomingTournamentsResult,
  AnswerCardResult,
  KudoOption,
  LinkKudo,
  LogMatchInput,
  MatchFormat,
  MatchLink,
  MatchLinkView,
  MyMatchCandidate,
  Ladder,
  LadderScope,
  MePage,
  MeResult,
  MyTraits,
  PlayerCard,
  PlayerProfile,
  PlayerTraits,
  PendingConfirmation,
  Reactions,
  ReceivedKudo,
  ReportReason,
  PlayersHome,
  ProState,
  PublicTournament,
  ResolveMatchResult,
  ResultRow,
  ProOffer,
  ProOfferMoment,
  ResultsTournament,
  Scout,
  SetScore,
  Side,
  SuggestedPlayer,
  WinLossSplits,
  MySeason,
  WinCard,
} from './rpc';

export const API_SCHEMA = 'api' as const;

/** A Supabase client bound to the `api` schema (the only schema exposed to clients). */
export type NetprophetClient = SupabaseClient<Database, typeof API_SCHEMA>;

export type ClientOptions = Omit<SupabaseClientOptions<typeof API_SCHEMA>, 'db'>;

/** Public client: publishable key, user JWT after sign-in. Used by apps/app and apps/site. */
export function createNetprophetClient(url: string, publishableKey: string, options: ClientOptions = {}): NetprophetClient {
  return createClient<Database, typeof API_SCHEMA>(url, publishableKey, { ...options, db: { schema: API_SCHEMA } });
}

/** Service-role client for edge functions and the admin server actions. Never ship the key to a browser or app. */
export function createServiceClient(url: string, serviceRoleKey: string, options: ClientOptions = {}): NetprophetClient {
  return createNetprophetClient(url, serviceRoleKey, {
    ...options,
    auth: { persistSession: false, autoRefreshToken: false, ...options.auth },
  });
}

export class RpcError extends Error {
  constructor(
    public readonly fn: string,
    /** the machine code raised by the SQL function, e.g. voting_closed, already_voted, forbidden */
    public readonly code: string,
    public readonly sqlState: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'RpcError';
  }
}

async function call<T>(client: NetprophetClient, fn: keyof Database['api']['Functions'], args: object): Promise<T> {
  // supabase-js types rpc args per function; the typed wrappers below pin them
  const { data, error } = await (client.rpc as unknown as (f: string, a: object) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>)(
    fn,
    args,
  );
  if (error) {
    const code = error.message.split(/[:\s]/)[0] ?? 'error';
    throw new RpcError(fn, code, error.code, error.message);
  }
  return data as T;
}

/** Typed wrappers for the game RPCs. Rules live in the database; these only move data. */
export function rpc(client: NetprophetClient) {
  return {
    castVote: (matchId: string, side: Side, clientEventId?: string) =>
      call<CastVoteResult>(client, 'cast_vote', { p_match_id: matchId, p_side: side, p_client_event_id: clientEventId }),
    getFeed: (limit = 20) => call<GetFeedResult>(client, 'get_feed', { p_limit: limit }),
    getQuests: () => call<GetQuestsResult>(client, 'get_quests', {}),
    getQuiz: () => call<GetQuizResult>(client, 'get_quiz', {}),
    /** option is 1-based */
    answerCard: (cardId: string, option: number, clientEventId?: string) =>
      call<AnswerCardResult>(client, 'answer_card', { p_card: cardId, p_option: option, p_client_event_id: clientEventId }),
    getBadges: () => call<GetBadgesResult>(client, 'get_badges', {}),
    /** wear a badge on the card, or null to take it off */
    wearBadge: (key: string | null) => call<{ worn: string | null }>(client, 'wear_badge', { p_key: key }),
    getLook: () => call<GetLookResult>(client, 'get_look', {}),
    /** wear an item you own; a null key takes the frame or background off */
    equipItem: (category: LookCategory, key: string | null) =>
      call<GetLookResult>(client, 'equip_item', { p_category: category, p_key: key }),
    /** the drawn avatar you picked (one of the 12 defaults), or null for the default */
    setAvatar: (key: string | null) => call<{ avatar: string | null }>(client, 'set_avatar', { p_key: key }),
    /** your Baller: its name (null until named), your avatar pick, and whether you have met it */
    getBaller: () => call<{ name: string | null; avatar: string | null; met: boolean }>(client, 'get_baller', {}),
    /** other players' Ballers (the podium): style, name, kit and gear; hidden profiles left out */
    getBallers: (users: string[]) =>
      call<{ user_id: string; avatar: string; gender: 'm' | 'f' | null; name: string | null; kit: string | null; gear: string | null }[]>(client, 'get_ballers', { p_users: users }),
    /** name your Baller; null clears it. Refused with bad_name or name_not_allowed */
    setBallerName: (name: string | null) => call<{ name: string | null }>(client, 'set_baller_name', { p_name: name }),
    getMyLevel: () => call<GetMyLevelResult>(client, 'get_my_level', {}),
    getMe: () => call<MeResult>(client, 'get_me', {}),
    /** delete the signed-in account and everything that is theirs; cannot be undone */
    deleteMyAccount: () => call<{ deleted: boolean }>(client, 'delete_my_account', {}),
    getMePage: () => call<MePage>(client, 'get_me_page', {}),
    getPro: () => call<ProState>(client, 'get_pro', {}),
    proOffer: () => call<ProOffer>(client, 'pro_offer', {}),
    proOfferShown: (moment: ProOfferMoment) => call<null>(client, 'pro_offer_shown', { p_moment: moment }),
    getConfirmations: () => call<PendingConfirmation[]>(client, 'get_confirmations', {}),
    answerConfirmation: (matchId: string, a: ConfirmationAnswer) =>
      call<{ match_id: string; outcome: 'confirmed' | 'corrected' | 'disputed' }>(client, 'answer_confirmation', {
        p_match_id: matchId,
        p_answer: a.answer,
        p_fix: a.answer === 'fix' ? a.fix : null,
      }),
    /** the opponent link: the logger's side */
    matchLinks: (matchId: string) => call<MatchLink[]>(client, 'match_links', { p_match_id: matchId }),
    /** the opponent link: the visitor's side, with or without an account */
    getMatchLink: (token: string) => call<MatchLinkView>(client, 'get_match_link', { p_token: token }),
    answerLink: (token: string, a: ConfirmationAnswer) =>
      call<{ match_id: string; outcome: 'confirmed' | 'corrected' | 'disputed' }>(client, 'answer_link', {
        p_token: token,
        p_answer: a.answer,
        p_fix: a.answer === 'fix' ? a.fix : null,
      }),
    linkKudo: (token: string, kudo: LinkKudo) => call<null>(client, 'link_kudo', { p_token: token, p_kudo: kudo }),
    hideViaLink: (token: string, hidden: boolean) => call<{ player_id: string; hidden: boolean }>(client, 'hide_via_link', { p_token: token, p_hidden: hidden }),
    claimViaLink: (token: string) => call<{ player_id: string; claimed: boolean; replayed: boolean }>(client, 'claim_via_link', { p_token: token }),
    kudosOptions: (matchId: string, toPlayer?: string) =>
      call<KudoOption[]>(client, 'kudos_options', { p_match_id: matchId, ...(toPlayer ? { p_to_player: toPlayer } : {}) }),
    giveKudo: (matchId: string, key: string, toPlayer?: string) =>
      call<{ match_id: string; given: number }>(client, 'give_kudo', { p_match_id: matchId, p_option_key: key, ...(toPlayer ? { p_to_player: toPlayer } : {}) }),
    react: (matchId: string, key: string | null) => call<Reactions>(client, 'react', { p_match_id: matchId, p_key: key as string }),
    getTraits: (playerId: string) => call<PlayerTraits>(client, 'get_traits', { p_player: playerId }),
    voteTrait: (playerId: string, traitId: string, on: boolean) =>
      call<PlayerTraits>(client, 'vote_trait', { p_player: playerId, p_trait: traitId, p_on: on }),
    suggestTrait: (playerId: string, label: string) => call<PlayerTraits>(client, 'suggest_trait', { p_player: playerId, p_label: label }),
    getMyTraits: () => call<MyTraits>(client, 'get_my_traits', {}),
    getMyKudos: () => call<ReceivedKudo[]>(client, 'get_my_kudos', {}),
    report: (type: 'match' | 'player', id: string, reason: ReportReason, note?: string) =>
      call<{ reported: boolean }>(client, 'report', { p_entity_type: type, p_entity_id: id, p_reason: reason, ...(note ? { p_note: note } : {}) }),
    block: (by: { playerId: string } | { matchId: string }) =>
      call<{ blocked: boolean }>(client, 'block', 'playerId' in by ? { p_player_id: by.playerId } : { p_match_id: by.matchId }),
    blockTarget: (by: { playerId: string } | { matchId: string }) =>
      call<{ first_name: string | null; gender: 'm' | 'f' | null; blocked: boolean } | null>(
        client, 'block_target', 'playerId' in by ? { p_player_id: by.playerId } : { p_match_id: by.matchId }),
    unblock: (userId: string) => call<null>(client, 'unblock', { p_user_id: userId }),
    getBlocks: () => call<BlockedUser[]>(client, 'get_blocks', {}),
    getTournaments: () => call<GetTournamentsResult>(client, 'get_tournaments', {}),
    upcomingTournaments: () => call<UpcomingTournamentsResult>(client, 'upcoming_tournaments', {}),
    getTournament: (id: string) => call<GetTournamentResult>(client, 'get_tournament', { p_id: id }),
    listTournaments: () => call<PublicTournament[]>(client, 'list_tournaments', {}),
    findMyMatches: (people: string[], date: string, format: MatchFormat) =>
      call<MyMatchCandidate[]>(client, 'find_my_matches', { p_people: people, p_date: date, p_format: format }),
    logMatch: (input: LogMatchInput) => call<{ match_id: string; mode: 'played' | 'soon' }>(client, 'log_match', { p: input }),
    getWinLoss: () => call<WinLossSplits>(client, 'get_win_loss', {}),
    /** «Η σεζόν σου»: a month key like '2026-10', or the current month */
    mySeason: (month: string | null = null) => call<MySeason>(client, 'my_season', month ? { p_month: month } : {}),
    /** a share card of one of your own wins */
    winCard: (matchId: string) => call<WinCard>(client, 'win_card', { p_match: matchId }),
    getScout: (matchId: string) => call<Scout>(client, 'get_scout', { p_match_id: matchId }),
    joinProWaitlist: () => call<boolean>(client, 'join_pro_waitlist', {}),
    adminGrantPro: (userId: string, days = 30) => call<{ id: string; ends_at: string }>(client, 'admin_grant_pro', { p_user_id: userId, p_days: days }),
    getResults: (days = 14, limit = 60, tournament: string | null = null, query: string | null = null) =>
      call<ResultRow[]>(client, 'get_results', { p_days: days, p_limit: limit, p_tournament: tournament, p_query: query }),
    resultsTournaments: () => call<ResultsTournament[]>(client, 'results_tournaments', {}),
    getLadder: (scope: LadderScope, limit = 20) => call<Ladder>(client, 'get_ladder', { p_scope: scope, p_limit: limit }),
    getPlayersHome: (limit = 60) => call<PlayersHome>(client, 'get_players_home', { p_limit: limit }),
    findPlayers: (query: string, limit = 20) => call<PlayerCard[]>(client, 'find_players', { p_query: query, p_limit: limit }),
    getPlayer: (playerId: string) => call<PlayerProfile>(client, 'get_player', { p_player_id: playerId }),
    suggestPlayers: (limit = 30) => call<SuggestedPlayer[]>(client, 'suggest_players', { p_limit: limit }),
    followPlayers: (playerIds: string[]) => call<number>(client, 'follow_players', { p_player_ids: playerIds, p_source: 'onboarding' }),
    setClaimStatus: (status: 'skipped' | 'creation_requested') => call<string>(client, 'set_claim_status', { p_status: status }),
    findMatchingPlayers: (firstName: string, surname: string) =>
      call<ClaimCandidate[]>(client, 'find_matching_players', { p_name: firstName, p_surname: surname }),
    registerPushToken: (token: string, platform: 'ios' | 'android') =>
      call<boolean>(client, 'register_push_token', { p_token: token, p_platform: platform }),
    unregisterPushToken: (token: string) => call<boolean>(client, 'unregister_push_token', { p_token: token }),
    markInboxSeen: (ids: string[]) => call<number>(client, 'mark_inbox_seen', { p_ids: ids }),
    claimPlayer: (playerId: string) => call<{ player_id: string; claimed: boolean; replayed: boolean }>(client, 'claim_player', { p_player_id: playerId }),
    followPlayer: (playerId: string, relation: 'known' | 'friend' = 'known', source: 'onboarding' | 'profile' | 'card' | 'invite' = 'profile') =>
      call<void>(client, 'follow_player', { p_player_id: playerId, p_relation: relation, p_source: source }),
    unfollowPlayer: (playerId: string) => call<void>(client, 'unfollow_player', { p_player_id: playerId }),
    updateProfile: (patch: Record<string, unknown>) => call<{ user_id: string }>(client, 'update_profile', { p_patch: patch }),
    /** admin / service only */
    resolveMatch: (matchId: string) => call<ResolveMatchResult>(client, 'resolve_match', { p_match_id: matchId }),
    /** admin / editor / service only */
    adminSetResult: (matchId: string, winnerSide: Side, sets: SetScore[], opts: { retired?: boolean; walkover?: boolean } = {}) =>
      call<{ match_id: string; result_version: number }>(client, 'admin_set_result', {
        p_match_id: matchId,
        p_winner_side: winnerSide,
        p_sets: sets,
        p_retired: opts.retired ?? false,
        p_walkover: opts.walkover ?? false,
      }),
  };
}
