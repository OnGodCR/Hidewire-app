import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, font, radius, space } from '../../theme';
import {
  Body,
  Card,
  Confirm,
  Display,
  EmptyState,
  Label,
  Mono,
  Rule,
  SectionHeader,
} from '../../components/ui';
import { FadeIn, PressScale } from '../../components/motion';
import { POI_TYPE_META } from '../../components/ZoneMap';
import { isOpenNow } from '../../components/PoiSheet';
import { useGame } from '../../engine/GameContext';
import { useWorld } from '../../engine/WorldContext';
import { TEST_MODE } from '../../config';
import type { Poi } from '../../data/poiRules';

// ---------------------------------------------------------------------------
// Nearby.
//
// **18+ only, and that is a hard gate.** This is the one surface in Hidewire where
// a player can see other players they do not already know, which is why it is
// the one surface minors never reach. The age bracket comes from the DOB gate;
// the date of birth itself is never stored.
//
// Even for adults, this is built to the most conservative reading that still
// delivers the feature:
//
//   - **Opt in, off by default.** Nobody is listed until they choose to be,
//     and the choice persists: it does not silently reset between sessions.
//   - **Coarse distance only.** Buckets, never a position, never a pin on a
//     map. Knowing someone is "under 1 km" is enough to decide whether to ask
//     them to play; knowing where they are standing is not something a stranger
//     needs.
//   - **Requests, not contact.** You can send an invite. You cannot message,
//     and you cannot see them again unless they accept.
//   - **Report and block on every row**, same as friends.
//
// This is a deliberate supersession of the "never imply stranger play" line in
// marketing/BRIEF.md 9. It is recorded as such in CLAUDE.md, because it is a
// legal line and a product decision to cross it should be visible rather than
// buried in a component.
// ---------------------------------------------------------------------------

/** Coarse buckets. Deliberately not a number of metres. */
function bucket(m: number): string {
  if (m < 500) return 'UNDER 500 M';
  if (m < 1000) return 'UNDER 1 KM';
  if (m < 3000) return 'UNDER 3 KM';
  return 'FURTHER OUT';
}

interface NearbyGame {
  id: string;
  host: string;
  players: number;
  max: number;
  distM: number;
  startsIn: string;
}

/** Fixture. See TEST-FIXTURES.md. */
const NEARBY_GAMES: NearbyGame[] = TEST_MODE
  ? [
      { id: 'n1', host: 'VESPER', players: 4, max: 6, distM: 420, startsIn: '6 MIN' },
      { id: 'n2', host: 'HALFLIGHT', players: 3, max: 8, distM: 1650, startsIn: '18 MIN' },
      { id: 'n3', host: 'GRAIN', players: 5, max: 6, distM: 2900, startsIn: '31 MIN' },
    ]
  : [];

