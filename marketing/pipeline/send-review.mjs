// DM a rendered deck to the reviewer for approval, as @hidewire_game.
//
//   node marketing/pipeline/send-review.mjs marketing/carousels/06-waitlist
//
// Sends every slide image, then a text with Approve / Decline quick-reply
// buttons whose payloads the webhook understands. Needs REVIEWER_IGSID in
// .env: the reviewer's Instagram-scoped id, captured in ig_contacts the
// first time they DM the account.
//
// Instagram's rules, not ours: the account can only message someone who
// has messaged it first, and only inside 24 hours of their latest message.
// Every approval they send reopens the window, so at a daily cadence this
// is invisible; after a quiet week, they DM the account anything at all
// and the window is open again.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const env = { ...process.env };
for (const line of existsSync(join(here, '.env')) ? readFileSync(join(here, '.env'), 'utf8').split('\n') : []) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m && !(m[1] in process.env)) env[m[1]] = m[2].trim();
}
const { META_ACCESS_TOKEN, IG_IMAGE_BASE, REVIEWER_IGSID } = env;
if (!META_ACCESS_TOKEN || !IG_IMAGE_BASE || !REVIEWER_IGSID) {
  console.error('need META_ACCESS_TOKEN, IG_IMAGE_BASE, REVIEWER_IGSID in .env');
  process.exit(1);
}

const dir = resolve(process.argv[2] || '.');
const deckName = basename(dir);
const slides = readdirSync(dir).filter((f) => /^slide-\d+\.jpg$/.test(f)).sort();
if (!slides.length) { console.error(`no rendered jpgs in ${dir}`); process.exit(1); }

async function send(message) {
  const res = await fetch('https://graph.instagram.com/v23.0/me/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${META_ACCESS_TOKEN}` },
    body: JSON.stringify({ recipient: { id: REVIEWER_IGSID }, message }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json.error || json));
}

for (const slide of slides) {
  await send({ attachment: { type: 'image', payload: { url: `${IG_IMAGE_BASE}/${deckName}/${slide}` } } });
  console.log(`sent ${slide}`);
}
await send({
  text: `Deck ${deckName}, ${slides.length} slides. Approve or decline?`,
  quick_replies: [
    { content_type: 'text', title: 'Approve', payload: `APPROVE:${deckName}` },
    { content_type: 'text', title: 'Decline', payload: `DECLINE:${deckName}` },
  ],
});
console.log(`sent approval prompt for ${deckName}`);
