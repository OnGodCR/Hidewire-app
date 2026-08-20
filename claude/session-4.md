# Hidewire: session 4 handoff

Written 2026-07-31, extended 2026-08-01. This session did not change the app.
It built **hidewire.org**, the public waitlist site, in the separate
`Hidewire-web` repository (`github.com/OnGodCR/Hidewire-web`, which had no
commits before today). Read [session-3.md](session-3.md) for the state of the
app itself.

The brief was `marketing/WAITLIST-BRIEF.md`, which is untracked in this repo and
should be committed alongside this file.

**Read section 9 first if you are picking this up cold.** The site was built to
the brief, then rebuilt on Angad's feedback the same day. Sections 1 to 8
describe the first version; section 9 says what changed and why, and it is the
version that exists now.

---

## 1. What exists now

Three routes, static, no framework, and **no npm dependencies at all**, runtime
or build. `build.mjs` is 300 lines of Node standard library.

```
/            the waitlist page
/terms       Terms of Service, rendered from a copy of legal/TERMS.md
/privacy     Privacy Policy, rendered from a copy of legal/PRIVACY.md
/api/waitlist   a Cloudflare Pages Function, the only server-side code
```

The whole home page is **33 KB over the wire** including both typefaces:
3.4 KB HTML, 3.7 KB CSS, 1.4 KB JS gzipped, plus 25 KB of subset woff2.

### Verified working

Driven in a real browser against the preview server:

- The five form states, checked by submitting through the live DOM: empty,
  malformed, new address, already on the list, server error. Each one changes
  the status text and its color, and only the success case clears the field.
- The endpoint itself has **ten tests** (`npm test`, stubbed database) covering
  the status mapping, lowercasing, the honeypot, a missing key, an unexpected
  database status, the no-JavaScript HTML path, and an assertion that the only
  key sent upstream is `email`.
- Both legal pages render every clause, with the wording unchanged. Compared
  against the source text after conversion.
- One `h1`, headings in document order, both inputs labelled, one each of
  `main`, `header`, `footer`, `nav`.
- Zero third-party network requests, zero console messages.
- Contrast measured in-page: `dim` on `bg` is 7.09:1, accent button 16.77:1.
- Mobile at 375 and desktop at 1280, plus the skip link and focus rings.

### Written but unproven

- **The deployment.** Nothing is deployed and no DNS points anywhere. The
  Cloudflare Pages project does not exist yet and neither does the Supabase
  table.
- **The live database call.** `functions/api/waitlist.js` is tested against a
  stubbed `fetch`, not against Supabase. The first real signup is the first
  real test of the URL, the key, and the 409-on-duplicate behaviour.

## 2. The backend the form posts to, and why it has that shape

The browser posts to `/api/waitlist` on the **same origin**. A Cloudflare Pages
Function forwards the address to Supabase with a service role key that exists
only as a server-side secret.

The obvious cheaper design is to let the browser call Supabase directly with the
anon key. That was rejected: a direct call is a third-party request from a
visitor's device to `*.supabase.co`, which logs their IP, on a page whose whole
argument is that it contacts nobody. The extra hop is the point.

What is stored is **the address and the time**. Not the IP, not the user agent,
not a referrer, not a country. Cloudflare hands all of those to the function on
`request.cf` and the function deliberately never reads them. `db/waitlist.sql`
has one table with three columns and a comment saying so.

Counting signups is `select count(*) from waitlist_signups`, which is the
brief's answer to "no analytics".

### To make it live

1. Run `db/waitlist.sql` against the Supabase project.
2. Create a Pages project on the repo. Build `npm run build`, output `dist`.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as encrypted variables on
   both production and preview.
4. Point the domain at it.

If the variables are missing the form reports an error and logs one, rather
than silently dropping signups.

## 3. The privacy gap, which is the one thing blocking launch

**`legal/PRIVACY.md` does not describe the waitlist.** It covers email
addresses collected through Google or Apple sign-in inside the app. An address
typed into a website before the app exists is a different collection, for a
different purpose, in a different table.

The brief said to flag this rather than quietly add a vendor, so it was flagged
and not papered over. `Hidewire-web/LEGAL-GAPS.md` carries a proposed clause,
ready to paste into `legal/PRIVACY.md` once a human has read it. The site
meanwhile says the honest thing next to the button: one email, what it is for,
not sold, not shared, and how to have it deleted.

One trap in the proposed wording: it promises deletion when the beta opens.
**If that sentence is adopted, something has to actually delete the rows.** A
retention promise with no job behind it is worse than no promise at all.

`LEGAL-GAPS.md` also records four smaller things, none of which were changed:
`support@frame.game` on a site called hidewire.org, Terms section 7 saying
outright that it will change, British spelling in the legal text against
American on the site, and the 30 versus 45 minute round length.

## 4. Where the copy came close to a section 9 line

Three places. Worth reading, because the same three will come up again in every
piece of marketing.

**"Not a way to meet strangers"** is the one that needed the most care. The
brief says to state "invite codes only and never strangers". But CLAUDE.md
section 3 records that **the NEARBY tab knowingly crosses that line**: adults,
opted in, off by default, can see games nearby and ask to join. Writing "you
can only play with people you invite" would have been a claim the shipped app
contradicts, which is worse than saying less.

