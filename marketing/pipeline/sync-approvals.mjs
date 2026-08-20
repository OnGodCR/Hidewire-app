// Pull decisions made over Instagram DM into queue.json, so the publisher
// keeps queue.json as its single gate no matter where the decision came
// from. Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const env = { ...process.env };
for (const line of existsSync(join(here, '.env')) ? readFileSync(join(here, '.env'), 'utf8').split('\n') : []) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m && !(m[1] in process.env)) env[m[1]] = m[2].trim();
}
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };

// Push first, then pull. The review page publishes on its own now, so it
// needs each deck's caption and slide list; without them a tap on approve
// has nothing to post. Captions are written here by hand after ingest, so
// this is where they reach the server.
const qPathEarly = join(here, 'queue.json');
const local = JSON.parse(readFileSync(qPathEarly, 'utf8'));
const payload = local.decks
  .filter((d) => !d.published && d.caption && d.caption !== 'TODO: caption')
  .map((d) => ({ deck: basename(d.dir), caption: d.caption, slides: d.slides }));
if (payload.length) {
  const up = await fetch(`${env.SUPABASE_URL}/rest/v1/ig_review?on_conflict=deck`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(payload),
  });
  console.log(up.ok ? `pushed caption and slides for ${payload.length} deck(s)` : `push failed (${up.status})`);
}

const decisions = await fetch(`${env.SUPABASE_URL}/rest/v1/ig_review?select=deck,status,decided_at,via,media_id,published_at`, { headers }).then((r) => r.json());

const qPath = join(here, 'queue.json');
const queue = JSON.parse(readFileSync(qPath, 'utf8'));
let changed = 0;
for (const deck of queue.decks) {
  const d = decisions.find((x) => x.deck === basename(deck.dir));
  if (!d || d.status === 'pending') continue;
  // A deck the review page published is done: record that locally so the
  // local publisher cannot post it a second time.
  if (d.status === 'published' && !deck.published) {
    deck.approved = true;
    deck.published = (d.published_at || '').slice(0, 10) || 'unknown';
    deck.mediaId = d.media_id || null;
    changed++;
    console.log(`${basename(deck.dir)}: published via ${d.via || 'unknown'} at ${d.published_at}`);
    continue;
  }
  const approve = d.status === 'approved';
  if (deck.approved !== approve) {
    deck.approved = approve;
    changed++;
    console.log(`${basename(deck.dir)}: ${d.status} via ${d.via || 'unknown'} at ${d.decided_at}`);
  }
}
writeFileSync(qPath, JSON.stringify(queue, null, 2));
console.log(changed ? `${changed} deck(s) updated` : 'no new decisions');
