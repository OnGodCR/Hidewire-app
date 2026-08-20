# The carousel pipeline

Generate, render, approve, publish. Nothing reaches Instagram without a
human flipping `approved` in `queue.json`; that file is the entire
approval gate and the reason this pipeline is safe to run on a schedule.

## The loop, one week at a time

1. **Design.** A Claude design session works from
   marketing/INSTAGRAM-CAROUSELS.md (system block plus one pillar
   prompt) and publishes the deck as an artifact: every slide in one
   document, each preceded by `<!-- SLIDE 01 -->`, self-contained HTML.
2. **Ingest.** `node marketing/pipeline/ingest.mjs <url-or-file> <NN-slug>`
   splits the document into slide files, renders 1080x1350 PNGs and
   JPEGs, copies the JPEGs into the website's src/ig/<slug>/, queues the
   deck as `approved: false`, and seeds a pending review row.
3. **Caption and push.** Write the caption into queue.json, then commit
   and push the website so the images are publicly reachable. The
   publishing API downloads images from a URL; it does not accept
   uploads.
4. **Review.** Angad opens the review page bookmark
   (hidewire.org/api/review?key=...) and taps Approve or Decline on each
   pending deck. Decisions land in the ig_review table. Nothing in this
   pipeline sets approved to true on its own; that word belongs to a
   person.
5. **Sync and publish.** `node marketing/pipeline/sync-approvals.mjs`
   pulls decisions into queue.json, then
   `node marketing/pipeline/publish.mjs` posts every approved,
   unpublished deck as a carousel. With no credentials in the
   environment publish dry-runs and prints its plan. After a live
   publish, set `published` to the date in queue.json so a re-run cannot
   double post.

## One-time setup, all on Angad

1. Switch the Instagram account to a professional account.
2. Create a Meta developer app, add Instagram Graph API, generate a
   long-lived access token with `instagram_content_publish`.
3. Host the PNGs somewhere public: the Graph API downloads from a URL and
   does not accept uploads. The hidewire.org Vercel project can serve
   them from an unlinked path (copy the deck PNGs into the site build, or
   a second tiny Vercel project pointed at marketing/carousels).
4. Set `IG_USER_ID`, `META_ACCESS_TOKEN`, `IG_IMAGE_BASE` in the shell
   that runs publish.mjs. Never commit any of them.

## Cadence

Two decks a day per the rotation table in INSTAGRAM-CAROUSELS.md. Graph
API allows 50 posts per day; the constraint is review quality, not the
API. Batch the generation weekly, review once, publish daily from the
approved queue.