The published line is: *"A round starts from an invite code you send to your own
group. There is no matchmaking, and nobody is put into your game
automatically."* Both halves are true of the app as built, including NEARBY,
which is request-based and opt-in rather than matchmaking. **If NEARBY ever
widens, this sentence has to be revisited before the app ships, not after.**

**"Not private, and not permanent"** leads with the uncomfortable half on
purpose: your photos go to the Seeker, and the page says so before it says
anything reassuring. The 24 hour deletion and the "never enters match history"
promise follow. Reversing that order would have read as burying it.

**The check-in illustration is drawn, not photographed.** Two empty framed
rectangles with a hatched fill and a countdown, built in CSS. That sidesteps the
stock-photography trap in section 9 entirely: there is no image on this site of
a person hiding anywhere, so there is nothing to accidentally depict someone
crouched beside a road or on private property. It is also why the page has no
`og:image`; generating one means drawing it, and it should not be a photo.

Everything else was straightforward. The face recognition paragraph names the
actual measurements (brightness, blur, entropy, edge detail) rather than saying
"we respect your privacy", because the specific version is both more convincing
and harder to accidentally overstate.

## 5. Two judgment calls someone might disagree with

**Headings are set in IBM Plex Mono, not Space Grotesk.** The brief said
"Display type: Space Grotesk Bold for headings". `mobile/src/theme.ts` says the
opposite, in a comment block explaining that the app deliberately moved to mono
for everything including headings and kept Space Grotesk for three things that
are objects rather than text: the wordmark, large glanceable numerals, and the
BLACKED OUT screen. The brief also said the site must look like the same
product, and theme.ts is the newer decision, so the site follows theme.ts.
Space Grotesk appears in exactly two places: the HIDEWIRE wordmark and the
`00:47` countdown. **If this is wrong, it is one variable in `styles.css`.**

**The site says the round is 30 minutes.** PRD and BRIEF both say 45. CLAUDE.md
section 3 records 30 as the current product decision, and the app does 30.

## 6. Things that will cost time again

- **`preview_start` only reads `.claude/launch.json` from the primary working
  directory.** A config in the additional working directory is ignored. A
  `hidewire-web` entry was added to **this repo's** `.claude/launch.json`
  pointing at the other repo with `--prefix`. That file now has an entry for a
  project that is not in this repo, which looks wrong and is not.
- **The fonts were subset with `pyftsubset`**, installed into the scratchpad
  with pip, from the TTFs already sitting in `mobile/node_modules`. Latin plus
  a little punctuation takes three faces from 359 KB of TTF to 25 KB of woff2.
  The command is not committed anywhere: the woff2 files are committed instead,
  with their OFL licenses, because regenerating them needs Python tooling that
  is not otherwise a dependency of anything. If a fourth weight is ever needed,
  `pip install "fonttools[woff]" brotli` and run `pyftsubset` with
  `--flavor=woff2`.
- **`build.mjs` fails the build on an em-dash in the output**, and on any
  reference to a font CDN, Google Analytics, Tag Manager, Facebook, jsDelivr, or
  unpkg. It also refuses to parse a legal document containing a list, a table,
  or a code block, rather than silently dropping it. If someone adds a bulleted
  list to `legal/TERMS.md`, **the site build will fail** and the parser needs
  extending. That is deliberate: a legal document that silently loses a clause
  is the worse failure.
- **The legal Markdown is copied into the web repo**, at `content/terms.md` and
  `content/privacy.md`. They are byte-for-byte copies today. **Nothing keeps
  them in sync.** Editing `legal/` here does not change the site. A sync script
  or a submodule would fix it and neither was worth it for two files.

## 7. Outstanding, in dependency order

1. **Decide the waitlist privacy clause** (section 3). Blocked on Angad, and it
   blocks publishing the site.
2. Create the Supabase table and the Pages project, set the two secrets, point
   DNS. Blocked on Angad: it needs account access.
3. Send one real signup through and confirm the row lands and a second attempt
   answers "already on the list".
4. `/what-is-this`, the explainer a player can show a police officer or a
   security guard. The app has an offline version in `RoundChrome.tsx` and its
   QR code already points at `frame.game/what-is-this`, which **does not
   exist**. Either build it at hidewire.org and change the QR caption, or build
   it at frame.game. App Review will ask.
5. The POI complaint form, with the 15 day commitment the privacy policy
   already promises. Also an App Review requirement.
6. An `og:image`. Drawn, not photographed, per section 4 above.

Items 4 and 5 are why the build takes a `DOCS` array: a text page is one
Markdown file and one line in `build.mjs`.

## 8. Nothing in the app changed

No fixtures were added, so `TEST-FIXTURES.md` is untouched. The web repo has one
fake thing in it, a stubbed `/api/waitlist` used by the local preview server so
the form's states can be exercised without a database. It lives in `tools/`,
which is never deployed, and it is documented in that repo's README.

The only edit to this repo is the extra entry in `.claude/launch.json` described
in section 6.

---

## 9. The rebuild, same day

Angad's verdict on the first version: **"ugly and there's too much text."** Six
changes, all of them made. What follows is what changed, and the two places
where doing exactly what was asked would have created a problem.

### 9.1 What was asked, and what it looks like now

