-- ---------------------------------------------------------------------------
-- 0013: the two Advisor criticals
--
-- Both flagged by the Supabase security advisor on 2026-08-20. Neither is a
-- data leak today, but both are real sharp edges and one hides a client bug.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. public.spatial_ref_sys has no RLS
-- ---------------------------------------------------------------------------
--
-- The table belongs to the PostGIS extension and is owned by it, so
-- `alter table ... enable row level security` fails from here: we are not
-- the owner. What the advisor is actually worried about is that the table
-- rides the public schema into PostgREST, where any client can read it and,
-- with PostGIS's default PUBLIC grants, potentially write it.
--
-- So close the exposure instead of the lint: no client role keeps any
-- privilege on it. It holds only spatial reference definitions, and every
-- PostGIS call in this schema happens inside a SECURITY DEFINER function
-- (0004), which runs as the function owner and is unaffected.

revoke all on table public.spatial_ref_sys from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. leaderboard_global runs as its owner
-- ---------------------------------------------------------------------------
--
-- A plain view executes with the view owner's privileges, which silently
-- bypasses RLS on profiles. For a leaderboard that bypass IS the feature: a
-- board cannot rank rows its reader is not allowed to see. But this schema
-- already has a convention for deliberate privilege crossings, and it is not
-- "a view that happens to be owned by postgres": it is a SECURITY DEFINER
-- function with a pinned search_path and explicit EXECUTE grants, like
-- leaderboard_friends() one file over in 0003.
--
-- Converting also surfaces a client bug that the view was hiding:
-- social.repo.ts selected and sorted a column named `xp`, which the view has
-- not had since 0003 renamed the ranking to season_xp. The function returns
-- rows already ranked, so the client no longer orders anything itself.

drop view if exists public.leaderboard_global;

create or replace function public.leaderboard_global(p_limit int default 50)
returns table (user_id uuid, handle text, level int, season_xp int, rank bigint)
language sql stable security definer set search_path = public as $$
  select
    p.user_id,
    p.handle,
    p.level,
    p.season_xp,
    rank() over (order by p.season_xp desc, p.created_at asc) as rank
  from profiles p
  where not p.banned
  order by p.season_xp desc, p.created_at asc
  limit greatest(1, least(p_limit, 200));
$$;

-- Same posture as every other definer function here: nobody by default,
-- authenticated by grant. A signed-out reader has no business enumerating
-- every handle on the platform.
revoke execute on function public.leaderboard_global(int) from public, anon;
grant execute on function public.leaderboard_global(int) to authenticated;
