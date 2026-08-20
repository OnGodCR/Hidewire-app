// Render every slide-*.html in a deck directory to 1080x1350 PNGs.
//
//   node marketing/pipeline/render.mjs marketing/carousels/06-waitlist
//
// Uses the system Chrome, same as the site's screenshot tooling. PNGs land
// next to the HTML, which is what the review sheet and the publisher read.
import puppeteer from 'puppeteer-core';
import { readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const dir = resolve(process.argv[2] || '.');
const slides = readdirSync(dir).filter((f) => /^slide-\d+\.html$/.test(f)).sort();
if (!slides.length) {
  console.error(`no slide-NN.html files in ${dir}`);
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
});
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
for (const slide of slides) {
  await page.goto('file://' + join(dir, slide), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const out = join(dir, slide.replace('.html', '.png'));
  await page.screenshot({ path: out });
  // Instagram's publishing API accepts JPEG only, so every slide gets both:
  // the PNG for review, the JPEG for the wire.
  const jpg = join(dir, slide.replace('.html', '.jpg'));
  await page.screenshot({ path: jpg, type: 'jpeg', quality: 92 });
  console.log(`rendered ${out} (+jpg)`);
}
await browser.close();