| Asked | Done |
|---|---|
| Remove "what it is not" | Gone. |
| Real screenshots in "how a round works", with animation | Three real captures of the app, driven out of a real round. Scroll reveals and a live countdown. |
| Emphasize the waitlist reward | Second thing in the hero, under the form. |
| Make it landscape | Two column at every section, desktop first. |
| Remove the email fine print | Gone. |
| The lede is too much, make it vague | "The future of getting outside with your friends." |

The layout question was the one that needed asking, and the answer was
**"the primary version is the desktop version"**, with a mobile version that
still works. So the hero is a two column landscape screen, the three beats are
alternating landscape rows, and everything stacks below 60rem.

### 9.2 The screenshots are real, and getting them was the whole afternoon

`Hidewire-web/tools/capture-shots.mjs` exports the app as a static web build,
drives a real Chrome through the **entire onboarding funnel**, hosts a round,
fills the party, acknowledges the safety card, starts the round, and waits out
a real five minute check-in window. Every image on the site came out of it.

Four things cost real time and will again:

- **The Bash tool cannot reach the preview servers.** They live in the harness
  and are invisible to a process started from a shell, so the first plan
  (point Puppeteer at `localhost:8095`) was dead on arrival. The fix is
  `npx expo export --platform web`, then serve the export to Chrome through
  request interception. No server, so nothing has to be reachable.
- **The export has to be `--dev`.** A production export refuses to boot with
  fixtures on, and without fixtures a party cannot reach three players.
- **The splash always routes into onboarding.** Seeding `localStorage` with a
  signed-in account skips nothing, so the script walks the funnel for real,
  including a **touch** tap on the age slider: it is built on the React Native
  responder system, and a synthetic mouse click does not move it.
- **Every tap in the lobby needs to be verified, not assumed.** It is a long
  scrolling view with a sticky footer, and a tap issued while it settles lands
  on whatever used to be there. `tapUntil` retries until the screen proves the
  tap landed. Three separate runs died on this before the helper existed.

### 9.3 Two places where the honest thing beat the asked-for thing

**The check-in screen is not photographed.** It is the one screen the whole
game is about, so it was the obvious thing to capture. On web the viewfinder is
a **procedural stand-in** (`CameraStage` falls back to `ProceduralPhoto`
because expo-camera has no useful web path). A screenshot of it would have put
an invented photo on a marketing page and presented it as somebody's real
check-in. `TEST-FIXTURES.md` exists to stop exactly that.

What the site shows instead is what happened when the headless player let the
window close: **BLACKED OUT**. Real screen, real round, no fake photograph, and
it carries the stakes better than a viewfinder would have. If a real check-in
screenshot is wanted, it has to come off a phone, which means Angad taking it.

**The lobby screenshot has one element hidden.** `ADD TEST PLAYERS` is only
there because `TEST_MODE` is on and does not exist in a shipping build. The
capture script hides it for that one frame and restores it immediately. That
makes the screenshot **more** representative of the real app, not less, but it
is a doctored screenshot and that is worth knowing. Everything else in all
three images is untouched.

### 9.4 The page now makes a promise it did not make before

"Everyone on this list gets a link to an exclusive in-game reward the day
Hidewire drops. Cosmetic, one time, and never offered again."

The word **cosmetic** is load bearing and should not be edited out for
brevity. A waitlist reward that affects a round is an advantage handed out for
an email address, which is the same problem as selling FILM, and
`marketing/BRIEF.md` section 9 rules it out. `LEGAL-GAPS.md` section 1a records
the three things that have to be true at launch for the promise to be kept, one
of which is that **something has to actually exist to send**.

There is also a quiet collision worth naming: the proposed privacy clause says
waitlist addresses are deleted when the beta opens, and the hero promises an
email when the game drops. Both can be true only if the email goes first.

### 9.5 What removing "what it is not" costs

The site no longer says anywhere that photos go to the Seeker, that there is no
face detection, that nothing purchasable helps you win, or that a round is
invite-code only. Angad's reason was that he does not want to promise anything
about the future, which is a reasonable call for a pre-launch page.

The rules in `BRIEF.md` section 9 are prohibitions on what may be **claimed**,
not requirements to claim anything, so saying less is safe. But the section was
also the page's best answer to a parent, a journalist, or an app reviewer
asking what this thing does with photographs of teenagers. When the app is
closer to shipping, it should come back as **statements about what the app
does**, checked against the app, rather than as promises.

### 9.6 One real bug, found by testing the thing the brief asked for

The reveal animation hid every section at `opacity: 0` and let JavaScript
reveal them. **With scripting off, that is not a static page, it is a blank
one**, and the brief says the site has to work with JavaScript disabled apart
from the form.

The fix is the standard one and worth remembering: `motion.js` loads in the
head **without defer** and its first act is to set a class on the document.
Every rule that hides anything is scoped to that class. No script, old browser,
or reduced motion means the class never appears and nothing is ever hidden.
There is also a 2.5 second failsafe, because a tab that is never composited
never fires an intersection callback, which is exactly what happens in a
headless or backgrounded browser.

Verified by rendering the built page with scripting disabled and comparing it
against the scripted render.

### 9.7 State of it

