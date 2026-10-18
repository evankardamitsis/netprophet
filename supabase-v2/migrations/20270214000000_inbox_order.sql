-- Founder, 18 Oct 2026: «σερί 5» and «σερί 3» on two screens. Results that resolve together (one sheet import, one
-- admin batch) run in one transaction, and now() is the transaction's start: every result card and σερί moment they
-- queued had the same created_at, so get_feed (order by created_at) handed them over in no fixed order. σερί 5 could
-- play before σερί 3, and a later result card before an earlier one, so the header's σερί went up and down.
-- The clock at insert keeps them in the order they happened. Nothing else reads feed_inbox.created_at as now().
alter table core.feed_inbox alter column created_at set default clock_timestamp();
