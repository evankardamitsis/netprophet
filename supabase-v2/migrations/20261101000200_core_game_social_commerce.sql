-- NetProphet v2 baseline 3/8: game state, social, commerce, messaging.
-- All of these are written ONLY by SECURITY DEFINER RPCs / service role (see RLS migration).

-- ---------------------------------------------------------------------------
-- Votes and points
-- ---------------------------------------------------------------------------
create table core.votes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  subject_type     text not null check (subject_type in ('match', 'card')),
  subject_id       uuid not null,
  option           smallint not null check (option >= 1),   -- match: side 1 or 2; card: option index + 1
  client_event_id  uuid unique,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  outcome          text check (outcome in ('correct', 'wrong', 'none')),
  is_upset_call    boolean not null default false,
  points           int not null default 0,
  day_key          date not null default core.athens_day(),
  unique (user_id, subject_type, subject_id),                -- one vote per user and subject
  check (subject_type <> 'match' or option in (1, 2)),
  check ((resolved_at is null) = (outcome is null))
);
create index votes_subject_idx on core.votes (subject_type, subject_id) where resolved_at is null;
create index votes_subject_all_idx on core.votes (subject_type, subject_id, option);

-- append-only; the unique key is the idempotency guard
create table core.points_ledger (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references auth.users (id) on delete cascade,
  delta            int not null,
  reason           text not null check (reason in ('correct', 'upset', 'chain', 'daily_quiz', 'correction', 'admin_adjust')),
  ref_type         text not null check (ref_type in ('match', 'card', 'quiz_day', 'admin')),
  ref_id           uuid not null,
  month_key        text not null,
  idempotency_key  text not null unique,
  created_at       timestamptz not null default now(),
  unique (user_id, reason, ref_type, ref_id)
);
comment on table core.points_ledger is
  'Append-only. No reason can reference a purchase: money never buys points (CHECK on reason and ref_type).';
create index points_ledger_user_month_idx on core.points_ledger (user_id, month_key);

create table core.user_game_state (
  user_id                  uuid primary key references auth.users (id) on delete cascade,
  total_points             int not null default 0,
  streak                   int not null default 0 check (streak >= 0),     -- σερί
  streak_best              int not null default 0 check (streak_best >= 0), -- ΠΡ
  chain                    int not null default 0 check (chain >= 0),       -- bonus chain (paid freeze restarts it)
  votes_cast               int not null default 0,
  votes_correct            int not null default 0,
  votes_since_free_freeze  int not null default 0,
  first_free_at3_done      boolean not null default false,
  active_days              int not null default 0,
  last_active_day          date,
  broke_at                 timestamptz,
  version                  int not null default 0,
  updated_at               timestamptz not null default now()
);

create table core.freezes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  kind             text not null check (kind in ('free', 'paid')),
  source           text not null check (source in ('streak3', 'every15', 'purchase', 'gift')),
  acquired_at      timestamptz not null default now(),
  used_at          timestamptz,
  used_on_vote_id  uuid references core.votes (id),
  check ((used_at is null) = (used_on_vote_id is null))
);
create index freezes_unused_idx on core.freezes (user_id) where used_at is null;

create table core.streak_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  vote_id     uuid references core.votes (id),
  streak_before int not null,
  streak_after  int not null,
  freeze_id   uuid references core.freezes (id),
  kind        text not null check (kind in ('correct', 'broke', 'freeze_used', 'freeze_earned')),
  created_at  timestamptz not null default now()
);
create index streak_events_user_idx on core.streak_events (user_id, id);

-- per-user queue of result cards, celebrations, unlocks (played one by one)
create table core.feed_inbox (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('result', 'celebration', 'unlock', 'month_close')),
  ref         text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  seen_at     timestamptz,
  unique (user_id, kind, ref)
);
create index feed_inbox_unseen_idx on core.feed_inbox (user_id, created_at) where seen_at is null;

-- ---------------------------------------------------------------------------
-- Quests, badges, unlock ladder
-- ---------------------------------------------------------------------------
create table core.quest_defs (
  key        text primary key,
  period     text not null check (period in ('daily', 'weekly', 'once')),
  target     int not null check (target > 0),
  counter    text not null,
  reward     jsonb not null default '{}'::jsonb,   -- cosmetic item key or badge bonus
  title_el   text not null,
  title_en   text not null,
  active     boolean not null default true,
  sort       int not null default 0
);

-- lazy periods ('2026-10-08', '2026-W41'): no reset job needed
create table core.user_quest_progress (
  user_id           uuid not null references auth.users (id) on delete cascade,
  quest_key         text not null references core.quest_defs (key),
  period_key        text not null,
  progress          int not null default 0,
  done_at           timestamptz,
  reward_granted_at timestamptz,
  primary key (user_id, quest_key, period_key)
);