Verified with a real Chrome against the built output, at 1440x900 and 390x844:
hero, all three beats, the closing block, the footer, and both legal pages. The
ten endpoint tests still pass. The em-dash check is clean across the repo.

The page is now about **450 KB** built, of which 400 KB is three PNG
screenshots at 3x. They are not compressed or resized yet, and that is the
first thing to do if the page ever feels slow: `sips` on this machine can write
PNG and JPEG but not WebP, so either resize to 2x with `sips -Z` or add a real
encoder.

Everything in section 7 is still outstanding, unchanged: the privacy clause,
the Supabase table, the Pages project, DNS, `/what-is-this`, and the POI
complaint form.

---

## 10. Second rebuild, 2026-08-02

Angad again, five changes. The site is now a **scroll experience** rather than a
stack of sections, modelled on royal-pop-website.vercel.app: one phone stays
pinned while the copy moves past it and the screen inside it changes.

### 10.1 The scroller

Four steps: the lobby, the drop, the hunt, the check-in. Four real screenshots,
one per step, swapped under a sticky phone. The reference site does it by
fixing every section and cross-fading on scroll offset; this does it with an
IntersectionObserver and no scroll arithmetic at all, which is far less
fragile.

Two things that took a while to get right and will break again if touched:

- **The observer watches the copy, not the panel.** A panel is a full screen
  tall, so it enters the band long before its words do, and the phone would
  change while the previous step was still being read.
- **The band moves with the phone.** Centred phone on desktop, so the band is
  the middle of the viewport; pinned to the top on mobile, so the band moves
  down under it. The first mobile attempt had paragraphs sliding across the
  screenshot at 20% opacity, which reads as a rendering fault.

There is also a CSS ordering trap: the mobile override of `.panel-copy` opacity
has the same specificity as the desktop rule, so it only works because it comes
later in the file. Moving it back up the stylesheet silently breaks mobile.

### 10.2 Type: the site and the app now disagree, on purpose

Angad said the type was hard to read. It was: everything was IBM Plex Mono,
because `theme.ts` made mono the app's base face and section 5 of this handoff
followed it.

The site is now **Space Grotesk** at 400 and 700, with IBM Plex Mono kept for
the letterspaced caps label only. That is the split `marketing/BRIEF.md` asked
for in the first place. Mono at paragraph length on a 1440 pixel screen is a
different problem from mono in a 390 pixel app, and the site should be readable
before it is consistent with the app.

### 10.3 The mark is on the page now

`brand/frame-mark.svg`, fetched from the app repo on GitHub to confirm it
matched the local copy, with the background plate stripped so it sits on any
surface. It is in the header and the footer. The CSS bracket frame that used to
box the wordmark is gone: the mark already has viewfinder brackets in it and
two sets read as a mistake.

### 10.4 "Cosmetic, one time, and never offered again" was removed

Angad's call, as clutter. `LEGAL-GAPS.md` section 1a records it, because the
constraint has not gone anywhere even though the sentence has: a waitlist
reward that affects a round is an advantage handed out for an email address,
which BRIEF section 9 rules out. **The page no longer says the reward is
cosmetic, so the reward itself has to be.**

### 10.5 The duplicate signup bug was in the dev stub

Angad entered his address twice and was told he was added twice. Worth being
precise about what was broken, because the headline reading of it is wrong:

**Nothing is deployed.** There is no Supabase table and no Pages project, so
what he tested was `tools/serve.mjs`, the local preview stub, which was
stateless and returned `added` for everything except two hardcoded addresses.
The real endpoint was never wrong about this.

Both halves are now fixed:

- The stub keeps a small file of addresses it has seen, so a second signup
  answers `known` locally exactly as it will in production. Verified in a
  browser: same address twice, and again in upper case, all three answering
  correctly.
- The real endpoint no longer trusts HTTP 409 alone to mean "duplicate". It
  also treats a Postgres `23505` in the response body as one, because PostgREST
  has reported unique violations under different statuses across versions, and
  a repeat signup surfacing as a server error is a bad first impression on the
  one interaction this page has. Two new tests cover it: twelve passing.

### 10.6 Still true

Nothing about the deployment has changed. The privacy clause, the Supabase
table, the Pages project, DNS, `/what-is-this` and the POI form are all still
outstanding, and the first real signup is still the first real test of the
database path.

The page is now about **710 KB** built, of which roughly 500 KB is four
screenshots at 3x. Compressing them properly still needs an encoder this
machine does not have.

---

## 11. Third pass, 2026-08-02

Six more changes from Angad. The site is now six scroller steps deep and the
waitlist has a real table behind it.

### 11.1 The scroller has content on both sides now

Each step is a three column grid: copy on one side, a small readout of the
actual numbers on the other, and the phone down the middle. Which side the copy
takes alternates, which is what stops six identical screens in a row.

`.panel-body` wraps the copy and the readout and is `display: contents` on
desktop, so both children sit directly in the panel grid. On a narrow screen it
becomes a real box again, `position: sticky; bottom`, which parks the pair in
the band under the pinned phone for as long as the step lasts instead of
letting the words scroll up across the screenshot. That sticky trick is what
finally fixed the mobile collision; two rounds of shrinking the phone did not.

### 11.2 Two more real screens, and the facts checked against the app

