import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { color, font, radius, space } from '../theme';
import { Bar, Body, Btn, Card, Label, Mono, Rule, Toast } from '../components/ui';
import { FadeIn } from '../components/motion';
import { ZoneMap } from '../components/ZoneMap';
import { useWorld } from '../engine/WorldContext';
import { useGame, SEEKER_BOT } from '../engine/GameContext';
import { PermissionNote } from './Onboarding';
import { useScrollGate } from '../components/useScrollGate';
import { TEST_MODE } from '../config';

// ---------------------------------------------------------------------------
// The lobby is one screen reached from two directions, and the difference
// matters: the home path makes you the host, the join path does not. The route
// table has no params, so the join screen leaves the code it validated in a
// module flag and the lobby picks it up on mount. Null means hosting.
// ---------------------------------------------------------------------------
let joinedWithCode: string | null = null;

/**
 * A one-shot notice for the lobby to show on arrival, set by whichever screen
 * sent the player here. Friends' HOST action uses it, so the confirmation can
 * appear on the screen it talks about rather than on one that is unmounting.
 */
let lobbyNotice: string | null = null;
export function setLobbyNotice(text: string) {
  lobbyNotice = text;
}

// ---------- join ----------

type JoinPhase = 'idle' | 'checking' | 'failed' | 'success';

export function Join() {
  const { go } = useGame();
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<JoinPhase>('idle');
  const inputRef = useRef<TextInput>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // There is no backend call yet, so the check is simulated rather than
  // skipped: in test mode any well-formed code resolves, which is exactly the
  // set the demo accepted before, and outside test mode every code fails
  // honestly because there is no server holding a party to find.
  const submit = () => {
    if (code.length < 6 || phase === 'checking' || phase === 'success') return;
    setPhase('checking');
    timers.current.push(
      setTimeout(() => {
        if (TEST_MODE) {
          setPhase('success');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          timers.current.push(
            setTimeout(() => {
              joinedWithCode = code;
              go('lobby');
            }, 250),
          );
        } else {
          setPhase('failed');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }, 700),
    );
  };

  const cellBorder =
    phase === 'checking'
      ? color.line
      : phase === 'failed'
        ? color.danger
        : phase === 'success'
          ? color.accent
          : null;

  return (
    <View style={styles.screen}>
      <View style={{ flex: 1, padding: space(6), paddingTop: insets.top + space(10) }}>
        <Pressable onPress={() => go('home')} hitSlop={10}>
          <Label tone="faint">← Back</Label>
        </Pressable>
        <Text style={styles.h1}>Enter invite code</Text>
        <Pressable
          style={styles.codeRow}
          onPress={() => inputRef.current?.focus()}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.codeCell,
                i === code.length && phase === 'idle' && styles.codeCellActive,
                cellBorder != null && { borderColor: cellBorder },
              ]}
            >
              <Text style={styles.codeChar}>{code[i] ?? ''}</Text>
            </View>
          ))}
        </Pressable>
        <TextInput
          ref={inputRef}
          value={code}
          editable={phase !== 'checking' && phase !== 'success'}
          onChangeText={(v) => {
            setCode(v.replace(/[^a-hj-km-np-zA-HJ-KM-NP-Z2-9]/g, '').toUpperCase().slice(0, 6));
            if (phase === 'failed') setPhase('idle');
          }}
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          style={{ position: 'absolute', opacity: 0, height: 1 }}
        />
        {/* Fixed height, so the three states swap without the layout jumping. */}
        <View style={styles.codeStatus}>
          {phase === 'failed' ? (
            <Body style={{ color: color.danger, fontSize: 13, lineHeight: 18 }}>
              No party with that code. Check it with whoever sent it.
            </Body>
          ) : phase === 'checking' || phase === 'success' ? (
            <Mono style={{ fontSize: 10, color: color.dim, letterSpacing: 1.2 }}>
              CHECKING CODE...
            </Mono>
          ) : (
            <Mono style={{ fontSize: 10, color: color.faint }}>
              NO 0/O · NO 1/I/L · CODES SKIP AMBIGUOUS CHARACTERS
            </Mono>
          )}
        </View>
      </View>
      <View style={{ padding: space(6), paddingBottom: insets.bottom + space(5) }}>
        <Btn
          title="Join party"
          disabled={code.length < 6 || phase === 'checking' || phase === 'success'}
          onPress={submit}
        />
      </View>
    </View>
  );
}

