-- One place for the Instagram credentials the review page publishes with.
--
-- The token expires after 60 days and has to be refreshed. A serverless
-- function cannot write its own environment, so the token cannot live in
-- Vercel's env if anything is to rotate it. It lives here instead: the
-- function reads it, refreshes it when it is close to expiring, and writes
-- the new one back. Service role only, like every other table here.

create table if not exists public.ig_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.ig_config enable row level security;
revoke all on table public.ig_config from anon, authenticated;