`SHOTS=tabs` and `SHOTS=poi` were added to the capture script so the fast
screens do not have to pay for the five minute check-in wait. That got the
**global leaderboard** and the **nearby tab**, which between them cover local
games, points of interest, XP and the ladder. Six screens now.

The readouts are checked figures, not remembered ones. They come from
`DEFAULT_SETTINGS` and `SETTING_DEFS` in `JoinLobby.tsx` and from `PRD.md`, and
the table in the site's README says which line each one came from.

**One number was wrong on the live page:** it said the zone was "a square
kilometer of city". The app's default zone is a circle a kilometer across,
which is about 0.79 km². It now says "a zone about a kilometer across". That is
exactly the kind of thing that only turns up if someone goes and looks.

### 11.3 Buffs are on the page, described as earned

Angad asked to mention items that give buffs. They are described as coming from
walking to a cache, and the page says outright that items are earned on foot
and never bought. **That framing is not optional.** PRD 8 makes it a hard
constraint that the paid track never contains buffs, and the Terms published on
this same site say anything purchasable is cosmetic. Copy that implied you
could buy an advantage would contradict a document one click away.

### 11.4 Nearby games are described, so the supersession is public now

The page now says adults can see games starting nearby and ask to join, off
until you turn it on. That is the NEARBY tab, and it is the line in
`marketing/BRIEF.md` section 9 that `CLAUDE.md` section 3 already records as
knowingly crossed. Until today the site stayed quiet about it; it no longer
does. `LEGAL-GAPS.md` section 1b has the detail. The short version: the
sentence carries its own guardrails, and if NEARBY ever widens the sentence
becomes false.

### 11.5 The waitlist table is live

`supabase/migrations/0012_waitlist.sql`, applied to project
`cldrgsggfqneisjkwmxw` with `supabase db push`. `waitlist_signups`, three
columns, a unique index on `lower(email)`, RLS on with no policies so anon and
authenticated can do nothing at all. Verified after the push: the table and
both indexes exist, zero rows.

The web repo's `db/waitlist.sql` is gone, replaced by a README pointing here.
Two copies of the same DDL in two repos was going to drift.

`tools/serve.mjs` now runs the **real** endpoint against the real table when
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are both in the environment, and
falls back to the stub otherwise. That is the only way to exercise the database
path before the site is deployed. It takes two explicit variables rather than a
flag because anything written that way lands in production data.

**Still not done:** the service role key is not in this session and the site is
still not deployed, so the live path has not been exercised end to end. That
remains the first real test.

### 11.6 Smaller things

- The hero has two phones again, the lobby in front and a live round behind.
- "In development" in the header is now "Waitlist open".
- "Cosmetic, one time, and never offered again" stays deleted; see 10.4.

---

## 16. The in-flight overlap, 2026-08-03

Angad sent a screenshot of the scroller mid-transition on a tablet-width
window: the step 06 copy drawn straight across the phone, text interleaved
with the leaderboard screenshot. "Make sure all the UI components are solid
enough that the scroll animation doesn't look interrupted."

**Why every earlier check missed it:** all the clearance measurements in
sections 11 and 14 were taken at the rest positions, where the copy has
settled under the phone. The overlap only exists **in flight**, in the few
hundred pixels where the outgoing copy is scrolling up through the stage while
its fade-out is still running. A probe that samples quarter points between
rest positions reproduces it immediately: up to 168 by 74 pixels of text over
the device at 886 wide, and the same shape at 390. Rest-position checks are
not transition checks.

**The fix is paint order, not geometry.** On the narrow layout the stage now
sits above the panels (`z-index: 3` inside the existing media block), so
in-flight copy slides **behind** the device instead of over it. The phone
bezel and screenshot are fully opaque, so the occlusion is total; the ambient
layers ride above the copy too, but they are confined to the stage box and
under 12 percent opacity. Desktop keeps the old order, because there the copy
never crosses the phone at any width (re-measured at 1024, 1180, 1440 in
flight, all clear).

Verified by a probe that, at every overlap, asks `elementFromPoint` who is on
top: **phone at every sample, all three widths.** Reduced motion still zero,
twelve tests still passing.

The reusable lesson, appended to 14's: measure transitions in flight, not just
at rest. The screenshot that catches the bug is the one taken halfway between
two stopping points.

## 17. The exit collision: section 16's fix hid text instead of showing it

Angad sent a second screenshot from the in-app browser: at the very end of the
scroller, panel 06's copy sat **behind** the phone, unreadable, while the
closing section arrived below. Not a transient this time, a frozen state.

**The mechanics.** On the narrow layout the sticky stage is 52svh tall, so it
stays pinned until the scroller's last 52svh. The copy un-sticks a full
viewport earlier, when its panel's bottom reaches the viewport bottom. Between
those two moments the copy climbs 48svh relative to the pinned phone. On a
tall viewport that slack is absorbed by the gap; on a short one (the in-app
browser is 2x DPR, so a 906 pixel panel is a 453 by 800 CSS viewport) the copy
runs 120 to 125 pixels into the phone, and then the stage un-pins and both
leave the page together with the collision frozen in place. Section 16's
`z-index: 3` turned what used to be text-over-phone into phone-over-text:
better in flight, worse at the exit, because now the text was simply gone.

