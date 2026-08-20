import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { color, font, radius, space } from '../theme';
import { Bar, Body, Brackets, Btn, Label, Mono, Rule } from '../components/ui';
import { CosmeticPreview } from '../components/Cosmetics';
import { CountUp } from '../components/motion';
import {
  SEASON,
  TIERS,
  TIER_COUNT,
  PASS_PRICE,
  PAID_TIER_FILM,
  Tier,
  TierReward,
} from '../data/catalog';
import { useGame } from '../engine/GameContext';

/**
 * Row heights. Non-milestone paid cells are one line (icon + "250 FILM"), so
 * the row can come down and more of the 30-tier track fits a screen. Milestone
 * rows get half again the height: the two cases are the shape of the offer and
 * should read from across the room.
 */
const ROW_H = 68;
const MILESTONE_ROW_H = Math.round(ROW_H * 1.4);

/** Derived, not hardcoded: the tiers whose paid cell is a case. */
const CASE_TIER_NS = TIERS.filter((t) => t.milestone).map((t) => t.n);
/** Count and total of the paid track's FILM tiers, for the value card. */
const PAID_FILM_TIERS = TIERS.filter((t) => !t.milestone).length;
const PAID_TRACK_FILM = PAID_FILM_TIERS * PAID_TIER_FILM;

export function SeasonPass({ embedded = false }: { embedded?: boolean } = {}) {
  const { go, profile, buyPass, pass } = useGame();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  // The retroactive payout, shown once per purchase. null means no celebration.
  const [retro, setRetro] = useState<number | null>(null);

  // A 30-row track is useless if it opens at tier 1, so land the player on
  // where they actually are, with a couple of earned tiers above for context.
  const onLayout = () => {
    const above = Math.max(0, pass.tier - 3);
    const milestonesAbove = CASE_TIER_NS.filter((n) => n <= above).length;
    const y = above * ROW_H + milestonesAbove * (MILESTONE_ROW_H - ROW_H);
    scrollRef.current?.scrollTo({ y, animated: false });
  };

  const claimedFree = TIERS.filter((t) => t.free && t.n <= pass.tier).length;
  const claimedPaid = TIERS.filter((t) => t.paid && t.n <= pass.tier).length;

  const nextTier = pass.complete ? null : TIERS[pass.tier] ?? null;
  const nextReward = nextTier ? nextTier.free ?? nextTier.paid : null;

  const unlock = () => {
    // Compute the payout the same way GameContext does, so the number the
    // celebration counts to is the number the wallet actually moved by.
    const total =
      TIERS.filter((t) => !t.milestone && t.n <= pass.tier).length * PAID_TIER_FILM;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    buyPass();
    setRetro(total);
  };

  return (
    <View style={styles.screen}>
      {/* fixed header so the progress stays visible across a long scroll */}
      <View style={[styles.header, { paddingTop: embedded ? space(3) : insets.top + space(4) }]}>
        {!embedded && (
          <Pressable onPress={() => go('home')} hitSlop={10}>
            <Label tone="faint">← Home</Label>
          </Pressable>
        )}
        {/* Emphasis is swapped on purpose: the season name is wallpaper after
            the first visit, the tier is the number that moves. */}
        <View style={{ marginTop: space(2) }}>
          <Label tone="accent">
            Season {SEASON.number} · {SEASON.name} · Week {SEASON.week} of {SEASON.weeks}
          </Label>
          <Text style={styles.h1}>TIER {pass.tier}</Text>
        </View>
        <View style={{ marginTop: space(3) }}>
          <View style={styles.progressRow}>
            <Mono style={{ fontSize: 10, color: color.dim }}>
              {claimedFree + (profile.paidPass ? claimedPaid : 0)} REWARDS EARNED
            </Mono>
            <Mono style={{ fontSize: 10, color: color.faint }}>
              {pass.complete
                ? 'TRACK COMPLETE'
                : `${pass.xpInTier} / ${pass.xpPerTier} XP → TIER ${pass.tier + 1}`}
            </Mono>
          </View>
          {/* Whole-track bar, with a tick where each case sits, so the two
              milestones are visible before the player has scrolled to them. */}
          <View>
            <Bar
              value={pass.complete ? 1 : (pass.tier - 1 + pass.progress) / TIER_COUNT}
              height={5}
            />
            {CASE_TIER_NS.map((n) => (
              <View
                key={n}
                pointerEvents="none"
                style={[
                  styles.caseTick,
                  { left: `${(n / TIER_COUNT) * 100}%`, marginLeft: n === TIER_COUNT ? -2 : -1 },
                ]}
              />
            ))}
          </View>
          {nextTier && nextReward && (
            <Mono style={styles.nextLine}>
              NEXT: TIER {nextTier.n} · {nextReward.name}
            </Mono>
          )}
        </View>
        <View style={styles.trackHeader}>
          <View style={{ width: 46 }} />
          <Label tone="faint" style={styles.colHead}>
            Free
          </Label>
          <Label tone={profile.paidPass ? 'accent' : 'faint'} style={styles.colHead}>
            {profile.paidPass ? 'Paid · owned' : 'Paid · locked'}
          </Label>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        onLayout={onLayout}
        contentContainerStyle={{
          paddingHorizontal: space(5),
          paddingBottom: profile.paidPass
            ? (embedded ? 0 : insets.bottom) + space(8)
            : space(4),
        }}
      >
        {TIERS.map((tier) => (
          <TierRow
            key={tier.n}
            tier={tier}
            paidPass={profile.paidPass}
            currentTier={pass.tier}
          />
        ))}
      </ScrollView>

      {!profile.paidPass && (
        <View
          style={{
            padding: space(5),
            // Embedded, the TabBar sits below this footer and already owns the
            // home-indicator inset; adding it again pushed the button up and
            // left a dead strip above the bar.
            paddingBottom: embedded ? space(3) : insets.bottom + space(4),
            borderTopWidth: 1,
            borderTopColor: color.line,
            backgroundColor: color.bg,
          }}
        >
          <View style={styles.valueCard}>
            <Label tone="accent">Paid track</Label>
            <View style={styles.valueRow}>
              <Text style={styles.valueNum}>{PAID_TRACK_FILM.toLocaleString()}</Text>
              <Label tone="faint">FILM ACROSS {PAID_FILM_TIERS} TIERS</Label>
            </View>
            <Rule style={{ marginVertical: space(2.5) }} />
            <View style={styles.caseRow}>
              <CosmeticPreview kind="film" size={18} />
              <Body style={styles.caseText}>
                FIRST LIGHT CASE at tier {CASE_TIER_NS[0]} and tier {CASE_TIER_NS[1]}
              </Body>
            </View>
          </View>
          <Btn
            title={`Unlock for ${PASS_PRICE}`}
            sub={`ONE TIME · SEASON ${SEASON.number} ONLY`}
            style={{ marginTop: space(3) }}
            onPress={unlock}
          />
        </View>
      )}

      {retro != null && <RetroPayout total={retro} onDone={() => setRetro(null)} />}
    </View>
  );
}

