-- Let the review page publish on its own.
--
-- Approval happens on a phone; publishing should not wait for a laptop to
-- be awake. For the Vercel function to post without this repo, the deck's
-- caption and slide list have to live where the function can read them,
-- and the published state has to live where a retry can see it.

alter table public.ig_review
  add column if not exists caption text,
  add column if not exists slides jsonb,
  add column if not exists media_id text,
  add column if not exists published_at timestamptz;

-- 'published' is a fourth state, and the guard against double posting.
alter table public.ig_review drop constraint if exists ig_review_status_check;
alter table public.ig_review add constraint ig_review_status_check
  check (status in ('pending', 'approved', 'declined', 'published'));
