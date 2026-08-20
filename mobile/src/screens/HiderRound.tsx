import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { color, font, radius, space } from '../theme';
import { Body, Btn, Label } from '../components/ui';
import { ZoneMap, MapMarker, Poi } from '../components/ZoneMap';
import { PinchArea, ScaleBadge, ZoomControls, useMapCamera } from '../components/MapCamera';
import { useWorld } from '../engine/WorldContext';
import { useHeading } from '../engine/useHeading';
import { PoiSheet } from '../components/PoiSheet';
import { ExplainerButton, InventoryDrawer, SosButton, Ticker } from '../components/RoundChrome';
import { fmtClock, roundClock, useGame, HIDER_CHECKIN_TICKS } from '../engine/GameContext';

const SELF = { x: 0.47, y: 0.56 };
const ZONE_DIAMETER_M = 2000;

/** Ground distance between two normalized map points. */
const metersTo = (p: { x: number; y: number }) =>
  Math.hypot(p.x - SELF.x, p.y - SELF.y) * ZONE_DIAMETER_M;

/** Inside this many seconds of a window opening, the idle HUD turns warn. */
const GET_READY_S = 60;
/** Under this many seconds left in an open window, everything turns danger. */
const LAST_CHANCE_S = 20;
/** Under this many seconds left, the button itself names the consequence. */
const FINAL_PUSH_S = 15;

