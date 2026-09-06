-- Daily Run: generated cards and the review trail.
--
-- Additive only. Nothing in lib/daily writes to any pre-existing table.
--
-- Cards are generated offline after an upload, reviewed by a person, and only
-- then served. A card is immutable once approved: the answer and the numbers it
-- was computed from are pinned at generation time, so a card cannot quietly
-- change its mind when a player's record moves.

create table if not exists public.daily_cards (
    -- the card id, e.g. 'result:<match uuid>'
    id            text        not null,
    locale        text        not null check (locale in ('el', 'en')),

    -- which day's run this belongs to; null while unscheduled
    scheduled_for date,
    status        text        not null default 'draft'
                              check (status in ('draft', 'approved', 'rejected')),

    -- the GameCard the player sees, and the fact it was built from
    card          jsonb       not null,
    fact          jsonb       not null,
    interest      real        not null default 0,

    generated_at  timestamptz not null default now(),
    -- cards from live standings expire; a finished result never does
    valid_until   timestamptz,

    -- review trail
    reviewed_at   timestamptz,
    reviewed_by   text,
    reject_reason text,
    -- the card as generated, kept when a reviewer edits it
    original      jsonb,

    primary key (id, locale)
);

create index if not exists daily_cards_day_idx
    on public.daily_cards (scheduled_for, locale, status);
create index if not exists daily_cards_status_idx
    on public.daily_cards (status, interest desc);

comment on table public.daily_cards is
    'Daily Run cards: generated offline, reviewed, then served. See daily-run-content-spec.md §5.2.';
comment on column public.daily_cards.valid_until is
    'When the answer stops being safe to ask. Null for finished results.';
comment on column public.daily_cards.original is
    'The card as generated, kept only when a reviewer changed it.';

-- Every correction, as (fact, generated, corrected, reason). This is the corpus
-- the generator learns from — retrieval, not training. See spec §5.2.
create table if not exists public.daily_card_edits (
    id         uuid        primary key default gen_random_uuid(),
    card_id    text        not null,
    locale     text        not null check (locale in ('el', 'en')),
    -- which template produced it, so edit rate can be tracked per template
    card_kind  text        not null,
    fact       jsonb       not null,
    generated  jsonb       not null,
    corrected  jsonb,
    reason     text,
    created_at timestamptz not null default now()
);

create index if not exists daily_card_edits_kind_idx
    on public.daily_card_edits (card_kind, created_at desc);

comment on table public.daily_card_edits is
    'Reviewer corrections. Feeds the few-shot corpus and the per-template edit rate that earns autonomy.';

-- Locked down: only the service role touches these. The review screen and the
-- generator both run server-side; nothing here is reachable from a browser.
alter table public.daily_cards      enable row level security;
alter table public.daily_card_edits enable row level security;

drop policy if exists daily_cards_service_role on public.daily_cards;
create policy daily_cards_service_role on public.daily_cards
    for all to service_role using (true) with check (true);

drop policy if exists daily_card_edits_service_role on public.daily_card_edits;
create policy daily_card_edits_service_role on public.daily_card_edits
    for all to service_role using (true) with check (true);
