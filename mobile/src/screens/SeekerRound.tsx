import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { color, font, radius, space } from '../theme';
import { Body, Btn, Label, Mono } from '../components/ui';
import { ZoneMap, MapMarker } from '../components/ZoneMap';
import { PinchArea, ScaleBadge, ZoomControls, useMapCamera } from '../components/MapCamera';
import { useWorld } from '../engine/WorldContext';
import { useHeading } from '../engine/useHeading';
import { ExplainerButton, InventoryDrawer, SosButton, Ticker } from '../components/RoundChrome';
import { ProceduralPhoto } from '../components/ProceduralPhoto';
import { FeedPhoto, fmtClock, roundClock, useGame } from '../engine/GameContext';

/** Reveal ticks in real seconds, matching the lobby's default of every 10 min. */
const REVEAL_TICKS = [10 * 60, 20 * 60];

/** How long "Positions dropping now" stays up after a reveal tick fires. */
const DROP_FLASH_S = 15;

export function SeekerRound() {
  const { round, leaveRound, tag } = useGame();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [openPhoto, setOpenPhoto] = useState<FeedPhoto | null>(null);
  const [tagFlash, setTagFlash] = useState<{ name: string; left: number } | null>(null);
  const { world } = useWorld();
  const { zoom, step, pinch } = useMapCamera();
  const { heading } = useHeading();

  // The confirmation holds for 1.5 s, long enough to be read and short enough
  // that the tag bar is back before the next hider matters.
  useEffect(() => {
    if (!tagFlash) return;
    const id = setTimeout(() => setTagFlash(null), 1500);
    return () => clearTimeout(id);
  }, [tagFlash]);

  if (!round) return null;
  const t = round.elapsed;
  const alive = round.bots.filter((b) => b.state === 'alive');
  // PRD 4.2 default: a reveal every 10 minutes, in real seconds.
  const nextRevealAt = REVEAL_TICKS.find((k) => k > t) ?? null;
  const justDropped = REVEAL_TICKS.some((k) => t >= k && t - k < DROP_FLASH_S);

  const markers: MapMarker[] = [
    { key: 'me', x: 0.5, y: 0.5, kind: 'seeker', label: 'YOU', heading },
    ...round.reveals.map((p) => ({
      key: p.id,
      x: p.pos.x,
      y: p.pos.y,
      kind: 'reveal' as const,
      label: p.name,
      fade: 1 - (t - p.bornAt) / p.ttl,
    })),
    ...round.bots
      .filter((b) => b.state !== 'alive')
      .map((b) => ({ key: `dead-${b.id}`, x: b.pos.x, y: b.pos.y, kind: 'dead' as const, label: b.name })),
  ];

  const canTag = round.proximity >= 0.8;
  const someoneClose = !canTag && round.proximity > 0;
  const signalBars = Math.round(round.proximity * 5);
  const targetName = round.proximityTarget
    ? (round.bots.find((b) => b.id === round.proximityTarget)?.name ?? null)
    : null;
  const mapH = height - 400 - insets.top;

  return (
    <View style={styles.screen}>
      {/* top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + space(2) }]}>
        <View>
          <Label tone="faint" size={12}>
            ROUND
          </Label>
          <Text style={styles.clock}>{roundClock(round)}</Text>
        </View>
        <Label tone="danger">Seeking</Label>
        <View style={styles.topRight}>
          <View style={styles.hidersChip}>
            <Text style={styles.hidersCount}>{alive.length}</Text>
            <Label tone="dim" size={12}>
              {alive.length === 1 ? 'HIDER' : 'HIDERS'}
            </Label>
          </View>
          <ExplainerButton />
        </View>
      </View>

      <View style={styles.mapLayer}>
        <PinchArea gesture={pinch}>
          <View>
            <ZoneMap
              width={width}
              height={Math.max(mapH, 220)}
              zoneScale={round.zoneScale}
              markers={markers}
              pois={world.pois}
              streets={world.streets}
              center={{ x: 0.5, y: 0.5 }}
              zoom={zoom}
            />
          </View>
        </PinchArea>
        <View style={styles.tickerWrap} pointerEvents="none">
          <Ticker events={round.ticker} />
        </View>
        <View style={styles.rightRail}>
          <ZoomControls zoom={zoom} onStep={step} />
          <ScaleBadge zoom={zoom} style={{ marginTop: space(2) }} />
        </View>
        <View style={[styles.sosWrap, { bottom: space(3) }]}>
          <SosButton onLeave={leaveRound} />
        </View>
        <View style={[styles.invWrap, { bottom: space(3) }]}>
          <InventoryDrawer role="seeker" />
        </View>
      </View>

      {/* photo feed */}
      <View style={styles.feed}>
        <View style={styles.feedHeader}>
          <Label tone="text" size={12}>
            Proof feed
          </Label>
          <Mono style={{ fontSize: 12, color: color.faint }}>
            NEWEST FIRST · DELETED 24 H AFTER ROUND
          </Mono>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space(3), gap: space(2) }}>
          {round.photos.length === 0 ? (
            <View style={styles.feedEmpty}>
              <Body style={{ color: color.faint }}>
                Waiting for the first check-in tick…
              </Body>
            </View>
          ) : (
            round.photos.map((p) => (
              <Pressable key={p.id} style={styles.feedCard} onPress={() => setOpenPhoto(p)}>
                <View style={{ flexDirection: 'row' }}>
                  <ProceduralPhoto seed={p.seedBack} width={62} height={78} variant="back" />
                  <ProceduralPhoto seed={p.seedFront} width={62} height={78} variant="front" />
                </View>
                <View style={styles.feedMeta}>
                  <Text style={styles.feedName}>{p.name}</Text>
                  <Mono style={{ fontSize: 12, color: color.faint }}>CI-0{p.checkinIndex}</Mono>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      {/* reveal clock: the seeker's equivalent of the hider's check-in panel */}
      <View style={styles.revealPanel}>
        {nextRevealAt != null ? (
          <>
            <View>
              <Label tone="faint" size={12}>
                Next reveal
              </Label>
              <Text style={styles.revealTimer}>{fmtClock(nextRevealAt - t)}</Text>
            </View>
            <Body style={styles.revealBody}>
              {justDropped ? 'Positions dropping now' : "Everyone's position drops on the map"}
            </Body>
          </>
        ) : (
          <>
            <View>
              <Label tone="danger" size={12}>
                No more reveals
              </Label>
              <Text style={styles.revealTimer}>{roundClock(round)}</Text>
            </View>
            <Body style={styles.revealBody}>
              That was the last position drop. Find them or they win.
            </Body>
          </>
        )}
      </View>

      {/* tag control */}
      {tagFlash ? (
        <View style={[styles.tagBar, styles.tagBarFlash, { paddingBottom: insets.bottom + space(3) }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tagFlashTitle}>{tagFlash.name} IS OUT</Text>
            <Body style={{ color: color.onAccent }}>
              {tagFlash.left === 1 ? '1 hider left' : `${tagFlash.left} hiders left`}
            </Body>
          </View>
        </View>
      ) : (
        <View style={[styles.tagBar, { paddingBottom: insets.bottom + space(3) }]}>
          <View style={{ flex: 1 }}>
            {targetName && <Text style={styles.targetName}>{targetName}</Text>}
            <Label
              size={12}
              style={{
                color: canTag ? color.accent : someoneClose ? color.warn : color.faint,
              }}
            >
              {canTag ? 'CLOSE ENOUGH · TAG NOW' : someoneClose ? 'SOMEONE IS CLOSE' : 'TOO FAR TO TAG'}
            </Label>
            <View style={styles.signalRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.signalBar,
                    { height: 6 + i * 4 },
                    i < signalBars && { backgroundColor: canTag ? color.accent : color.warn },
                  ]}
                />
              ))}
            </View>
          </View>
          <Pressable
            disabled={!canTag}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setTagFlash({ name: targetName ?? '', left: alive.length - 1 });
              tag();
            }}
            style={({ pressed }) => [
              styles.tagBtn,
              !canTag && { backgroundColor: color.surface2, borderColor: color.line },
              pressed && canTag && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.tagText, !canTag && { color: color.faint }]}>TAG</Text>
            {!canTag && <Text style={styles.tagSub}>WALK CLOSER</Text>}
          </Pressable>
        </View>
      )}

      {/* photo detail */}
      <Modal visible={!!openPhoto} transparent animationType="fade" onRequestClose={() => setOpenPhoto(null)}>
        <Pressable style={styles.photoBackdrop} onPress={() => setOpenPhoto(null)}>
          {openPhoto && (
            <View style={styles.photoSheet}>
              <View style={{ flexDirection: 'row', gap: space(2) }}>
                <ProceduralPhoto seed={openPhoto.seedBack} width={(width - space(16)) / 2} height={200} variant="back" />
                <ProceduralPhoto seed={openPhoto.seedFront} width={(width - space(16)) / 2} height={200} variant="front" />
              </View>
              <View style={{ marginTop: space(3), flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={styles.feedName}>{openPhoto.name}</Text>
                  <Mono style={{ fontSize: 12, color: color.dim, marginTop: 2 }}>
                    CHECK-IN 0{openPhoto.checkinIndex} · VALIDATED SERVER-SIDE
                  </Mono>
                </View>
                <Pressable hitSlop={8}>
                  <Label tone="danger" size={12}>
                    Report
                  </Label>
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: space(4),
    paddingBottom: space(2.5),
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
  },
  hidersChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space(1.5),
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.md,
    paddingHorizontal: space(2.5),
    paddingVertical: space(1.5),
  },
  hidersCount: {
    fontFamily: font.numeral,
    fontSize: 20,
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  clock: {
    fontFamily: font.numeral,
    fontSize: 24,
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  mapLayer: { flex: 1 },
  tickerWrap: {
    position: 'absolute',
    top: space(3),
    left: space(3),
    right: space(14),
  },
  rightRail: {
    position: 'absolute',
    right: space(3),
    top: space(3),
    alignItems: 'center',
  },
  sosWrap: { position: 'absolute', left: space(4) },
  invWrap: { position: 'absolute', right: space(4) },
  feed: {
    borderTopWidth: 1,
    borderTopColor: color.line,
    backgroundColor: color.surface,
    paddingBottom: space(3),
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space(4),
    paddingVertical: space(2.5),
  },
  feedEmpty: {
    height: 100,
    justifyContent: 'center',
    paddingHorizontal: space(4),
  },
  feedCard: {
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: color.bg,
  },
  feedMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  feedName: {
    fontFamily: font.monoSemi,
    fontSize: 12,
    letterSpacing: 1,
    color: color.text,
  },
  revealPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(4),
    borderTopWidth: 1,
    borderTopColor: color.line,
    backgroundColor: color.bg,
    paddingHorizontal: space(4),
    paddingVertical: space(2.5),
  },
  revealTimer: {
    fontFamily: font.numeral,
    fontSize: 48,
    color: color.text,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  revealBody: {
    flex: 1,
    color: color.dim,
  },
  tagBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(4),
    borderTopWidth: 1,
    borderTopColor: color.line,
    backgroundColor: color.bg,
    paddingHorizontal: space(4),
    paddingTop: space(3),
  },
  tagBarFlash: {
    backgroundColor: color.accent,
    borderTopColor: color.accent,
  },
  tagFlashTitle: {
    fontFamily: font.numeral,
    fontSize: 22,
    color: color.onAccent,
    letterSpacing: 1,
  },
  targetName: {
    fontFamily: font.numeral,
    fontSize: 20,
    color: color.text,
    marginBottom: 2,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: 6,
  },
  signalBar: {
    width: 8,
    backgroundColor: color.surface2,
    borderRadius: 1.5,
  },
  tagBtn: {
    width: 108,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: color.accent,
    borderWidth: 1,
    borderColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    fontFamily: font.display,
    fontSize: 22,
    letterSpacing: 4,
    color: color.onAccent,
  },
  tagSub: {
    fontFamily: font.monoMed,
    fontSize: 12,
    letterSpacing: 1,
    color: color.faint,
    marginTop: 1,
  },
  photoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: space(5),
  },
  photoSheet: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    padding: space(3),
  },
});
