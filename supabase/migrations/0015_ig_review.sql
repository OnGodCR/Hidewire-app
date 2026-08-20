-- Instagram carousel review state, written by the DM webhook on Vercel and
-- read by the publisher. Replaces the approved flag living only in
-- queue.json so approval can happen from a phone.

create table if not exists public.ig_review (
  deck text primary key,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  decided_at timestamptz,
  via text
);

alter table public.ig_review enable row level security;
revoke all on table public.ig_review from anon, authenticated;

-- People who have ever DMed the account. The webhook records them; the
-- reviewer flag is set by hand exactly once, and only that sender can
-- approve anything. A stranger DMing "approve" is a row here, not a
-- decision.
create table if not exists public.ig_contacts (
  igsid text primary key,
  first_seen timestamptz not null default now(),
  last_text text,
  is_reviewer boolean not null default false
);

alter table public.ig_contacts enable row level security;
revoke all on table public.ig_contacts from anon, authenticated;
