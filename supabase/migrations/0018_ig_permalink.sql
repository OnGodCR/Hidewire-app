-- Store the post's public URL, not just its media id.
--
-- The review page wants to link a published deck to the post itself, and a
-- media id cannot be turned into a URL without another API call. The
-- publisher already fetches the permalink; this is where it goes.

alter table public.ig_review add column if not exists permalink text;
