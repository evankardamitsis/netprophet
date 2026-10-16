-- Delete my account from the app (founder, 16 Oct 2026; App Store guideline 5.1.1(v)). The signed-in user is removed
-- from auth.users; every row tied to them is removed with it (votes, points, follows, cosmetics, push tokens, the
-- profile) or loses the link (a claimed roster player goes back to unclaimed, since the tournaments still list them;
-- matches they logged stay, without the link). Nothing can be undone.

create or replace function api.delete_my_account()
returns jsonb
language plpgsql security definer set search_path = core, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from auth.users where id = v_uid;
  return jsonb_build_object('deleted', true);
end;
$$;
revoke all on function api.delete_my_account() from public, anon;
grant execute on function api.delete_my_account() to authenticated;