/**
 * The purchase celebration. The pass is retroactive, so the moment of buying
 * it is also the moment every already-reached tier pays out, and a number that
 * large deserves better than a silent wallet change.
 */
function RetroPayout({ total, onDone }: { total: number; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setShown(total), 300);
    return () => clearTimeout(t);
  }, [total]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.payoutWrap]}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(6) }}>
        <Brackets size={20} thickness={2.5} inset={-22} tint={color.accent}>
          <CountUp value={shown} duration={900} style={styles.payoutNum} />
        </Brackets>
        <Label tone="accent" size={12} style={{ marginTop: space(7) }}>
          Film granted
        </Label>
        <Body style={styles.payoutBody}>
          Every tier you had already reached just paid out.
        </Body>
      </View>
      <View style={{ padding: space(6), paddingBottom: insets.bottom + space(6) }}>
        <Btn title="Back to the track" onPress={onDone} />
      </View>
    </View>
  );
}

function TierRow({
  tier,
  paidPass,
  currentTier,
}: {
  tier: Tier;
  paidPass: boolean;
  currentTier: number;
}) {
  const reached = tier.n <= currentTier;
  const current = tier.n === currentTier;

  return (
    <View
      style={[
        styles.tierRow,
        { height: (tier.milestone ? MILESTONE_ROW_H : ROW_H) - space(2) },
        tier.milestone && styles.milestoneRow,
        current && styles.currentRow,
      ]}
    >
      <View style={styles.tierNum}>
        <Text
          style={[
            styles.tierNumText,
            { color: reached ? color.accent : color.faint },
            tier.milestone && { fontSize: 21 },
          ]}
        >
          {String(tier.n).padStart(2, '0')}
        </Text>
        {tier.milestone && (
          <Label tone="accent" style={{ fontSize: 7 }}>
            CASE
          </Label>
        )}
        {current && <View style={styles.currentDot} />}
      </View>
      <RewardCell reward={tier.free} unlocked={reached} />
      {tier.milestone ? (
        <View style={styles.rewardCell}>
          <Brackets size={10} thickness={1.5} inset={-4} tint={color.accent} style={{ alignSelf: 'stretch' }}>
            <RewardCell reward={tier.paid} unlocked={reached && paidPass} paidLocked={!paidPass} big />
          </Brackets>
        </View>
      ) : (
        <PaidFilmCell unlocked={reached && paidPass} paidLocked={!paidPass} />
      )}
    </View>
  );
}

