// Turn a deck from a Claude design session into a queued, reviewable deck.
//
//   node marketing/pipeline/ingest.mjs <file-or-url> <NN-slug>
//
// Input is one document holding every slide, each preceded by a marker
// comment of the form <!-- SLIDE 01 -->, which is the output contract in
// marketing/INSTAGRAM-CAROUSELS.md. Everything after the split is
// mechanical: write the slides, render them, copy the JPEGs into the
// website's /ig folder, queue the deck as approved:false, and seed a
// pending review row so it appears on the review page.
//
// What it deliberately does NOT do: approve anything, or push the website.
// The push is a separate visible step, and approval belongs to a person.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const WEB = '/Users/vintibangkochar/Documents/GitHub/Hidewire-web/src/ig';

const [source, slug] = process.argv.slice(2);
if (!source || !slug) {
  console.error('usage: ingest.mjs <file-or-url> <NN-slug>');
  process.exit(1);
}
if (!/^\d\d-[a-z0-9-]+$/.test(slug)) {
  console.error('slug must look like 07-the-archive');
  process.exit(1);
}

const raw = /^https?:\/\//.test(source)
  ? await fetch(source).then((r) => {
      if (!r.ok) throw new Error(`fetch ${source}: ${r.status}`);
      return r.text();
    })
  : readFileSync(resolve(source), 'utf8');

// Two input shapes, because a design session's published artifact is a
// BUNDLE: each slide ships as its own gzipped HTML page inside a manifest,
// named "Slide 01 ..." in an ext_resources island. That naming is the
// authoritative order, not object key order. The marker form is kept for
// hand-written or pasted decks.
function fromBundle(src) {
  const island = (type) => {
    const open = src.indexOf(`<script type="__bundler/${type}">`);
    if (open < 0) return null;
    const start = src.indexOf('>', open) + 1;
    return JSON.parse(src.slice(start, src.indexOf('</script>', start)));
  };
  const manifest = island('manifest');
  const ext = island('ext_resources');
  if (!manifest || !ext) return null;

  const found = [];
  for (const entry of ext) {
    const name = decodeURIComponent(entry.id || '');
    const num = name.match(/slide\s*(\d+)/i);
    const asset = manifest[entry.uuid];
    if (!num || !asset || asset.mime !== 'text/html') continue;
    const bytes = Buffer.from(asset.data, 'base64');
    const html = (asset.compressed ? gunzipSync(bytes) : bytes).toString('utf8');
    found.push({ n: num[1].padStart(2, '0'), html, name });
  }
  found.sort((a, b) => a.n.localeCompare(b.n));
  return found.length ? found : null;
}

function fromMarkers(src) {
  const parts = src.split(/<!--\s*SLIDE\s*(\d+)\s*-->/i);
  const found = [];
  for (let i = 1; i < parts.length; i += 2) {
    found.push({ n: parts[i].padStart(2, '0'), html: parts[i + 1].trim() });
  }
  return found.length ? found : null;
}

const slides = fromBundle(raw) || fromMarkers(raw);
if (!slides) {
  console.error('found neither bundled Slide NN pages nor <!-- SLIDE NN --> markers.');
  process.exit(1);
}
if (slides[0].name) console.log('bundled artifact: ' + slides.map((s) => s.name.replace(/^\.\/|\.dc\.html$/g, '')).join(', '));

const dir = join(repo, 'marketing/carousels', slug);
mkdirSync(dir, { recursive: true });
// Design sessions style with system fallbacks, because an artifact cannot
// reach this repo's fonts. Here it can: the real faces are two directories
// up, so every ingested deck gets them and Instagram matches the website
// rather than merely resembling it. Author !important beats the slides'
// inline font-family without touching the design's own markup.
const BRAND_FONTS = `<style>
@font-face { font-family: 'HW Sans'; src: url('../../pipeline/fonts/space-grotesk-400.woff2') format('woff2'); font-weight: 100 450; }
@font-face { font-family: 'HW Sans'; src: url('../../pipeline/fonts/space-grotesk-500.woff2') format('woff2'); font-weight: 451 550; }
@font-face { font-family: 'HW Sans'; src: url('../../pipeline/fonts/space-grotesk-700.woff2') format('woff2'); font-weight: 551 900; }
@font-face { font-family: 'HW Mono'; src: url('../../pipeline/fonts/ibm-plex-mono-400.woff2') format('woff2'); font-weight: 100 500; }
@font-face { font-family: 'HW Mono'; src: url('../../pipeline/fonts/ibm-plex-mono-600.woff2') format('woff2'); font-weight: 501 900; }
[style*="Helvetica"], [style*="system-ui"] { font-family: 'HW Sans', sans-serif !important; }
[style*="monospace"] { font-family: 'HW Mono', monospace !important; }
</style>`;

for (const slide of slides) {
  // The bundle's slides reference ./support.js, the artifact runtime shim.
  // It does not exist outside the bundle and is nothing to do with the
  // design; dropping it keeps the render console clean.
  let html = slide.html.replace(/<script src="\.\/support\.js"><\/script>\s*/g, '');
  html = html.includes('</head>')
    ? html.replace('</head>', BRAND_FONTS + '</head>')
    : BRAND_FONTS + html;
  writeFileSync(join(dir, `slide-${slide.n}.html`), html + '\n');
}
console.log(`${slides.length} slides written to marketing/carousels/${slug}/`);

// Shared assets every deck can reference as assets/<name>. Design sessions
// have no way to ship the brand mark inside an artifact, so the deck asks
// for assets/hidewire-logo.png and ingest is what makes that path real.
const assetSrc = join(here, 'assets');
if (existsSync(assetSrc)) {
  const assetDir = join(dir, 'assets');
  mkdirSync(assetDir, { recursive: true });
  for (const f of readdirSync(assetSrc)) copyFileSync(join(assetSrc, f), join(assetDir, f));
}

execFileSync('node', [join(here, 'render.mjs'), dir], { stdio: 'inherit' });

const webDir = join(WEB, slug);
mkdirSync(webDir, { recursive: true });
const jpgs = readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort();
for (const jpg of jpgs) copyFileSync(join(dir, jpg), join(webDir, jpg));
console.log(`${jpgs.length} jpgs copied into the website at src/ig/${slug}/`);

const qPath = join(here, 'queue.json');
const queue = JSON.parse(readFileSync(qPath, 'utf8'));
const entry = {
  dir: `marketing/carousels/${slug}`,
  slides: jpgs,
  caption: 'TODO: caption',
  approved: false,
  published: null,
};
const at = queue.decks.findIndex((d) => d.dir === entry.dir);
if (at >= 0) queue.decks[at] = { ...queue.decks[at], slides: entry.slides };
else queue.decks.push(entry);
writeFileSync(qPath, JSON.stringify(queue, null, 2));
console.log(at >= 0 ? 'queue entry updated' : 'queued as approved:false');

// Seed the review row so the deck shows up on the review page.
const env = { ...process.env };
if (existsSync(join(here, '.env'))) {
  for (const line of readFileSync(join(here, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m && !(m[1] in process.env)) env[m[1]] = m[2].trim();
  }
}
if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/ig_review?on_conflict=deck`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    // Slides go up now; the caption follows from sync-approvals once it is
    // written. The review page needs both before it can publish.
    body: JSON.stringify({ deck: slug, status: 'pending', slides: jpgs }),
  });
  console.log(res.ok ? 'review row seeded as pending' : `review row NOT seeded (${res.status})`);
} else {
  console.log('no supabase credentials in .env, review row not seeded');
}

console.log(`\nnext: write the caption in queue.json, then push the website so the images are live.`);