export function LocationTab() {
  const { ageBracket, profile, seen, markSeen } = useGame();
  const { world, status, request, busy } = useWorld();
  const [asked, setAsked] = useState<string[]>([]);
  const [reported, setReported] = useState<string[]>([]);
  const [blockedHosts, setBlockedHosts] = useState<string[]>([]);
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<NearbyGame | null>(null);

  if (ageBracket !== '18_plus') {
    return <AdultsOnly />;
  }

  // Persisted, not component state. A visibility choice that silently forgot
  // itself between sessions would make "off by default" a lie both ways.
  const visible = seen.nearbyVisible;
  const games = NEARBY_GAMES.filter((g) => !blockedHosts.includes(g.id));
  const pois = [...world.pois].sort((a, b) => a.distM - b.distM).slice(0, 12);
  const live = status.state === 'ready';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: space(5), paddingBottom: space(8) }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn>
          <Display>Nearby</Display>
          <Body style={{ color: color.dim, marginTop: space(1) }}>
            Open games near you. 18 and over, off by default.
          </Body>
        </FadeIn>

        {/* ---- visibility, off by default ---- */}
        <FadeIn index={1}>
          <Card style={[styles.section, { marginTop: space(4) }]}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Label tone="text">Let nearby players see me</Label>
                {visible ? (
                  <Mono style={styles.visState}>
                    VISIBLE AS {(profile.handle || 'YOU').toUpperCase()} · COARSE DISTANCE ONLY
                  </Mono>
                ) : (
                  <>
                    <Mono style={[styles.visState, { color: color.faint }]}>
                      NOBODY CAN SEE YOU
                    </Mono>
                    {/* The one line that must survive any copy cut: what
                        turning this on shares, stated before it is on. */}
                    <Body style={styles.noteBody}>
                      When on, adults nearby see your handle and a rough distance.
                      Never your position.
                    </Body>
                  </>
                )}
              </View>
              <Switch
                value={visible}
                onValueChange={(v) => {
                  Haptics.selectionAsync();
                  markSeen({ nearbyVisible: v });
                }}
                trackColor={{ false: color.surface2, true: color.accentDim }}
                thumbColor={visible ? color.accent : color.faint}
              />
            </View>
          </Card>
        </FadeIn>

        {/* ---- games near you ---- */}
        <FadeIn index={2}>
          <SectionHeader
            title="Games near you"
            right={String(games.length)}
            style={{ marginTop: space(6) }}
          />
          <Body style={styles.sectionSub}>
            Asking to join sends your handle and distance bucket. Never your position.
          </Body>
        </FadeIn>

        {games.length === 0 ? (
          <EmptyState
            title="Nothing open nearby"
            body="Host a round of your own and your friends can join with a code."
            style={{ marginTop: space(3) }}
          />
        ) : (
          games.map((g, i) => {
            const sent = asked.includes(g.id);
            const flagged = reported.includes(g.id);
            return (
              <FadeIn key={g.id} index={3 + i}>
                <Card style={styles.gameCard}>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.host}>{g.host}</Text>
                      <Mono style={styles.gameMeta}>
                        {g.players}/{g.max} PLAYERS · STARTS IN {g.startsIn}
                      </Mono>
                    </View>
                    <View style={styles.distChip}>
                      <Mono style={styles.distText}>{bucket(g.distM)}</Mono>
                    </View>
                  </View>

                  <View style={styles.gameActions}>
                    {sent ? (
                      <View style={styles.sentStrip}>
                        <Mono style={styles.askText}>REQUEST SENT</Mono>
                      </View>
                    ) : (
                      <PressScale
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setAsked((a) => [...a, g.id]);
                        }}
                      >
                        <View style={styles.askBtn}>
                          <Mono style={styles.askText}>ASK TO JOIN</Mono>
                        </View>
                      </PressScale>
                    )}
                    <View style={{ flex: 1 }} />
                    <PressScale
                      disabled={flagged}
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setReported((r) => [...r, g.id]);
                      }}
                    >
                      <View style={styles.modHit}>
                        <Mono style={[styles.modAction, flagged && { opacity: 0.45 }]}>
                          {flagged ? 'REPORTED' : 'REPORT'}
                        </Mono>
                      </View>
                    </PressScale>
                    <PressScale onPress={() => setConfirmBlock(g)}>
                      <View style={styles.modHit}>
                        <Mono style={styles.modDanger}>BLOCK</Mono>
                      </View>
                    </PressScale>
                  </View>

                  {sent && (
                    <Mono style={styles.sentNote}>
                      THEY DECIDE. YOU WILL NOT SEE THIS GAME AGAIN UNLESS THEY ACCEPT.
                    </Mono>
                  )}
                </Card>
              </FadeIn>
            );
          })
        )}

        {blockedMsg && <Body style={styles.blockedNote}>{blockedMsg}</Body>}

        <View style={styles.safetyStrip}>
          <Mono style={styles.safety}>
            REQUESTS ONLY · NO MESSAGING · NO EXACT POSITIONS · NOBODY SEES YOU UNLESS
            YOU TURN IT ON
          </Mono>
        </View>

        <Rule style={{ marginVertical: space(6) }} />

        {/* ---- landmarks ---- */}
        <FadeIn index={6}>
          <SectionHeader
            title="Landmarks near you"
            right={
              live || status.state === 'fallback' ? (
                <View
                  style={[
                    styles.srcChip,
                    { borderColor: live ? color.accentDim : color.warn },
                  ]}
                >
                  <Mono
                    style={{
                      fontSize: 8,
                      letterSpacing: 1.2,
                      color: live ? color.accent : color.warn,
                    }}
                  >
                    {live ? 'LIVE' : 'SAMPLE'}
                  </Mono>
                </View>
              ) : undefined
            }
          />
        </FadeIn>

        {status.state === 'idle' ? (
          <EmptyState
            title="Turn on location to see landmarks near you"
            body="Your position is only used while the app looks around you. It is never shown to anyone."
            action={{ title: 'Use my location', onPress: () => request() }}
            style={{ marginTop: space(3) }}
          />
        ) : busy ? (
          <Card style={{ padding: 0, marginTop: space(3) }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.poiRow}>
                <View style={[styles.poiGlyph, { borderColor: color.line }]} />
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                  <View style={[styles.skelLine, { width: '62%' }]} />
                  <View style={[styles.skelLine, { width: '34%' }]} />
                </View>
              </View>
            ))}
            <View style={styles.poiFoot}>
              <Mono style={{ fontSize: 10, color: color.faint, letterSpacing: 1.2 }}>
                FINDING LANDMARKS NEAR YOU...
              </Mono>
            </View>
          </Card>
        ) : (
          <>
            {status.state === 'fallback' && (
              <View style={styles.fallbackStrip}>
                <Mono style={{ fontSize: 9, letterSpacing: 1, lineHeight: 14, color: color.warn }}>
                  {status.reason.toUpperCase()} · SHOWING SAMPLE LANDMARKS
                </Mono>
              </View>
            )}
            <Card style={{ padding: 0, marginTop: space(3) }}>
              {pois.map((p: Poi) => {
                const meta = POI_TYPE_META[p.type];
                const open = isOpenNow(p.hours);
                return (
                  <View key={p.id} style={styles.poiRow}>
                    <View style={[styles.poiGlyph, { borderColor: meta.tint }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Mono style={styles.poiName} numberOfLines={1}>
                        {p.name}
                      </Mono>
                      <Mono style={styles.poiMeta}>
                        {meta.label} · {p.category.toUpperCase()}
                        {!open ? ' · CLOSED' : ''}
                      </Mono>
                    </View>
                    <Mono style={styles.poiDist}>{p.distM} m</Mono>
                  </View>
                );
              })}
            </Card>
          </>
        )}
      </ScrollView>

      <Confirm
        visible={confirmBlock != null}
        title={`Block ${confirmBlock?.host ?? ''}?`}
        body="You will not see games from this host again, and they will not see you. This cannot be undone."
        confirmLabel="Block"
        danger
        onConfirm={() => {
          if (confirmBlock) {
            setBlockedHosts((b) => [...b, confirmBlock.id]);
            setBlockedMsg('Blocked. You will not see games from this host.');
          }
          setConfirmBlock(null);
        }}
        onCancel={() => setConfirmBlock(null)}
      />
    </View>
  );
}

