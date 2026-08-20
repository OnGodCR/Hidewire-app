-- ---------------------------------------------------------------------------
-- 0014: move PostGIS out of the public schema
--
-- 0013 tried to close the advisor's spatial_ref_sys finding with a revoke and
-- could not: the table's grants were made by supabase_admin, and postgres,
-- which migrations run as, cannot revoke another grantor's grants. Probing
-- the live API proved the hole is real and worse than the lint says: an
-- anonymous client's INSERT into spatial_ref_sys failed on the srid CHECK
-- constraint, not on permissions, which means anon holds WRITE privileges on
-- a table that cannot get RLS (the extension owns it) and that PostGIS
-- consults for coordinate transforms. Corrupting srid 4326 would bend every
-- transform on the platform.
--
-- The fix is the layout Supabase itself uses on newer projects: PostGIS
-- lives in the `extensions` schema, which PostgREST does not expose, so
-- spatial_ref_sys stops being reachable by any client at all.
--
-- PostGIS is not relocatable (no ALTER EXTENSION ... SET SCHEMA), so this is
-- a drop and recreate. That would be unthinkable with player data; today the
-- database holds only selftest leftovers, which is exactly why this has to
-- happen now and not after launch. The cascade drops the three geography
-- columns; everything else (functions, policies, indexes) only references
-- geography inside string bodies, which are not dependency-tracked.
-- ---------------------------------------------------------------------------

drop extension postgis cascade;
create extension postgis with schema extensions;

-- Rows that lost their geometry are meaningless without it, and rounds.zone
-- comes back NOT NULL, which an occupied table would refuse. All of it is
-- selftest residue; positions and reveals cascade off rounds.
delete from rounds;

alter table public.rounds    add column zone extensions.geography(point, 4326) not null;
alter table public.positions add column geog extensions.geography(point, 4326) not null;
alter table public.reveals   add column geog extensions.geography(point, 4326) not null;

-- The three functions that call PostGIS by name pin search_path = public,
-- which was correct hygiene and now hides the new schema. Widen exactly
-- those three; extensions is on Supabase's default search path and contains
-- nothing untrusted.
alter function public.start_round(uuid, double precision, double precision, int)
  set search_path = public, extensions;
alter function public.post_position(uuid, double precision, double precision, real, real)
  set search_path = public, extensions;
alter function public.frame_selftest()
  set search_path = public, extensions;

-- Prove the relocation broke nothing: the selftest drives the whole round
-- layer (party, start_round, check-ins, reveals, PRD 9's zero-row read) and
-- raises on any failure, which rolls this migration back.
do $$
begin
  perform frame_selftest();
end $$;