Desktop never shows this because its stage is 100svh tall: stage and last
panel un-stick at the same scroll position and exit in lockstep.

**The fix makes narrow match that timing without changing its look:**
`margin-bottom: 48svh` on the narrow stage. Sticky pins until the **margin
box** hits the containing block's end, so a 52svh box with a 48svh bottom
margin has exactly desktop's sticky range. The visual box, the ambient
layer's bounds, and the `::before` wash are all untouched because they key
off the border box, not the margin box.

**Two probe lessons on top of 16's:**

- Section 16's probe sampled *between* panels but never *past* the last one.
  The new `probe-exit.mjs` walks from the last panel's rest position to the
  scroller's end in 60 pixel steps. The exit is a transition too.
- The first run found nothing because it used the screenshot's pixel size.
  The in-app browser is 2x DPR: 906 by 1660 device pixels is a **453 by 800
  CSS viewport**, and the bug only exists at the CSS size. Reproduce at the
  CSS viewport, not the screenshot dimensions.

Verified after the fix: exit probe clean at 453x800, 453x820, 390x844,
906x1660, 768x1024; mid-flight probe unchanged (in-flight passes still paint
behind the phone, rest positions clean) at 453x800, 390x844, 906x1660;
reduced motion still zero animations; twelve tests passing; em-dash grep
clean; build 1238.7 KB.

## 18. The entry collision: same bug, mirror image, other end of the scroller

Third screenshot from Angad, same class of bug as section 17 but at the
scroller's START: panel 01's heading and copy drawn under the descending
phone as the section enters the viewport.

**The mechanics, mirrored.** The copy blocks are sticky to the bottom band,
so panel 01's copy pins to the viewport foot the moment its panel starts
entering, while the stage is still riding up toward its own pinned position.
For that whole stretch the phone descends directly over the pinned words.
Every viewport height has this window; only its size varies.

**The fix mirrors 17's:** `padding-top: 52svh` on `.panels` in the narrow
media block. Holding the panels back by exactly the stage's height means no
copy can reach the viewport until the phone has settled. The pinned reading
positions do not move, because the bottom band already sat below 52svh at
every height this layout serves. The exit lockstep from 17 is unaffected:
the padding is at the top, so panel 06's bottom still coincides with the
scroller's bottom.

**A probe practice worth keeping:** the clean runs were validated with a
negative control. `probe-entry-neg.mjs` re-runs the same probe with the fix
stripped in-page (`padding-top: 0 !important`) and must FIND the overlap: it
found 15 overlapping samples. A probe that has never seen the bug proves
nothing by reporting clean.

Verified: entry probe clean at 453x800, 390x844, 906x1660, 768x1024; exit
probe still clean and mid-flight probe still paints phone-over-copy at
453x800, 390x844, 906x1660; em-dash grep clean; build 1239.2 KB.

The scroller now has all three regimes measured: entry (18), between steps
(16), and exit (17). If a fourth screenshot arrives, the probes to reach for
first are probe-entry, probe-mid, and probe-exit in the session scratchpad,
each of which samples its regime in small steps rather than at rest points.

## 19. The waitlist verified against the live database

Angad asked for proof the waitlist is truly connected. It now is, verified
end to end on 2026-08-20:

- **All 12 migrations show applied on the remote**, including 0012, via
  `supabase migration list --linked`.
- The real endpoint (`functions/api/waitlist.js`, run by `tools/serve.mjs`
  in LIVE mode with the service role key) inserted a test address into the
  live table and returned `added`, then `known` on the retry. So the
  duplicate detection works against the real PostgREST version, not just the
  fake upstream in the tests.
- The row held exactly email and created_at, nothing else.
- The anon key gets `42501 permission denied` on the table, so the lockdown
  from 0012 holds: only the server-side service role can touch it.
- The test row was deleted afterward; the table is left as found.

**A blocker worth remembering:** the Supabase CLI on this machine was logged
in as angadkochar2@gmail.com, a different account that owns a different,
newer project (fjcgllboescucoghzypo, created 2026-08-12) plus Grantlytic and
SpeakUpFinal. That account 403s on the real project. Angad re-logging the CLI
fixed it. If a future session hits 403s on `--linked` commands, check which
account `supabase projects list` reflects before assuming the project is
gone.

**What remains for the waitlist is deployment only:** a Cloudflare Pages
project (build `npm run build`, output `dist`), the two secrets, and DNS for
hidewire.org. Blocked on Angad's Cloudflare account. The database side is
done and proven.

## 20. The site now deploys to Vercel

Angad asked to set up on Vercel rather than Cloudflare Pages. The repo-side
work is done and tested; what remains needs his accounts.

**What changed:**

- `api/waitlist.js`: a Vercel Edge Function that wraps the unchanged endpoint
  in `functions/api/waitlist.js`. Edge, not Node, because the Edge runtime
  speaks the standard Request and Response types the endpoint is written
  against. It forwards only the three documented env vars, not all of
  `process.env`.
- `vercel.json`: build command, output directory, and a port of every header
  in `src/_headers`, because Vercel does not read that file. The CSP now
  lives in two files that must stay identical; both files say so.