export function HiderRound() {
  const { round, go, leaveRound } = useGame();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const pulse = useRef(new Animated.Value(0)).current;
  const [openPoi, setOpenPoi] = useState<Poi | null>(null);
  const [claimed, setClaimed] = useState<string[]>([]);
  const { world } = useWorld();
  const { zoom, step, pinch } = useMapCamera();
  const { heading } = useHeading();

  const checkinOpen = !!round?.checkin && !round.checkin.submitted;
  const openLeft = checkinOpen ? round!.checkin!.deadline - round!.elapsed : null;
  const lastChance = openLeft != null && openLeft <= LAST_CHANCE_S;

  // Pulse only while a window is open, at double rate for the last chance.
  useEffect(() => {
    if (!checkinOpen) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const duration = lastChance ? 275 : 550;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [checkinOpen, lastChance]);

  if (!round) return null;

  const t = round.elapsed;
  const pinged = round.pingFlashUntil != null && t < round.pingFlashUntil;
  // Derived from the single source rather than hardcoded, so the countdown
  // cannot disagree with when a tick actually fires.
  const nextTickAt = round.checkin
    ? null
    : (HIDER_CHECKIN_TICKS.find((k) => k.at > t)?.at ?? null);
  const alive = round.bots.filter((b) => b.state === 'alive').length + 1;
  const getReady = !checkinOpen && nextTickAt != null && nextTickAt - t <= GET_READY_S;
  const finalPush = openLeft != null && openLeft <= FINAL_PUSH_S;

  const openSeconds = openLeft != null ? Math.max(0, Math.floor(openLeft)) : 0;

  const markers: MapMarker[] = [
    { key: 'me', x: SELF.x, y: SELF.y, kind: 'self', label: 'YOU', heading },
  ];

  const pulseBorder = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: lastChance
      ? [color.danger, '#7A221B']
      : [color.accent, color.accentDim],
  });

  return (
    <View style={styles.screen}>
      {/* The map is the screen. Everything else floats on top of it. */}
      <View style={StyleSheet.absoluteFill}>
        <PinchArea gesture={pinch}>
          <View>
            <ZoneMap
              width={width}
              height={height}
              zoneScale={round.zoneScale}
              shrinkPreview={round.shrinkWarnUntil != null}
              markers={markers}
              pois={world.pois}
              streets={world.streets}
              claimedPoiIds={claimed}
              onPoiPress={setOpenPoi}
              center={SELF}
              zoom={zoom}
            />
          </View>
        </PinchArea>
      </View>

      {/* Being pinged still owns the screen edge, but no longer washes the
          whole map red: the information lives in the banner below instead. */}
      {pinged && <View pointerEvents="none" style={styles.pingEdge} />}

      {/* top HUD: bar, status band, then the event column */}
      <View style={styles.topArea} pointerEvents="box-none">
        <View style={[styles.topBar, { paddingTop: insets.top + space(2) }]}>
          <View>
            <Label tone="faint" size={12}>
              ROUND
            </Label>
            <Text style={styles.clock}>{roundClock(round)}</Text>
          </View>
          <Label tone="accent">Hiding</Label>
          <View style={styles.topRight}>
            <View style={{ alignItems: 'flex-end' }}>
              <Label tone="dim" size={12}>
                {alive} ALIVE
              </Label>
              <Label tone="dim" size={12}>
                ZONE {round.zoneScale === 1 ? '1.0' : '0.75'} KM
              </Label>
            </View>
            <ExplainerButton />
          </View>
        </View>

        {/* The status band: one glance answers "do I have to do anything".
            Two states, same pixels, so the change of state is unmissable. */}
        {checkinOpen ? (
          <View style={[styles.band, styles.bandOpen]}>
            <Label size={13} style={{ color: color.onAccent }}>
              CHECK IN NOW
            </Label>
            <Body style={{ color: color.onAccent }}>
              {openSeconds === 1 ? '1 second left' : `${openSeconds} seconds left`}
            </Body>
          </View>
        ) : (
          <View style={[styles.band, styles.bandSafe]}>
            <Label tone="accent" size={13}>
              NOTHING TO DO
            </Label>
            <Body>
              {nextTickAt != null
                ? `Next check-in in ${fmtClock(nextTickAt - t)}`
                : 'No more check-ins this round.'}
            </Body>
          </View>
        )}

        <View style={styles.eventCol} pointerEvents="none">
          {pinged && (
            <View style={styles.pingBanner}>
              <Text style={styles.pingTitle}>YOU ARE ON THE MAP</Text>
              <Body>The seeker sees where you were. Move now.</Body>
              <View style={styles.bannerCountRow}>
                <Label tone="danger" size={12}>
                  HIDDEN AGAIN IN
                </Label>
                <Text style={styles.pingCount}>{fmtClock(round.pingFlashUntil! - t)}</Text>
              </View>
            </View>
          )}
          {round.shrinkWarnUntil != null && (
            <View style={styles.shrinkBanner}>
              <View style={styles.bannerCountRow}>
                <Label size={12} style={{ color: color.warn }}>
                  ZONE CONTRACTS IN
                </Label>
                <Text style={styles.shrinkCount}>{fmtClock(round.shrinkWarnUntil - t)}</Text>
              </View>
              <Body>Get inside the smaller circle.</Body>
            </View>
          )}
          <Ticker events={round.ticker} />
        </View>
      </View>

      {/* right rail, anchored above the bottom HUD so the taller event stack
          up top can never sit underneath it */}
      <View style={[styles.rightRail, { bottom: insets.bottom + 286 }]}>
        <ZoomControls zoom={zoom} onStep={step} />
        <ScaleBadge zoom={zoom} style={{ marginTop: space(2) }} />
      </View>

      {/* bottom HUD */}
      <View style={[styles.bottomStack, { paddingBottom: insets.bottom + space(3) }]}>
        <View style={styles.controlRow}>
          <SosButton onLeave={leaveRound} />
          <InventoryDrawer role="hider" />
        </View>

        {checkinOpen ? (
          <Animated.View style={[styles.bottom, styles.bottomOpen, { borderColor: pulseBorder }]}>
            <Label size={12} style={{ color: lastChance ? color.danger : color.accent }}>
              {lastChance ? 'LAST CHANCE' : 'CHECK IN NOW'}
            </Label>
            <Text
              style={[styles.openTimer, { color: lastChance ? color.danger : color.accent }]}
            >
              {fmtClock(openLeft!)}
            </Text>
            <Btn
              title="Take the photo"
              sub={finalPush ? 'miss this and you are out' : 'back camera, then front'}
              onPress={() => go('checkin')}
              style={{ alignSelf: 'stretch', marginTop: space(2) }}
            />
          </Animated.View>
        ) : nextTickAt != null ? (
          <View style={[styles.bottom, getReady && { borderColor: color.warn }]}>
            <View style={styles.nextRow}>
              <View>
                <Label size={12} style={{ color: getReady ? color.warn : color.faint }}>
                  {getReady ? 'GET READY' : 'NEXT CHECK-IN'}
                </Label>
                <Text
                  style={[styles.idleTimer, { color: getReady ? color.warn : color.dim }]}
                >
                  {fmtClock(nextTickAt - t)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Label tone="faint" size={12}>
                  Check-ins passed
                </Label>
                <Text style={styles.passedValue}>
                  {round.checkinsPassed}/{HIDER_CHECKIN_TICKS.length}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.bottom}>
            <Label tone="accent" size={12}>
              LAST STRETCH
            </Label>
            <Text style={styles.endgameClock}>{roundClock(round)}</Text>
            <Body style={{ color: color.dim, marginTop: 2 }}>
              No more check-ins. Stay hidden until the clock runs out.
            </Body>
          </View>
        )}
      </View>

      <PoiSheet
        poi={openPoi}
        distanceM={openPoi ? metersTo(openPoi) : Infinity}
        claimed={openPoi ? claimed.includes(openPoi.id) : false}
        onClaim={(p) => setClaimed((c) => [...c, p.id])}
        onClose={() => setOpenPoi(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  topArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: space(4),
    paddingBottom: space(2.5),
    backgroundColor: 'rgba(10,10,12,0.82)',
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
  },
  clock: {
    fontFamily: font.numeral,
    fontSize: 24,
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  band: {
    borderLeftWidth: 4,
    paddingVertical: space(2.5),
    paddingHorizontal: space(4),
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  bandSafe: {
    backgroundColor: color.surface,
    borderLeftColor: color.accent,
  },
  bandOpen: {
    backgroundColor: color.accent,
    borderLeftColor: color.accent,
  },
  eventCol: {
    paddingHorizontal: space(3),
    paddingTop: space(2),
    gap: space(2),
  },
  rightRail: {
    position: 'absolute',
    right: space(3),
    alignItems: 'center',
  },
  pingEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: color.danger,
  },
  pingBanner: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.danger,
    borderRadius: radius.sm,
    padding: space(3),
  },
  pingTitle: {
    fontFamily: font.numeral,
    fontSize: 22,
    color: color.danger,
    letterSpacing: 1,
  },
  pingCount: {
    fontFamily: font.numeral,
    fontSize: 20,
    color: color.danger,
    fontVariant: ['tabular-nums'],
  },
  bannerCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space(2),
    marginTop: space(1),
  },
  shrinkBanner: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.warn,
    borderRadius: radius.sm,
    padding: space(3),
  },
  shrinkCount: {
    fontFamily: font.numeral,
    fontSize: 20,
    color: color.warn,
    fontVariant: ['tabular-nums'],
  },
  bottomStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: space(4),
    marginBottom: space(3),
  },
  bottom: {
    marginHorizontal: space(3),
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.lg,
    padding: space(4),
    // Fully opaque: this panel holds the countdown that decides whether the
    // player survives, and map labels bleeding through it read as a glitch.
    backgroundColor: color.bg,
  },
  bottomOpen: {
    borderWidth: 2,
  },
  nextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  idleTimer: {
    fontFamily: font.numeral,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  passedValue: {
    fontFamily: font.numeral,
    fontSize: 20,
    color: color.text,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  openTimer: {
    fontFamily: font.numeral,
    fontSize: 64,
    fontVariant: ['tabular-nums'],
    marginVertical: 2,
    alignSelf: 'stretch',
  },
  endgameClock: {
    fontFamily: font.numeral,
    fontSize: 28,
    color: color.text,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
});
