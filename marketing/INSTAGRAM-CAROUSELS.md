# Instagram carousel prompts for Claude design sessions

How to use: open a fresh Claude session, paste the SYSTEM BLOCK, then paste
exactly one carousel prompt. One carousel per session keeps the slides
consistent. Every prompt assumes the session can read this repo; if it
cannot, paste marketing/BRIEF.md after the system block.

---

## SYSTEM BLOCK, paste first

You are designing Instagram carousel slides for Hidewire, a real-world hide
and seek game. Read marketing/BRIEF.md in this repo before designing
anything: it defines the product, the voice, the visual identity, and the
legal lines. Three facts in it are superseded, use these instead:

- Rounds default to 30 minutes, not 45. The host can set 20 to 120.
- Season pass EXPOSURE is 30 tiers, not 50. Do not mention its price.
- FILM is not "cosmetics only" any more. Do not describe what FILM buys at
  all, and never claim purchases cannot affect a round. The one purchase
  claim allowed: the seeker role cannot be bought.

Deliverable: one self-contained HTML file per slide, artboard exactly
1080x1350 pixels, no external requests, fonts as system fallbacks styled to
read as Space Grotesk (headlines) and IBM Plex Mono (small caps labels,
letterspaced). Dark theme only: background #0A0A0C, text #F4F4F2, accent
#C8FF2E used for exactly one element per slide, red #FF4438 only for
blackout and danger, amber #FFB020 only for warnings. Never white text on
the green. No photographs, no faces, no depictions of people: pure graphic
design from the brand motifs, which are corner brackets, 45 degree
diamonds, dashed circles, tabular countdown numbers, dark map with a bright
zone ring. No emoji, no exclamation marks, no em-dashes; the separator is
the middle dot.

Slide craft rules: a cover slide must work with zero context and stop a
scroll in under a second, one idea per slide, at most 14 words of body copy
per slide, an 80 pixel safe margin on every edge, a small slide counter in
letterspaced mono (01 / 06 style), and the last slide is always the same
CTA: "hidewire.org · get on the list" plus one line about the waitlist
reward, worded exactly as "everyone on the list gets a link to an exclusive
in-game reward the day it drops". Never show or promise a launch date.

Legal lines, absolute: nothing that implies face recognition or identifying
people, nothing that implies playing with strangers (invite code and
friends only), nothing depicting or rewarding unsafe hiding: no roads,
tracks, vehicles, rooftops, private property, construction. If a hiding
place is depicted even abstractly, it is public and boring: park, plaza,
library, bench, bus shelter.

---

## Carousel 1 · The rules, in six cards (the pinned post)

Six slides plus cover and CTA, eight total. This is the evergreen explainer
that gets pinned, so favour clarity over cleverness. Cover: the tagline
"Hiding isn't enough. Prove it." with the bracket mark. Then one mechanic
per slide, in this order, each with a diagram built from the brand motifs,
not an illustration: 1. A round: 3 to 20 friends, one invite code, one
zone. 2. One of you is the Seeker. 3. The check-in: on a timer, 60 seconds,
back camera then front camera, straight to the Seeker's feed. 4. Miss it
and you are BLACKED OUT, the one red slide in the deck. 5. The reveal: the
Seeker gets positions only on a slow timer, a few seconds at a time. 6. The
tag needs real proximity, nobody gets caught from across the street. CTA
slide last.

## Carousel 2 · Sixty seconds (the check-in, dramatized)

Five slides. This is tension, not explanation: the whole deck is one
check-in happening. Slide 1: a phone-off alert treatment, "CHECK-IN · 00:60"
in huge tabular numerals. Slides 2 to 4: the countdown falling (00:41,
00:17, 00:04) with copy getting shorter and more clipped each slide, in the
equipment voice: "Back camera. Then front." / "The frame is always one
moment too late." / one final slide at 00:00 that resolves either to a
submitted frame in brackets or to BLACKED OUT in red, designer's choice,
pick the stronger single ending rather than showing both. CTA slide last.
The countdown numerals are the accent element throughout.

## Carousel 3 · Spots that pass, spots that get you blacked out

Seven slides. The listicle from BRIEF.md angle 2, drawn as abstract
top-down map tiles with a diamond marking the spot, never a photo. Three
"passes the check" spots (a park treeline, a library stack, a plaza
colonnade: dark tile, green diamond, one mono caption line on why the
photo still proves little). Three "blacked out" spots, and every one of
them fails for a game reason, never a safety reason: too dark to validate,
too featureless, too far from the zone edge when it shrinks (red diamond,
red caption). Do not depict roads, cars, rooftops, or anywhere private as
options at all, not even as the failures. CTA slide last.