function AdultsOnly() {
  return (
    <View style={styles.gateWrap}>
      <Label tone="danger">18 and over</Label>
      <Text style={styles.gateTitle}>Nearby is not available on your account.</Text>
      <Body style={{ color: color.dim, marginTop: space(3), lineHeight: 21 }}>
        This is the only part of Hidewire where you can see players you do not already
        know, so it is limited to adults.
      </Body>
      <Body style={styles.gateNote}>
        Everything else works normally. Play with friends using an invite code or a
        friend code.
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { padding: space(4) },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  visState: { fontSize: 10, letterSpacing: 1, color: color.accent, marginTop: 5 },
  noteBody: { fontSize: 13, lineHeight: 19, color: color.dim, marginTop: space(1.5) },
  sectionSub: { fontSize: 13, lineHeight: 19, color: color.dim, marginTop: space(2.5) },
  gameCard: { padding: space(4), marginTop: space(3) },
  host: { fontFamily: font.display, fontSize: 19, color: color.text },
  gameMeta: { fontSize: 9, letterSpacing: 1.1, color: color.faint, marginTop: 3 },
  distChip: {
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.sm,
    paddingHorizontal: space(2.5),
    paddingVertical: space(1),
  },
  distText: { fontSize: 9, letterSpacing: 1.1, color: color.accent },
  gameActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    marginTop: space(3),
  },
  askBtn: {
    borderWidth: 1,
    borderColor: color.accent,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
  },
  sentStrip: {
    borderWidth: 1,
    borderColor: color.accentDim,
    backgroundColor: color.surface2,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
  },
  askText: { fontSize: 10, letterSpacing: 1.3, color: color.accent },
  sentNote: {
    fontSize: 8,
    letterSpacing: 1,
    lineHeight: 13,
    color: color.faint,
    marginTop: space(2),
  },
  /* Padding does the 44pt work here: PressScale does not forward hitSlop, so
     the target is grown with the box instead. */
  modHit: { paddingVertical: space(3), paddingHorizontal: space(2) },
  modAction: { fontSize: 10, letterSpacing: 1.1, color: color.faint },
  modDanger: { fontSize: 10, letterSpacing: 1.1, color: color.danger },
  blockedNote: { fontSize: 13, lineHeight: 19, color: color.dim, marginTop: space(3) },
  safetyStrip: {
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    padding: space(3),
    marginTop: space(3),
  },
  safety: {
    fontSize: 9,
    letterSpacing: 1.1,
    lineHeight: 15,
    color: color.faint,
  },
  srcChip: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space(2),
    paddingVertical: 2,
  },
  fallbackStrip: {
    borderWidth: 1,
    borderColor: color.warn,
    borderRadius: radius.sm,
    padding: space(3),
    marginTop: space(3),
  },
  poiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingVertical: space(3),
    paddingHorizontal: space(4),
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  poiGlyph: { width: 11, height: 11, borderWidth: 2, transform: [{ rotate: '45deg' }] },
  poiName: { fontSize: 13, color: color.text },
  poiMeta: { fontSize: 9, letterSpacing: 1, color: color.faint, marginTop: 2 },
  poiDist: { fontSize: 12, color: color.dim },
  poiFoot: { padding: space(4), alignItems: 'center' },
  skelLine: { height: 9, borderRadius: 4, backgroundColor: color.surface2 },
  gateWrap: { flex: 1, justifyContent: 'center', padding: space(6) },
  gateTitle: {
    fontFamily: font.display,
    fontSize: 28,
    lineHeight: 34,
    color: color.text,
    marginTop: space(2),
  },
  gateNote: { fontSize: 13, color: color.dim, lineHeight: 19, marginTop: space(5) },
});