// ---------- lobby ----------

interface RosterRow {
  name: string;
  ready: boolean;
  you?: boolean;
  host?: boolean;
  /** A simulated player, added on purpose for review. Never a real person. */
  sim?: boolean;
}

/** PRD 4.1: a round needs at least three players. */
const MIN_PARTY = 3;
const MAX_PARTY = 6;

/**
 * Simulated players, for reviewing the round screens without four friends on
 * hand. Offsets are seconds after the host asks for them.
 *
 * These used to arrive on a timer the moment the lobby opened, whether anyone
 * wanted them or not. That was demo dressing that read as a real behaviour, and
 * a bad one: the splash screen promises PRIVATE PARTIES ONLY and the marketing
 * brief forbids implying stranger play, so a host watching unknown names appear
 * unbidden is the app contradicting its own core promise. Filling the lobby is
 * now something the host does deliberately, and the roster labels them.
 */
const SIM_SCHEDULE: { t: number; name: string }[] = [
  { t: 0, name: SEEKER_BOT.name },
  { t: 1, name: 'MAYA' },
  { t: 2, name: 'DEV' },
  { t: 3, name: 'JULES' },
  { t: 4, name: 'ARI' },
];

/**
 * Host settings, with the option sets from the PRD 4.2 table. Tapping a row
 * steps to the next option and wraps, which is faster one-handed than opening
 * a picker for six settings that all have short option lists.
 */
interface SettingDef {
  key: string;
  label: string;
  options: string[];
  /** Locked behind a level, per PRD 5.1. */
  lockedAbove?: number;
}

const SETTING_DEFS: SettingDef[] = [
  {
    key: 'zone',
    label: 'ZONE',
    options: ['300 M', '500 M', '1.0 KM', '2.0 KM', '5.0 KM', '10 KM'],
    lockedAbove: 4,
  },
  {
    key: 'round',
    label: 'ROUND',
    options: ['20 MIN', '30 MIN', '45 MIN', '60 MIN', '90 MIN', '120 MIN'],
    lockedAbove: 4,
  },
  { key: 'checkin', label: 'CHECK-IN', options: ['EVERY 3 MIN', 'EVERY 5 MIN', 'EVERY 10 MIN'] },
  {
    key: 'reveal',
    label: 'REVEAL',
    options: ['EVERY 5 MIN', 'EVERY 10 MIN', 'EVERY 15 MIN'],
  },
  { key: 'visible', label: 'REVEAL LASTS', options: ['15 S', '30 S', '60 S', 'PERMANENT'] },
  { key: 'seekers', label: 'SEEKERS', options: ['1', '2', '3'] },
  { key: 'cooldown', label: 'SEEKER COOLDOWN', options: ['2 MIN', '5 MIN', '10 MIN'] },
  { key: 'shrink', label: 'SHRINKING ZONE', options: ['ON', 'OFF'] },
  { key: 'buffs', label: 'BUFFS', options: ['ON', 'OFF'] },
  { key: 'spectate', label: 'SPECTATE AFTER OUT', options: ['ON', 'OFF'] },
];

const DEFAULT_SETTINGS: Record<string, number> = {
  zone: 2,
  round: 1,
  checkin: 1,
  reveal: 1,
  visible: 1,
  seekers: 0,
  cooldown: 1,
  shrink: 0,
  buffs: 0,
  spectate: 0,
};

/**
 * Named presets.
 *
 * Ten settings is a lot to hand a host who has never played, and the previous
 * version buried the only preset behind one APPLY RURAL PRESET link at the
 * bottom of the list, where nobody found it. These are the actual answer to
 * "what should I pick", so they go first and they say what they change.
 *
 * PRD 4.2: rural play is a settings problem, which is why it gets a preset
 * rather than a separate mode.
 */
export interface Preset {
  key: string;
  name: string;
  blurb: string;
  detail: string;
  settings: Record<string, number>;
}

