// Publish approved decks to Instagram through the Instagram API.
//
//   node marketing/pipeline/publish.mjs
//
// Reads queue.json in this directory. Every entry the reviewer has marked
// "approved": true gets published as a carousel; everything else is skipped
// and said so. Without credentials this is a dry run that prints exactly
// what it would do, so the pipeline is testable before the Meta app exists.
//
// Credentials come from .env next to this file (gitignored), or the
// environment:
//   IG_USER_ID          the Instagram professional account's numeric id
//   META_ACCESS_TOKEN   token from "API setup with Instagram login"
//   IG_IMAGE_BASE       public URL prefix where the deck PNGs are reachable
//
// Two facts about the Instagram-login flavour of this API, learned the
// careful way rather than the hard way:
//   - The host is graph.instagram.com. graph.facebook.com serves the
//     Facebook-login flavour and rejects these tokens.
//   - Tokens live 60 days. Every live run refreshes the token first and
//     writes the fresh one back to .env, so the pipeline never expires as
//     long as it runs at least once every two months.
//
// The approval gate is queue.json, on purpose. Nothing in this file can
// post a deck a human did not mark approved.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(here, '.env');

function loadEnv() {
  const out = { ...process.env };
  if (existsSync(ENV_PATH)) {
    for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.+)$/);
      if (m && !(m[1] in process.env)) out[m[1]] = m[2].trim();
    }
  }
  return out;
}

const env = loadEnv();
const { IG_USER_ID, IG_IMAGE_BASE } = env;
let token = env.META_ACCESS_TOKEN;
const live = Boolean(IG_USER_ID && token && IG_IMAGE_BASE);
const GRAPH = 'https://graph.instagram.com/v23.0';

if (!live) console.log('DRY RUN: set IG_USER_ID, META_ACCESS_TOKEN, IG_IMAGE_BASE (env or .env) to publish.\n');

async function graph(path, params) {
  const body = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${GRAPH}/${path}`, { method: 'POST', body });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path}: ${JSON.stringify(json.error || json)}`);
  return json;
}

async function refreshToken() {
  // Refresh works on tokens at least a day old; a younger token comes back
  // with an error that is safe to ignore.
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`,
  );
  const json = await res.json();
  if (res.ok && json.access_token) {
    token = json.access_token;
    if (existsSync(ENV_PATH)) {
      const kept = readFileSync(ENV_PATH, 'utf8')
        .split('\n')
        .filter((l) => l && !l.startsWith('META_ACCESS_TOKEN='));
      writeFileSync(ENV_PATH, kept.concat(`META_ACCESS_TOKEN=${token}`, '').join('\n'));
    }
    console.log(`token refreshed, ${Math.round(json.expires_in / 86400)} days left\n`);
  } else {
    console.log(`token not refreshed (${json.error?.message || 'too new'}), continuing with current one\n`);
  }
}

const queue = JSON.parse(readFileSync(join(here, 'queue.json'), 'utf8'));
if (live) await refreshToken();

for (const deck of queue.decks) {
  if (!deck.approved) {
    console.log(`skip     ${deck.dir} (not approved)`);
    continue;
  }
  if (deck.published) {
    console.log(`skip     ${deck.dir} (already published ${deck.published})`);
    continue;
  }
  const dir = resolve(here, '../..', deck.dir);
  const slides = deck.slides.map((s) => `${IG_IMAGE_BASE || '<base>'}/${basename(dir)}/${s}`);
  console.log(`publish  ${deck.dir}: ${slides.length} slides`);
  slides.forEach((s) => console.log(`         ${s}`));
  console.log(`         caption: ${deck.caption.slice(0, 60)}...`);
  if (!live) continue;

  // One container per image, then a carousel container, then publish.
  const children = [];
  for (const url of slides) {
    const item = await graph(`${IG_USER_ID}/media`, { image_url: url, is_carousel_item: 'true' });
    children.push(item.id);
  }
  const carousel = await graph(`${IG_USER_ID}/media`, {
    media_type: 'CAROUSEL',
    children: children.join(','),
    caption: deck.caption,
  });
  // Instagram processes the container asynchronously; publishing before it
  // reports FINISHED fails with code 9007. Poll it, briefly and boundedly.
  for (let tries = 0; tries < 20; tries++) {
    const res = await fetch(`${GRAPH}/${carousel.id}?fields=status_code&access_token=${token}`);
    const status = (await res.json()).status_code;
    if (status === 'FINISHED') break;
    if (status === 'ERROR') throw new Error(`container ${carousel.id} failed processing`);
    console.log(`         container ${status || 'PENDING'}, waiting...`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  const post = await graph(`${IG_USER_ID}/media_publish`, { creation_id: carousel.id });

  // Record the success immediately, before anything else can fail. An
  // unattended run has nobody to notice a missed note, and the note is the
  // only thing standing between a retry and a double post.
  deck.published = new Date().toISOString().slice(0, 10);
  deck.mediaId = post.id;
  writeFileSync(join(here, 'queue.json'), JSON.stringify(queue, null, 2));

  let permalink = '';
  try {
    const meta = await fetch(`${GRAPH}/${post.id}?fields=permalink&access_token=${token}`).then((r) => r.json());
    permalink = meta.permalink || '';
  } catch { /* the post is live either way; the link is a convenience */ }
  console.log(`         published ${post.id}${permalink ? ' ' + permalink : ''}`);
}