create table core.badge_defs (
  key           text primary key,
  name_el       text not null,
  name_en       text not null,
  counter       text not null,
  thresholds    int[] not null check (array_length(thresholds, 1) = 3),
  tier3_reward  jsonb not null default '{}'::jsonb,
  sort          int not null default 0
);

create table core.user_badges (
  user_id      uuid not null references auth.users (id) on delete cascade,
  badge_key    text not null references core.badge_defs (key),
  counter      int not null default 0,
  tier         int not null default 0 check (tier between 0 and 3),
  tier_up_at   timestamptz,
  primary key (user_id, badge_key)
);

create table core.unlock_defs (
  key           text primary key,
  step          int not null unique,
  primary_rule  jsonb not null,
  backup_votes  int not null,
  title_el      text,
  title_en      text
);

create table core.unlock_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  unlock_key   text not null references core.unlock_defs (key),
  unlocked_at  timestamptz not null default now(),
  seen_at      timestamptz,
  primary key (user_id, unlock_key)
);

-- ---------------------------------------------------------------------------
-- Levels (voted by the crowd) and traits
-- ---------------------------------------------------------------------------
create table core.trait_defs (
  id          uuid primary key default gen_random_uuid(),
  sport_id    text not null references core.sports (id),
  label_el    jsonb not null,          -- {"m": "...", "f": "..."}
  label_en    text not null,
  status      text not null default 'pending' check (status in ('pending', 'approved')),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table core.trait_votes (
  voter_user_id  uuid not null references auth.users (id) on delete cascade,
  player_id      uuid not null references core.players (id) on delete cascade,
  sport_id       text not null references core.sports (id),
  trait_id       uuid not null references core.trait_defs (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (voter_user_id, player_id, trait_id)
);

create table core.level_snapshots (
  id            bigint generated always as identity primary key,
  player_id     uuid not null references core.players (id) on delete cascade,
  sport_id      text not null references core.sports (id),
  value         numeric(4, 2) not null,
  tier          int not null,
  direction     text not null check (direction in ('up', 'same', 'down')),
  inputs        jsonb not null default '{}'::jsonb,
  algo_version  int not null default 1,
  computed_at   timestamptz not null default now()
);
create index level_snapshots_player_idx on core.level_snapshots (player_id, sport_id, computed_at desc);

-- ---------------------------------------------------------------------------
-- Monthly ladder: points per month come from the ledger; leagues hold the groups of 20
-- ---------------------------------------------------------------------------
create table core.leagues (
  id         uuid primary key default gen_random_uuid(),
  month_key  text not null check (month_key ~ '^\d{4}-\d{2}$'),
  tier       text not null check (tier in ('bronze', 'silver', 'gold')),
  group_no   int not null check (group_no > 0),
  unique (month_key, tier, group_no)
);

create table core.league_members (
  league_id   uuid not null references core.leagues (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  final_rank  int,
  outcome     text check (outcome in ('promoted', 'relegated', 'stayed')),
  primary key (league_id, user_id)
);
create index league_members_user_idx on core.league_members (user_id);

-- ---------------------------------------------------------------------------
-- Daily quiz «Οι 6 της ημέρας»
-- ---------------------------------------------------------------------------
create table core.quiz_templates (
  id                uuid primary key default gen_random_uuid(),
  family            text not null,
  trigger           text not null,
  slot_template     jsonb not null default '{}'::jsonb,
  option_templates  jsonb not null default '[]'::jsonb,
  guardrails        jsonb not null default '{}'::jsonb,   -- e.g. {"exclude_minors": true}
  active            boolean not null default true
);

create table core.quiz_cards (
  id                  uuid primary key default gen_random_uuid(),
  sport_id            text not null references core.sports (id),
  family              text not null,
  kind                text not null check (kind in ('static', 'dynamic')),
  template_id         uuid references core.quiz_templates (id),
  content             jsonb not null,                      -- question, options, clues, right_index, result data
  subject_player_ids  uuid[] not null default '{}',
  subject_match_id    uuid references core.matches (id) on delete set null,
  "when"              text check ("when" in ('before', 'after', 'weekly')),
  status              text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  valid_from          timestamptz,
  valid_to            timestamptz,
  created_at          timestamptz not null default now(),
  check (kind <> 'dynamic' or template_id is not null)
);

-- ---------------------------------------------------------------------------
-- Kudos, reactions, gifts
-- ---------------------------------------------------------------------------
create table core.kudos_options (
  id      uuid primary key default gen_random_uuid(),
  forms   jsonb not null,          -- {"m": "...", "f": "...", "plural": "..."}
  active  boolean not null default true
);

create table core.kudos (
  id             uuid primary key default gen_random_uuid(),
  from_user_id   uuid not null references auth.users (id) on delete cascade,
  to_player_id   uuid not null references core.players (id) on delete cascade,
  match_id       uuid not null references core.matches (id) on delete cascade,
  option_id      uuid not null references core.kudos_options (id),
  created_at     timestamptz not null default now(),
  unique (from_user_id, match_id)
);

create table core.reaction_pool (
  key       text primary key,
  label_el  text not null,
  label_en  text not null,
  active    boolean not null default true
);

create table core.reactions (
  user_id       uuid not null references auth.users (id) on delete cascade,
  match_id      uuid not null references core.matches (id) on delete cascade,
  reaction_key  text not null references core.reaction_pool (key),
  created_at    timestamptz not null default now(),
  primary key (user_id, match_id)                         -- one pick per user per match
);

create table core.gifts (
  id                  uuid primary key default gen_random_uuid(),
  giver_user_id       uuid not null references auth.users (id) on delete cascade,
  receiver_player_id  uuid not null references core.players (id),
  receiver_user_id    uuid references auth.users (id) on delete set null,
  product_sku         text not null,
  match_id            uuid references core.matches (id) on delete set null,
  status              text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at          timestamptz not null default now(),
  accepted_at         timestamptz
);

-- ---------------------------------------------------------------------------
-- Cosmetics, Pro, sponsors
-- ---------------------------------------------------------------------------
create table core.cosmetic_items (
  id              uuid primary key default gen_random_uuid(),
  category        text not null check (category in ('frame', 'background', 'kit', 'win_effect')),
  key             text not null unique,
  name_el         text not null,
  name_en         text not null,
  kind            text not null check (kind in ('free', 'earned', 'buy', 'pack')),
  price_eur       numeric(6, 2) check (price_eur is null or price_eur >= 0),
  earn_rule_text  text,
  assets          jsonb not null default '{}'::jsonb,
  sport_id        text references core.sports (id),     -- null = all sports
  active          boolean not null default true
);

create table core.user_cosmetics (
  user_id   uuid not null references auth.users (id) on delete cascade,
  item_id   uuid not null references core.cosmetic_items (id),
  source    text not null check (source in ('earned', 'bought', 'gift', 'migration')),
  at        timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table core.user_equipped (
  user_id   uuid not null references auth.users (id) on delete cascade,
  category  text not null check (category in ('frame', 'background', 'kit', 'win_effect')),
  item_id   uuid not null references core.cosmetic_items (id),
  primary key (user_id, category)
);

create table core.entitlements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  key        text not null default 'pro' check (key in ('pro')),
  source     text not null check (source in ('subscription', 'gift', 'promo', 'migration', 'waitlist')),
  status     text not null check (status in ('active', 'waitlist', 'expired')),
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,
  created_at timestamptz not null default now()
);
create index entitlements_user_idx on core.entitlements (user_id, key);

create table core.sponsored_cards (
  id           uuid primary key default gen_random_uuid(),
  sponsor      text not null,
  category     text not null default 'general'
               check (lower(category) not in ('betting', 'gambling', 'casino', 'bookmaker')),   -- no betting advertisers
  title        text not null,
  subtitle     text,
  cta_url      text,
  placement    text not null check (placement in ('feed', 'results')),
  area_ids     text[] not null default '{}',
  starts_at    timestamptz,
  ends_at      timestamptz,
  weight       int not null default 1 check (weight > 0),
  status       text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  impressions  bigint not null default 0,
  clicks       bigint not null default 0,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Messaging and ops
-- ---------------------------------------------------------------------------
create table core.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  type          text not null,
  payload       jsonb not null default '{}'::jsonb,
  channel       text not null default 'in_app' check (channel in ('push', 'in_app')),
  dedupe_key    text not null unique,
  scheduled_at  timestamptz not null default now(),
  sent_at       timestamptz,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index notifications_user_idx on core.notifications (user_id, created_at desc);

create table core.outbox (
  id               bigint generated always as identity primary key,
  kind             text not null,
  payload          jsonb not null default '{}'::jsonb,
  idempotency_key  text not null unique,
  run_after        timestamptz not null default now(),
  attempts         int not null default 0,
  last_error       text,
  done_at          timestamptz,
  created_at       timestamptz not null default now()
);
create index outbox_pending_idx on core.outbox (run_after) where done_at is null;