- A thirteenth test proves the adapter serves the endpoint (honeypot round
  trip: no env, no network). First attempt appended a test after the
  runner's `process.exit`, where it silently never ran; the harness is a
  `tests` object, not a `test()` function. Worth remembering: this harness
  counts "N passing" from the object, so a test that is not in the object
  does not exist.
- README deploying section rewritten for both hosts; Cloudflare remains
  wired and documented as the alternative.

**The blocking discovery: the web repo has a GitHub remote
(OnGodCR/Hidewire-web) but zero commits.** Nothing has ever been committed or
pushed. Vercel deploys from GitHub, so the first commit and push is step one
of the deployment, and it needs Angad's say-so.

**Deployment steps remaining (all Angad):** push the repo, import it on
vercel.com with preset "Other", set SUPABASE_URL and
SUPABASE_SERVICE_ROLE_KEY as Sensitive env vars, add hidewire.org under
Domains and set the registrar records. The database side is done and was
verified end to end (section 19).

Section 20 update, same day: Angad said push, and the initial commit is on
GitHub. Root commit a76f392 on main at OnGodCR/Hidewire-web, 41 files. A
secret sweep before the push found nothing, and .env, dist, and the dev stub
state stayed ignored. The remaining steps are unchanged: import on
vercel.com, the two Sensitive env vars, the domain.

## 21. Instagram: prompt pack, brand pillars, and the publishing pipeline

Angad wants the account posting two carousels a day, mostly brand rather
than product, with him approving every post. Three artifacts:

- **marketing/INSTAGRAM-CAROUSELS.md**: a system block for Claude design
  sessions plus six product decks, then five non-game brand pillars (the
  Archive, the Field Guide, Proof, the Group Chat, Transmissions) and a
  14-slot weekly rotation. The system block corrects three stale facts in
  BRIEF.md (30 minute rounds, 30 tiers, FILM no longer cosmetics-only) so
  generated decks do not repeat them. BRIEF.md itself still carries those
  errors and should get its own update pass.