## Carousel 4 · How to take a photo that proves nothing

Six slides. The skill-expression angle: perfectly legal check-ins that give
the Seeker nothing. Each slide is one technique, shown as a framed abstract
"photo" built from shapes: fill the frame with texture (gravel, hedge,
brick), shoot into blank sky, get low so the background is only ground,
crop against a wall. Copy is deadpan equipment voice, one line per slide:
"A valid frame. A useless frame." The joke carries the deck; the design
stays cold and does not wink. CTA slide last.

## Carousel 5 · What the Seeker sees

Five slides. The other side of the game, and the deck that sells the fear.
A dark map with the zone ring, hider diamonds appearing for a few seconds
and going stale: slide the timestamps forward each card ("LAST SEEN 00:19
AGO", then 02:47, then 05:31) so the information decays in front of you.
Copy: "The Seeker sees everything. Briefly." / "Positions on a timer, not a
feed." / "Old information is the only information." End on the zone
shrinking. CTA slide last. This deck must make the reveal mechanic feel
fair: the Seeker is powerful on a schedule, not omniscient.

## Carousel 6 · Get on the list (the waitlist push)

Four slides, the shortest deck, designed to be posted the week the account
goes live and re-posted as the pin rotates. Slide 1: the mark and "Waitlist
open" in mono caps. Slide 2: what Hidewire is in one line, from BRIEF.md
section 1, compressed to under 14 words. Slide 3: the reward line, exactly
as the system block words it, with the diamond motif as the visual. Slide
4: hidewire.org, enormous, green on black, nothing else on the slide but
the bracket mark.

---

Production notes: generate decks in the numbered order, 6 first if the
account needs a post on day one. After each deck, screenshot every artboard
at 1080x1350 and review the cover at thumbnail size, 161 pixels wide,
before calling it done: if the cover does not read at that size it is not a
cover. Files land in marketing/carousels/<number>-<slug>/ as slide-01.html
through slide-NN.html plus exported PNGs.

---

# The brand engine: two carousels a day

The six decks above are product posts. At two a day the account needs to be
a brand first, so most slots are filled from pillars that never mention the
app and still could not belong to anyone else. Everything inherits the
SYSTEM BLOCK: same voice, same palette, same motifs, same legal lines.
The rule that keeps volume from diluting the brand: a reader who saw only
non-game posts for a week should still be able to guess what the product
is the day it appears.

## Pillar A · The Archive (hiding, evasion, and camouflage as culture)

Real, documented, legal stories told in the equipment voice, five to seven
slides, one fact per slide. A deck each on: the Nascondino World
Championship, the actual world hide and seek tournament; dazzle camouflage,
ships painted to be unfindable; how animal camouflage actually works,
countershading and disruptive coloration; the history of tag and manhunt as
folk games; Cold War tradecraft that is now declassified history, dead
drops and brush passes. Absolute exclusions: no crimes told admiringly, no
fugitives, no trespass stories, nothing that reads as a how-to for evading
police. The Archive is a museum, not a manual.

## Pillar B · The Field Guide (public space, read like a player)

Top-down abstract map tiles and architecture told cold: why plazas have
blind corners, how park designers think about sightlines, five kinds of
public bench and what each one sees, the geometry of a colonnade. City
specific versions seed a launch city: "Seattle, read as a map" using only
public landmarks. Public space only, ever: parks, plazas, libraries,
campuses, waterfronts. This pillar is where local pull comes from, and it
is also one long safety statement: the game's world is public ground, said
without ever saying it.

## Pillar C · Proof (photography as evidence)

The FILM pillar. Film photography culture, why grain reads as honesty, the
history of photo verification, famous photographs that proved something
and famous ones that proved nothing, what a timestamp is worth, how
little a frame actually shows. Never imply the product analyses faces or
identifies people; this pillar talks about photographs, not about people
in them. It quietly teaches the audience the game's core mechanic before
they know the game exists.

## Pillar D · The Group Chat (the social truth, deadpan)

Relatable observational decks in the coldest voice on the account, four to
five slides: "Every group has one person who is never on time. The round
starts anyway." Archetypes of a friend group organising anything, the
physics of a plan surviving contact with eleven people, why the person who
suggests the game is never the person who wins it. No emoji, no meme
templates, no borrowed formats: the humour lands because the equipment
voice refuses to laugh. This pillar is the shareable one; it is how the
account reaches people who follow nothing else in the niche.

## Pillar E · Transmissions (pure aesthetic drops)

The lowest-effort, highest-frequency filler that still compounds the
brand: wallpaper-grade slides of the motifs, countdown numerals at
beautiful sizes, single lines of copy in the letterspaced mono, dashed
circles on black. Three slides is enough. These exist so the grid always
looks intentional and the two-a-day cadence never forces a weak idea into
a full deck.

## The weekly rotation, fourteen slots

Morning slot builds the brand, evening slot points at the product or the
list. A steady week:

| Day | Morning | Evening |
|---|---|---|
| Mon | A · Archive | Product deck or variant |
| Tue | D · Group Chat | C · Proof |
| Wed | B · Field Guide | E · Transmission |
| Thu | A · Archive | Product deck or variant |
| Fri | D · Group Chat | B · Field Guide, city edition |
| Sat | E · Transmission | C · Proof |
| Sun | B · Field Guide | Carousel 6, the waitlist push |

Product decks 1 to 5 rotate through the product slots with new variants
rather than reposts: same concept, new spots, new countdown, new copy. The
waitlist deck runs weekly, always the Sunday evening pin candidate.

## Production at this volume

Generate a full week in one batch, fourteen decks in one sitting, so the
review is one sitting too: every slide checked against section 9 once,
covers checked at 161 pixels, then the whole week queued. The approval
step does not scale away because the volume went up; it is the only thing
standing between an automated pipeline and an automated mistake. If a deck
fails review it is dropped, not fixed inline, and a Transmission takes its
slot: the calendar never forces a bad post out the door.

Watch the data with one number per pillar, saves per reach, and after four
weeks let the worst pillar lose its slots to the best one. The rotation is
a starting grid, not a constitution.

---

# Handoff: Claude design to Claude Code

Division of labour: **Claude design sessions design; Claude Code renders,
queues, and publishes.** Claude Code does not design decks.

Output contract for every design session, added to the SYSTEM BLOCK when
prompting: deliver the deck as ONE artifact containing every slide's full
HTML in order, each slide preceded by a comment line exactly of the form
`<!-- SLIDE 01 -->`, `<!-- SLIDE 02 -->`, and so on. Each slide must be a
complete self-contained 1080x1350 page: all CSS inline (no external
stylesheet links; the pipeline's deck.css conventions inlined instead),
fonts declared as system fallbacks, everything else per the SYSTEM BLOCK.

The loop:

1. A Claude design session (the claude.ai project holding this file and
   BRIEF.md as knowledge) designs a deck and **publishes it as an
   artifact**. Publishing is the handoff: an artifact lands in Angad's
   gallery, and Claude Code can enumerate that gallery and read any
   artifact's contents. Nothing needs to be pasted, though pasting a
   link works too and is faster when only one deck is waiting.
2. Claude Code runs `ingest.mjs <url-or-file> <NN-slug>`, which does
   everything mechanical in one pass: split on the SLIDE markers, write
   slide-NN.html, render PNGs and JPEGs, copy the JPEGs into the
   website's /ig folder, queue the deck as approved:false, and seed a
   pending row so it appears on the review page.
3. Claude Code writes the caption into queue.json and pushes the website
   so the images are publicly reachable, which the publishing API needs.
4. Angad opens the review page bookmark and taps Approve or Decline.
   Only a human decides; ingest never approves anything.
5. sync-approvals.mjs pulls the decisions into queue.json and publish.mjs
   posts what was approved, on the rotation schedule.

The design session's obligations are just the SYSTEM BLOCK rules and
self-contained slides. Two things it does NOT need to worry about, learned
from the first real deck:

- **Fonts.** Style with system fallbacks as the system block says. Ingest
  swaps in the real Space Grotesk and IBM Plex Mono faces, so the posts
  match the website rather than resembling it.
- **The mark.** Reference `assets/hidewire-logo.png` and it will resolve:
  ingest copies the real mark into every deck. An artifact cannot carry
  repo files, so a design session that inlines its own logo will get a
  broken image instead.

Both input shapes work. A published artifact bundles each slide as its own
page named "Slide 01 ...", which ingest reads directly and in that order.
A hand-written or pasted deck can instead be one document with
`<!-- SLIDE 01 -->` markers between slides.