export const PRESETS: Preset[] = [
  {
    key: 'city',
    name: 'CITY',
    blurb: 'The default. Dense streets, short walks.',
    detail: '1 KM · 30 MIN · CHECK-IN 5 MIN',
    settings: { ...DEFAULT_SETTINGS },
  },
  {
    key: 'sprint',
    name: 'SPRINT',
    blurb: 'One quick game. Good for a first round.',
    detail: '500 M · 20 MIN · CHECK-IN 3 MIN',
    settings: { ...DEFAULT_SETTINGS, zone: 1, round: 0, checkin: 0, reveal: 0, cooldown: 0 },
  },
  {
    key: 'rural',
    name: 'RURAL',
    blurb: 'Spread out, fewer landmarks, longer legs.',
    detail: '5 KM · 90 MIN · REVEALS STAY UP',
    settings: { ...DEFAULT_SETTINGS, zone: 4, round: 4, reveal: 0, visible: 3 },
  },
];

/** FILM per bid increment, and what the bots are willing to pay. */
const BID_STEP = 25;
const RIVAL_BID = TEST_MODE ? 75 : 0;

/** Which preset the current settings match, if any. */
function activePreset(s: Record<string, number>): string | null {
  const found = PRESETS.find((p) =>
    Object.keys(p.settings).every((k) => p.settings[k] === s[k]),
  );
  return found ? found.key : null;
}

const HOST_LEVEL_GATE = 20;

/** Invite codes live for four hours; the demo opens partway through. */
const CODE_TTL_S = 4 * 3600 - 140;