- **marketing/pipeline/**: render.mjs (slide HTML to 1080x1350 PNG via
  system Chrome), publish.mjs (Meta Graph API carousel publisher, dry run
  without credentials), queue.json (the approval gate: Claude adds decks
  approved:false, only a human flips it), deck.css and the brand woff2s,
  README with the loop and Angad's one-time Meta setup.
- **marketing/carousels/06-waitlist/**: the first real deck, four slides,
  rendered and verified on-brand.

Buffer's public API is closed to new users and Later's is partner-only,
so the original "queue drafts into Buffer" idea for tier 2 is not
buildable; the approval gate lives in queue.json instead.

Blocked on Angad: professional IG account, Meta developer app plus
long-lived token, public image hosting (the Vercel site can serve an
unlinked path), and the three env vars. Also his call: the pillar
rotation is a starting grid, and BRIEF.md 8 note about a founder video
still stands, generated decks alone will read as generated.

## 22. Instagram DM approval loop, and the first live post

**The first post is live**: instagram.com/p/DcRmgdYEr6X, the four-slide
waitlist deck, published 2026-08-20 through the pipeline (media id
18111376537826362). Two publish bugs found live and fixed: the
Instagram-login flavour of the API lives on graph.instagram.com, not
graph.facebook.com; and media_publish must wait for the carousel container
to report FINISHED (code 9007 otherwise). Publisher also refreshes the
60 day token on every live run and writes it back to .env.

Angad then asked for approval over Instagram DM from his personal account,
with @hidewire_game as the sender, plus a standing bridge from Claude
design sessions. Built:

- **0015_ig_review.sql** (renamed from 0013 after colliding with the
  advisor session's 0013): ig_review (deck/status/decided_at) and
  ig_contacts (igsid, is_reviewer flag). NOT YET APPLIED: the classifier
  blocked db push three ways this session; Angad runs
  `supabase db push --linked`, which also applies the advisor session's
  pending 0014.
- **Webhook live at hidewire.org/api/ig-webhook** (web repo, host-neutral
  + Vercel edge adapter, same pattern as the waitlist). Handshake
  verified 403 on wrong token. Records every sender; only a contact with
  is_reviewer=true can approve/decline, so a stranger DMing "approve" is
  a row, not a decision. HMAC signature check when META_APP_SECRET set.
- **send-review.mjs**: DMs a rendered deck's slides plus Approve/Decline
  quick replies to REVIEWER_IGSID. 24 hour messaging window applies;
  every reviewer reply reopens it.
- **sync-approvals.mjs**: pulls DM decisions into queue.json so the
  publisher keeps exactly one gate.

Blocked on Angad, in order: run the db push; set IG_VERIFY_TOKEN (any
long random string) and META_APP_SECRET (app Settings, Basic) on the
Vercel project; configure the webhook in the Meta app (callback
https://hidewire.org/api/ig-webhook, same verify token, subscribe to
messages); add his personal IG as an Instagram Tester and accept; DM the
account once so ig_contacts captures his IGSID, then we flag him
reviewer and put REVIEWER_IGSID in the pipeline .env. If sending fails
on permissions, regenerate the token with the messages scope included.

The design-to-code bridge stands as the handoff contract in
INSTAGRAM-CAROUSELS.md (artifact link pasted per deck). The automatic
version, a GitHub inbox the design project commits to and a scheduled
task here that polls, renders, and DMs for review, is designed but not
built; it needs the claude.ai project connected to the GitHub repo.

## 23. The DM approval loop hit Meta's App Review wall; a review page instead

The webhook chain was debugged live through five real, stacked gotchas,
each verified before the next appeared: (1) the callback must be the www
host, the apex 308-redirects and Meta will not follow; (2) webhooks in
the Instagram-login flow are signed with the INSTAGRAM app secret from
the use-case page, not the Meta app secret from Settings, Basic: two
different values, near-identical labels; (3) besides the dashboard
config, the account itself must be bound via POST /me/subscribed_apps;
(4) the account's own Instagram app setting, Messaging tools, Allow
access to messages, ships off and silently filters delivery; (5) test
events arrive as entry[].changes[] while real ones use
entry[].messaging[], so the parser handles both, and a flight-recorder
row (debug:last-event) stores the last signed payload raw because a
payload in an unknown shape is otherwise indistinguishable from no
delivery.

After all five: read receipts (the app user's own actions) deliver, but
messages from another account never do, and the messaging send API
rejects the dashboard's account id (IGSIDs are a separate namespace only
obtainable from inbound events). Conclusion: real-message content under
standard access appears to be gated behind Advanced Access for
instagram_business_manage_messages, which means Meta App Review. The DM
infra (webhook, sender, sync) is deployed and stays; it goes live if
that review is ever done.

**What shipped instead: hidewire.org/api/review?key=..., a private
review page.** Pending decks render their slides with Approve and
Decline buttons; taps upsert ig_review; sync-approvals.mjs pulls
decisions into queue.json; the publisher is unchanged. Auth is one long
key in the URL held by Angad's phone bookmark and the Vercel env.
Blocked on Angad: set REVIEW_KEY in Vercel and redeploy. The 06-waitlist
deck is seeded as a pending row for a safe first test, it being already
published, so either button changes nothing live.

Reviewer identity note: ig_contacts has angadkochar2 flagged is_reviewer
under the dashboard id 17841469812243764. For the DM path that id is
WRONG (messaging wants an IGSID); for anything else it is merely a label.

## 24. The design-to-code connector: ingest.mjs

Angad asked how Claude design sessions hand decks to Claude Code. The
answer turned out to be better than pasting links: **Claude Code can
enumerate his artifact gallery and read any artifact's contents.** So a
design session's act of publishing IS the handoff. Pasting a link still
works and is quicker when one deck is waiting.

**marketing/pipeline/ingest.mjs** does everything after that in one
command: takes a URL or file plus a NN-slug, splits the document on
`<!-- SLIDE NN -->` markers, writes slide-NN.html, renders PNG and JPEG
at 1080x1350, copies the JPEGs into the website's src/ig/<slug>/, queues
the deck as approved:false, and seeds a pending ig_review row so it
appears on the review page. It deliberately does not approve anything
and does not push the website; the push stays a visible step.

Verified end to end on a synthetic two-slide artifact: slides split,
rendered on brand, copied, queued, review row seeded. Test deck then
removed from both repos, the queue, and the database.

Also added SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the pipeline
.env, which ingest needs for seeding and sync-approvals needs for
reading.

Design sessions owe three things: the SYSTEM BLOCK rules, the SLIDE
markers, and self-contained slides. No external stylesheet links, since
the artifact travels without this repo's deck.css.

## 25. First real deck from a design session, ingested

Angad published a nine-slide deck as an artifact ("HideWire Instagram
Posts") and it is now rendered, hosted, and pending on the review page as
07-the-rules. The full path worked: gallery listing, artifact fetch,
ingest, render, host, queue, seed.

**The artifact format was not the documented one, and that is fine now.**
A published artifact is a BUNDLE: each slide ships as its own gzipped
HTML page inside a manifest island, with an ext_resources island naming
them "Slide 01 Cover" and so on. That naming is the authoritative order;
page_order was empty and manifest key order is not a contract. ingest.mjs
now reads bundles first and falls back to SLIDE markers.

**Two defects in the first deck, both fixed in the pipeline rather than
by asking the designer to redo anything:**

- Slides styled with system fallbacks (Helvetica, ui-monospace) because
  an artifact cannot reach this repo's fonts. Ingest now injects the real
  Space Grotesk and IBM Plex Mono woff2s and overrides the inline
  font-family with author !important, which beats a normal inline style.
- Slides 02 and 09 referenced assets/hidewire-logo.png, which the bundle
  never shipped, so both rendered a broken-image icon. Ingest now copies
  marketing/pipeline/assets/ into every deck; the mark was rendered to a
  transparent 512px PNG from the website's SVG.

**Copy checked against BRIEF 9 and it is clean**: no face recognition, no
stranger play (slide 02 says "played with people you already know", slide
03 "nobody joins a round they weren't invited to"), no hiding places
depicted at all, no launch date, and the only purchase claim is the
allowed one, "the Seeker role cannot be bought". Facts match current
reality including 30 minute rounds.

**One judgment call left to Angad, flagged not decided:** slide 02 reads
"Think Minecraft manhunt · in real life". That is a third party's
trademark in an ad. Nominative comparison is usually defensible and the
phrasing is common positioning, but BRIEF 9 is strict and it is his call,
so the deck sits pending rather than being altered or approved.