/**
 * The compressed one-line paid cell. 28 of the 30 paid rewards are the same
 * 250 FILM, so spending three lines on each of them taught nothing and made
 * the track three screens longer than it needed to be.
 */
function PaidFilmCell({ unlocked, paidLocked }: { unlocked: boolean; paidLocked: boolean }) {
  return (
    <View style={[styles.rewardCell, styles.filmCellRow, !unlocked && { opacity: paidLocked ? 0.4 : 0.6 }]}>
      <CosmeticPreview kind="film" size={22} />
      <Mono style={styles.filmCellText}>{PAID_TIER_FILM} FILM</Mono>
      {unlocked && <Mono style={styles.claimed}>EARNED</Mono>}
    </View>
  );
}

function RewardCell({
  reward,
  unlocked,
  paidLocked,
  big = false,
}: {
  reward?: TierReward;
  unlocked: boolean;
  paidLocked?: boolean;
  big?: boolean;
}) {
  if (!reward) {
    return (
      <View style={styles.rewardCell}>
        <Label tone="faint" style={{ fontSize: 7 }}>
          No free reward
        </Label>
      </View>
    );
  }
  return (
    <View style={[big ? styles.rewardCellBig : styles.rewardCell, !unlocked && { opacity: paidLocked ? 0.4 : 0.6 }]}>
      <CosmeticPreview kind={reward.kind} tint={reward.tint} size={big ? 44 : 38} />
      <Mono style={styles.rewardName} numberOfLines={1}>
        {reward.name}
      </Mono>
      {unlocked ? (
        <Mono style={styles.claimed}>EARNED</Mono>
      ) : paidLocked ? (
        <Mono style={styles.locked}>PASS</Mono>
      ) : (
        <Mono style={styles.locked}>LOCKED</Mono>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: {
    paddingHorizontal: space(5),
    paddingBottom: space(2),
    borderBottomWidth: 1,
    borderBottomColor: color.line,
    backgroundColor: color.bg,
  },
  h1: {
    fontFamily: font.display,
    fontSize: 34,
    letterSpacing: 1,
    color: color.text,
    marginTop: space(1),
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space(1.5),
    gap: space(2),
  },
  caseTick: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 9,
    backgroundColor: color.accent,
  },
  nextLine: {
    fontSize: 10,
    letterSpacing: 1,
    color: color.dim,
    marginTop: space(2),
  },
  trackHeader: {
    flexDirection: 'row',
    marginTop: space(3),
    gap: space(2),
  },
  colHead: { flex: 1, textAlign: 'center' },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    paddingVertical: space(2),
    paddingHorizontal: space(2.5),
    marginTop: space(2),
  },
  milestoneRow: { borderColor: color.lineBright, backgroundColor: color.surface2 },
  currentRow: { borderColor: color.accent, borderWidth: 1.5 },
  tierNum: { width: 46, alignItems: 'center', gap: 2 },
  tierNumText: { fontFamily: font.display, fontSize: 18 },
  currentDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: color.accent,
  },
  rewardCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  rewardCellBig: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: space(2),
  },
  filmCellRow: {
    flexDirection: 'row',
    gap: space(1.5),
  },
  filmCellText: {
    fontSize: 11,
    color: color.text,
    letterSpacing: 0.5,
  },
  rewardName: {
    fontSize: 9,
    color: color.text,
    letterSpacing: 0.5,
  },
  claimed: { fontSize: 8, color: color.accent, letterSpacing: 1 },
  locked: { fontSize: 8, color: color.faint, letterSpacing: 1 },
  footnote: {
    fontSize: 10,
    color: color.faint,
    lineHeight: 16,
    marginTop: space(4),
  },
  valueCard: {
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    padding: space(4),
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space(2.5),
    marginTop: space(1),
  },
  valueNum: {
    fontFamily: font.numeral,
    fontSize: 34,
    color: color.accent,
    fontVariant: ['tabular-nums'],
  },
  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
  },
  caseText: { fontSize: 13, color: color.dim, flex: 1, minWidth: 0 },
  payoutWrap: { backgroundColor: color.bg },
  payoutNum: {
    fontFamily: font.numeral,
    fontSize: 56,
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  payoutBody: {
    color: color.dim,
    textAlign: 'center',
    marginTop: space(4),
    lineHeight: 22,
  },
});