export function Lobby() {
  const { go, profile, partyCode, startRound, spendFilm } = useGame();
  const { world, status, request } = useWorld();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [elapsed, setElapsed] = useState(0);
  const [settings, setSettings] = useState<Record<string, number>>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Captured once on mount. The home path leaves the flag null, so hosting is
  // the default; the join path filled it with the code that was validated.
  const [joinedCode] = useState<string | null>(joinedWithCode);
  const [notice, setNotice] = useState<string | null>(lobbyNotice);
  const isHost = joinedCode == null;
  useEffect(() => {
    joinedWithCode = null;
    lobbyNotice = null;
  }, []);

  // The zone centres on the host's position (PRD 4.2), so this is the moment
  // location is genuinely needed and therefore the right moment to ask.
  useEffect(() => {
    if (status.state === 'idle') request(1000);
  }, []);

  const cycle = (def: SettingDef) => {
    Haptics.selectionAsync();
    setSettings((s) => {
      const gated = def.lockedAbove !== undefined && profile.level < HOST_LEVEL_GATE;
      let next = ((s[def.key] ?? 0) + 1) % def.options.length;
      if (gated) {
        // Skip locked options instead of stepping into them and warning after.
        let guard = 0;
        while (next >= def.lockedAbove! && guard++ < def.options.length) {
          next = (next + 1) % def.options.length;
        }
      }
      return { ...s, [def.key]: next };
    });
  };

  // A preset can still land on a locked value (RURAL, below level 20), which
  // is the one path left into this notice now that cycling skips locks.
  const gatedNotice =
    isHost &&
    profile.level < HOST_LEVEL_GATE &&
    SETTING_DEFS.some(
      (d) => d.lockedAbove !== undefined && (settings[d.key] ?? 0) >= d.lockedAbove,
    );
  const [acked, setAcked] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // null until the host explicitly asks for simulated players. Holds the
  // `elapsed` value at that moment so arrivals still stagger from the tap
  // rather than from when the lobby opened.
  const [simFrom, setSimFrom] = useState<number | null>(null);
  const simElapsed = simFrom == null ? -1 : elapsed - simFrom;

  const roster: RosterRow[] = [
    { name: profile.handle || 'YOU', ready: acked, you: true, host: isHost },
    ...(simFrom == null
      ? []
      : SIM_SCHEDULE.filter((j) => simElapsed >= j.t).map((j) => ({
          name: j.name,
          ready: simElapsed >= j.t + 2,
          sim: true,
        }))),
  ];

  const allIn = roster.length >= MIN_PARTY && roster.every((r) => r.ready);
  const preset = activePreset(settings);
  const presetDetail = preset ? PRESETS.find((p) => p.key === preset)!.detail : null;

  const expiresIn = Math.max(0, CODE_TTL_S - elapsed);
  const expired = expiresIn === 0;

  // Seeker bidding. Highest bid takes the role rather than the server rolling
  // for it. The winner PAYS, so this is a sink, not a reward. FILM is sold now
  // (see CLAUDE.md 6), which makes this winnable with money; that tension is
  // recorded there rather than resolved here.
  const [bid, setBid] = useState(0);
  // Nobody to outbid until there is somebody in the lobby to outbid.
  const topRivalBid = roster.some((r) => r.sim) ? RIVAL_BID : 0;
  const winningBid = bid > topRivalBid;
  const canBid = bid + BID_STEP <= profile.film;
  const maxBid = Math.floor(profile.film / BID_STEP) * BID_STEP;

  const blocker = expired
    ? 'THIS INVITE CODE HAS EXPIRED'
    : roster.length < MIN_PARTY
      ? `NEEDS ${MIN_PARTY} PLAYERS · YOU HAVE ${roster.length}`
      : !acked
        ? 'READ THE SAFETY CARD FIRST'
        : !allIn
          ? 'WAITING FOR EVERYONE TO BE READY'
          : null;
  const canStart = blocker == null;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          padding: space(5),
          paddingTop: insets.top + space(4),
          paddingBottom: space(4),
        }}
      >
        <Pressable onPress={() => go('home')} hitSlop={10}>
          <Label tone="faint">← Leave party</Label>
        </Pressable>

        <FadeIn style={styles.codeHeader}>
          <View>
            <Label tone="faint">Invite code</Label>
            <Text style={styles.bigCode}>{joinedCode ?? partyCode}</Text>
          </View>
          <View style={styles.expiry}>
            <Label tone="faint" style={{ fontSize: 8 }}>
              EXPIRES
            </Label>
            {expired ? (
              <Mono style={{ fontSize: 12, color: color.warn, letterSpacing: 1 }}>
                CODE EXPIRED
              </Mono>
            ) : (
              <Mono style={{ fontSize: 12, color: color.dim }}>
                {(() => {
                  const h = Math.floor(expiresIn / 3600);
                  const m = Math.floor((expiresIn % 3600) / 60);
                  const ss = expiresIn % 60;
                  return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
                })()}
              </Mono>
            )}
          </View>
        </FadeIn>

        <FadeIn index={1} style={styles.mapFrame}>
          <ZoneMap
            width={width - space(10) - 2}
            height={170}
            pois={world.pois}
            streets={world.streets}
            markers={[{ key: 'me', x: 0.5, y: 0.5, kind: 'self' }]}
          />
          <View style={styles.mapCaption}>
            <Mono style={{ fontSize: 9, letterSpacing: 1.2, color: color.dim }}>
              {`PLAY ZONE · 1.0 KM · ${world.label.toUpperCase()} · ${world.pois.length} POIs`}
            </Mono>
            {/* ODbL requires visible attribution wherever the data is shown.
                This is the quietest place in the app that still qualifies. */}
            <Mono style={{ fontSize: 8, letterSpacing: 1, color: color.faint, marginTop: 3 }}>
              MAP DATA © OPENSTREETMAP CONTRIBUTORS
            </Mono>
          </View>
        </FadeIn>

        {/* roster */}
        <Card style={{ marginTop: space(4), padding: 0 }}>
          <View style={styles.cardHeader}>
            <Label tone="text">Party</Label>
            <Mono style={{ fontSize: 10, color: color.dim }}>
              {roster.length}/{MAX_PARTY} · MIN {MIN_PARTY}
            </Mono>
          </View>
          {/* keyed by name so each arrival animates in as it joins */}
          {roster.map((r) => (
            <FadeIn key={r.name} distance={8} duration={300}>
              <View style={styles.rosterRow}>
                <View
                  style={[
                    styles.readyDot,
                    { backgroundColor: r.ready ? color.accent : color.faint },
                  ]}
                />
                <Text style={styles.rosterName}>{r.name}</Text>
                {r.host && <Text style={styles.hostTag}>HOST</Text>}
                {/* Never let a simulated name pass for a person. */}
                {r.sim && <Text style={styles.simTag}>TEST</Text>}
                <Mono
                  style={{
                    fontSize: r.you && !r.ready ? 8 : 10,
                    color: r.ready ? color.accent : color.faint,
                  }}
                >
                  {r.ready
                    ? 'READY'
                    : r.you
                      ? 'READ THE SAFETY CARD TO GO READY'
                      : 'JOINED'}
                </Mono>
              </View>
            </FadeIn>
          ))}

          {/* Empty state. The invite code is the only way anyone joins. */}
          {roster.length < MIN_PARTY && (
            <View style={styles.waitingRow}>
              <Body style={{ fontSize: 13, color: color.dim, lineHeight: 19 }}>
                Waiting for {MIN_PARTY - roster.length} more.{' '}
                {simFrom == null
                  ? 'Send them the invite code above.'
                  : 'Test players are arriving.'}
              </Body>
              <Mono style={{ fontSize: 9, color: color.faint, letterSpacing: 1, marginTop: 4 }}>
                NOBODY CAN JOIN WITHOUT THE CODE. HIDEWIRE NEVER MATCHES YOU WITH STRANGERS.
              </Mono>
              {simFrom == null && TEST_MODE && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setSimFrom(elapsed);
                  }}
                  style={({ pressed }) => [styles.simBtn, pressed && { opacity: 0.7 }]}
                >
                  <Mono style={styles.simBtnText}>ADD TEST PLAYERS</Mono>
                  <Body style={{ fontSize: 11, color: color.faint, marginTop: 2 }}>
                    Simulated, for trying the round out alone.
                  </Body>
                </Pressable>
              )}
            </View>
          )}
        </Card>

        {/* safety gate, directly under the roster: it is the one thing every
            player must act on, so it comes before any of the host's dials */}
        <Card
          style={{
            marginTop: space(4),
            borderColor: acked ? color.line : color.warn,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Label tone={acked ? 'accent' : 'text'}>
              {acked ? 'Safety card: acknowledged' : 'Safety card'}
            </Label>
            {!acked && <Label tone="faint">REQUIRED</Label>}
          </View>
          <Body style={{ fontSize: 13, marginTop: space(2), lineHeight: 19, color: color.dim }}>
            Every player reads and acknowledges the safety card before the host can
            start. Logged per player, per round.
          </Body>
          {!acked && (
            <Btn
              title="Read safety card"
              variant="ghost"
              style={{ marginTop: space(3) }}
              onPress={() => setSafetyOpen(true)}
            />
          )}
        </Card>

        {/* presets, host only: a joiner has nothing to apply them to */}
        {isHost && (
          <Card style={{ marginTop: space(4), padding: 0 }}>
            <View style={styles.cardHeader}>
              <Label tone="text">Preset</Label>
              <Mono style={{ fontSize: 10, color: color.faint }}>
                {preset ? 'MATCHED' : 'CUSTOM'}
              </Mono>
            </View>
            <View style={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(2) }}>
              {PRESETS.map((p) => {
                const on = preset === p.key;
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSettings({ ...p.settings });
                    }}
                    style={({ pressed }) => [
                      styles.presetCard,
                      on && { borderColor: color.accent, backgroundColor: color.surface2 },
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <View style={styles.presetTop}>
                      <Mono style={[styles.presetName, on && { color: color.accent }]}>
                        {p.name}
                      </Mono>
                      {on && (
                        <Mono style={{ fontSize: 9, letterSpacing: 1.2, color: color.accent }}>
                          ACTIVE
                        </Mono>
                      )}
                    </View>
                    <Body style={styles.presetBlurb}>{p.blurb}</Body>
                    <Mono style={styles.presetDetail}>{p.detail}</Mono>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        )}

        {/* settings: collapsed for the host until asked for, read-only for a
            joiner. Ten dials before the first meaningful decision was the
            whole problem, so the preset row above carries the default. */}
        <Card style={{ marginTop: space(4), padding: 0 }}>
          <View style={styles.cardHeader}>
            <Label tone="text">Round settings</Label>
            <Mono style={{ fontSize: 10, color: color.faint }}>
              {isHost ? (presetDetail ?? 'CUSTOM') : 'SET BY THE HOST'}
            </Mono>
          </View>
          {isHost && !settingsOpen ? (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setSettingsOpen(true);
              }}
              style={({ pressed }) => [
                styles.expandRow,
                pressed && { backgroundColor: color.surface2 },
              ]}
            >
              <Mono style={{ fontSize: 11, letterSpacing: 1.4, color: color.accent }}>
                CHANGE {SETTING_DEFS.length} SETTINGS ›
              </Mono>
            </Pressable>
          ) : (
            <>
              {isHost && (
                <Body style={styles.settingsHint}>
                  Tap a row to step through the options.
                </Body>
              )}
              {SETTING_DEFS.map((def) => {
                const idx = settings[def.key] ?? 0;
                const gated =
                  def.lockedAbove !== undefined && profile.level < HOST_LEVEL_GATE;
                const lockedNow = gated && idx >= def.lockedAbove!;
                return (
                  <Pressable
                    key={def.key}
                    disabled={!isHost}
                    onPress={() => cycle(def)}
                    style={({ pressed }) => [
                      styles.settingRow,
                      pressed && isHost && { backgroundColor: color.surface2 },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Label tone="faint">{def.label}</Label>
                      {gated && (
                        <Mono
                          style={{
                            fontSize: 8,
                            letterSpacing: 1,
                            marginTop: 2,
                            color: lockedNow ? color.warn : color.faint,
                          }}
                        >
                          · LOCKED ABOVE {def.options[def.lockedAbove! - 1]}
                        </Mono>
                      )}
                    </View>
                    <View style={styles.settingValue}>
                      <Mono
                        style={{
                          fontSize: 11,
                          color: lockedNow ? color.warn : isHost ? color.text : color.dim,
                        }}
                      >
                        {def.options[idx]}
                      </Mono>
                      {isHost && (
                        <View style={styles.settingPos}>
                          <Mono style={{ fontSize: 9, color: color.faint }}>
                            {idx + 1}/{def.options.length}
                          </Mono>
                          <View style={{ alignSelf: 'stretch', marginTop: 3 }}>
                            <Bar
                              value={(idx + 1) / def.options.length}
                              height={3}
                              fg={color.dim}
                              bg={color.line}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
              {gatedNotice && (
                <View style={styles.gateNotice}>
                  <Body style={{ fontSize: 12, color: color.warn, lineHeight: 17 }}>
                    Zones above 2 km and rounds over 60 minutes unlock at level{' '}
                    {HOST_LEVEL_GATE}. Keeps a first game from becoming unmanageable.
                  </Body>
                </View>
              )}
            </>
          )}
        </Card>

        {/* seeker bidding */}
        <Card style={{ marginTop: space(4), padding: 0 }}>
          <View style={styles.cardHeader}>
            <Label tone="text">Bid to seek</Label>
            <Mono style={{ fontSize: 10, color: color.faint }}>OPTIONAL</Mono>
          </View>
          <View style={{ paddingHorizontal: space(4), paddingBottom: space(4) }}>
            <Body style={{ fontSize: 13, color: color.dim, lineHeight: 19 }}>
              Highest bid seeks. No bids, random pick.
            </Body>

            <View style={styles.bidRow}>
              <View>
                <Label tone="faint">YOUR BID</Label>
                <Text style={[styles.bidValue, winningBid && { color: color.accent }]}>
                  {bid}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Label tone="faint">TOP BID</Label>
                <Text style={styles.bidRival}>
                  {Math.max(topRivalBid, bid)}
                  {winningBid ? ' · YOU' : topRivalBid > 0 ? ` · ${SEEKER_BOT.name}` : ''}
                </Text>
              </View>
            </View>

            <View style={styles.bidControls}>
              <Pressable
                disabled={bid === 0}
                onPress={() => {
                  Haptics.selectionAsync();
                  setBid((b) => Math.max(0, b - BID_STEP));
                }}
                style={({ pressed }) => [
                  styles.bidBtn,
                  bid === 0 && { opacity: 0.4 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Mono style={styles.bidBtnText}>−{BID_STEP}</Mono>
              </Pressable>
              <Pressable
                disabled={!canBid}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setBid((b) => b + BID_STEP);
                }}
                style={({ pressed }) => [
                  styles.bidBtn,
                  !canBid && { opacity: 0.4 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Mono style={styles.bidBtnText}>+{BID_STEP}</Mono>
              </Pressable>
              <Mono style={{ fontSize: 9, color: color.faint }}>MAX {maxBid}</Mono>
              <View style={{ flex: 1 }} />
              <Mono style={{ fontSize: 10, color: color.faint }}>
                {profile.film - bid} FILM LEFT
              </Mono>
            </View>

            {!canBid && (
              <Body style={{ fontSize: 12, color: color.warn, marginTop: space(2) }}>
                Not enough FILM.
              </Body>
            )}
          </View>
        </Card>
      </ScrollView>

      <View
        style={{
          padding: space(5),
          paddingBottom: insets.bottom + space(4),
          borderTopWidth: 1,
          borderTopColor: color.line,
        }}
      >
        {/* Starting the round is what asks for notification permission, so
            the explanation belongs here rather than four screens back in a
            list the player skimmed before any of it meant anything. */}
        {canStart && <PermissionNote perm="notifications" />}
        {/* The blocker gets its own strip rather than living in the button's
            sub line: a disabled button that mumbles its reason underneath it
            reads as broken, not blocked. */}
        <View
          style={[
            styles.startStrip,
            { borderColor: blocker ? color.warn : color.accentDim },
          ]}
        >
          <Mono
            style={{
              fontSize: 11,
              letterSpacing: 1.2,
              textAlign: 'center',
              color: blocker ? color.warn : color.accent,
            }}
          >
            {blocker ??
              (winningBid ? `YOU SEEK · ${bid} FILM` : 'SEEKER PICKED AT RANDOM')}
          </Mono>
        </View>
        <Btn
          title="Start round"
          disabled={!canStart}
          onPress={() => {
            // Winning the bid buys the role and the FILM is spent either way.
            if (winningBid) spendFilm(bid);
            startRound(winningBid ? 'seeker' : 'hider');
          }}
        />
      </View>

      {safetyOpen && (
        <SafetyOverlay
          onAck={() => {
            setAcked(true);
            setSafetyOpen(false);
          }}
          onClose={() => setSafetyOpen(false)}
        />
      )}

      <Toast text={notice} onDone={() => setNotice(null)} bottom={140} />
    </View>
  );
}

const RULES = [
  'Public places only. Fence, gate, "no trespassing" sign. That spot is out.',
  "Stay off roads and away from traffic. Don't hide between parked cars.",
  'Walk. The app suspends your round over 10 mph anyway.',
  'If security, staff, or a cop tells you to stop, stop. The round does not matter.',
  'The law still applies while you play.',
  'You can leave any time. SOS → Leave round. No penalty, nobody gets flagged.',
  "Charge your phone. GPS and camera drain fast. Under 40% you probably won't finish the round.",
];

function SafetyOverlay({ onAck, onClose }: { onAck: () => void; onClose: () => void }) {
  const { reachedEnd, scrollProps } = useScrollGate();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.safetyOverlay, { paddingTop: insets.top + space(4) }]}>
      <View style={{ paddingHorizontal: space(6) }}>
        <Label tone="danger">Read all of it</Label>
        <Text style={styles.h1}>Before you play</Text>
      </View>
      <ScrollView
        {...scrollProps}
        showsVerticalScrollIndicator
        style={{ flex: 1, marginTop: space(4) }}
        contentContainerStyle={{ paddingHorizontal: space(6), paddingBottom: space(8) }}
      >
        {RULES.map((r, i) => (
          <View key={i} style={styles.ruleRow}>
            <Text style={styles.ruleIndex}>{String(i + 1).padStart(2, '0')}</Text>
            <Body style={{ flex: 1, color: color.text }}>{r}</Body>
          </View>
        ))}
        <Rule style={{ marginVertical: space(4) }} />
        <Body style={{ fontSize: 13, lineHeight: 19, color: color.faint }}>
          Your acknowledgment is logged for this round. This is a real place with real
          people in it. You are responsible for where you put yourself.
        </Body>
      </ScrollView>
      <View style={{ padding: space(6), paddingBottom: insets.bottom + space(5) }}>
        <Btn
          title={reachedEnd ? 'I understand' : 'Scroll to the end'}
          disabled={!reachedEnd}
          onPress={onAck}
        />
        <View style={{ height: space(2) }} />
        <Btn title="Close" variant="outline" onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  h1: {
    fontFamily: font.display,
    fontSize: 30,
    color: color.text,
    marginTop: space(2),
    letterSpacing: -0.5,
  },
  codeRow: {
    flexDirection: 'row',
    gap: space(2),
    marginTop: space(8),
  },
  codeCell: {
    flex: 1,
    height: 62,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCellActive: { borderColor: color.accent },
  codeChar: {
    fontFamily: font.monoSemi,
    fontSize: 24,
    color: color.text,
  },
  codeStatus: {
    height: 48,
    marginTop: space(3),
    justifyContent: 'flex-start',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: space(4),
    marginBottom: space(4),
  },
  bigCode: {
    fontFamily: font.display,
    fontSize: 40,
    letterSpacing: 8,
    color: color.accent,
    marginTop: 2,
  },
  expiry: { alignItems: 'flex-end', paddingBottom: 6 },
  mapFrame: {
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  mapCaption: {
    paddingVertical: space(2),
    paddingHorizontal: space(3),
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: color.line,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: space(4),
    paddingBottom: space(3),
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space(4),
    paddingVertical: space(2.5),
    borderTopWidth: 1,
    borderTopColor: color.line,
    gap: space(3),
  },
  readyDot: { width: 7, height: 7, borderRadius: 4 },
  rosterName: {
    fontFamily: font.monoSemi,
    fontSize: 13,
    letterSpacing: 1.5,
    color: color.text,
    flex: 1,
  },
  hostTag: {
    fontFamily: font.monoMed,
    fontSize: 8,
    letterSpacing: 1.2,
    color: color.bg,
    backgroundColor: color.dim,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: space(2),
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    borderTopWidth: 1,
    borderTopColor: color.line,
  },
  settingValue: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  settingPos: { alignItems: 'flex-end', width: 40 },
  settingsHint: {
    fontSize: 12,
    color: color.faint,
    lineHeight: 17,
    paddingHorizontal: space(4),
    paddingBottom: space(2),
  },
  expandRow: {
    borderTopWidth: 1,
    borderTopColor: color.line,
    alignItems: 'center',
    paddingVertical: space(3.5),
  },
  simTag: {
    fontFamily: font.monoSemi,
    fontSize: 8,
    letterSpacing: 1.2,
    color: color.warn,
    borderWidth: 1,
    borderColor: color.warn,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: space(2),
  },
  waitingRow: {
    paddingHorizontal: space(4),
    paddingVertical: space(3.5),
    borderTopWidth: 1,
    borderTopColor: color.line,
  },
  simBtn: {
    marginTop: space(3),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.lineBright,
    borderRadius: radius.sm,
    alignItems: 'center',
    paddingVertical: space(2.5),
  },
  simBtnText: { fontSize: 10, letterSpacing: 1.4, color: color.text },
  bidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: space(3),
  },
  bidValue: {
    fontFamily: font.display,
    fontSize: 30,
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  bidRival: {
    fontFamily: font.monoSemi,
    fontSize: 14,
    color: color.dim,
  },
  bidControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    marginTop: space(3),
  },
  bidBtn: {
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.sm,
    paddingVertical: space(2),
    paddingHorizontal: space(3.5),
  },
  bidBtnText: { fontSize: 12, letterSpacing: 1, color: color.text },
  presetCard: {
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    padding: space(3),
  },
  presetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetName: { fontSize: 13, letterSpacing: 2, color: color.text },
  presetBlurb: { fontSize: 12, color: color.dim, marginTop: 3, lineHeight: 17 },
  presetDetail: { fontSize: 9, letterSpacing: 1.2, color: color.faint, marginTop: 4 },
  gateNotice: {
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    borderTopWidth: 1,
    borderTopColor: color.line,
  },
  startStrip: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: space(2.5),
    paddingHorizontal: space(3),
    marginBottom: space(2.5),
  },
  ruleRow: {
    flexDirection: 'row',
    gap: space(3),
    paddingVertical: space(3),
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  ruleIndex: {
    fontFamily: font.monoSemi,
    fontSize: 13,
    color: color.accent,
    width: 26,
  },
  safetyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.bg,
    zIndex: 10,
  },
});
