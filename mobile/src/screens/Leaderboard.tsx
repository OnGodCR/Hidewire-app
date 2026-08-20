import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, radius, space } from '../theme';
import { Body, Brackets, Card, EmptyState, Label, Mono } from '../components/ui';
import { FadeIn, PressScale } from '../components/motion';
import { useGame } from '../engine/GameContext';
import { buildBoard, poolSize, type Scope } from '../data/leaderboard';

// ---------------------------------------------------------------------------
// Leaderboard, ranked on XP.
//
// **Handles and numbers only.** This is the one surface where a player is
// visible to people who are not their friends, so it exposes the absolute
// minimum: a name they chose and a score. No location, no captures, and no way
// to contact anyone. Adding a "add friend" button to a global list would turn
// this into stranger discovery, which marketing/BRIEF.md 9 rules out.
// ---------------------------------------------------------------------------

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'global', label: 'EVERYONE' },
  { key: 'friends', label: 'MY FRIENDS' },
];

export function Leaderboard({
  embedded = false,
  onGoFriends,
}: { embedded?: boolean; onGoFriends?: () => void } = {}) {
  const { go, profile, friends } = useGame();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<Scope>('global');

  const { rows, myRank } = useMemo(
    () =>
      buildBoard(
        scope,
        { handle: profile.handle, level: profile.level, xp: profile.seasonXp },
        friends.friends,
      ),
    [scope, profile.handle, profile.level, profile.seasonXp, friends.friends],
  );

  const total = poolSize(scope, friends.friends.filter((f) => !f.blocked).length);

  // The standalone screen can route to Friends itself; embedded, the parent
  // tab owns the segment and passes a flip. No handler means no button.
  const goFriends = onGoFriends ?? (embedded ? undefined : () => go('friends'));

  // Only the player on the board. Their row still renders; the empty state
  // sits under it and says what would fill the space.
  const onlyMe = rows.length <= 1;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: embedded ? space(3) : insets.top + space(4) }]}>
        {!embedded && (
          <PressScale onPress={() => go('home')}>
            <Mono style={{ fontSize: 11, color: color.dim, letterSpacing: 1.5 }}>← HOME</Mono>
          </PressScale>
        )}
        {!embedded && <Text style={styles.h1}>Leaderboard</Text>}

        <View style={[styles.tabs, embedded && { marginTop: space(1) }]}>
          {SCOPES.map((s) => {
            const on = scope === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => setScope(s.key)}
                style={({ pressed }) => [
                  styles.tab,
                  on && styles.tabOn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Mono style={[styles.tabText, on && { color: color.black }]}>{s.label}</Mono>
              </Pressable>
            );
          })}
        </View>

        <Brackets size={12} thickness={2} inset={-1} tint={color.accent} style={{ marginTop: space(3) }}>
          <Card style={styles.rankCard}>
            <Label tone="faint">Your rank</Label>
            <View style={styles.rankRow}>
              <Text style={styles.rankBig}>{myRank}</Text>
              <Mono style={styles.rankOf}>OF {total}</Mono>
            </View>
            <Mono style={styles.rankXp}>
              {profile.seasonXp.toLocaleString()} XP THIS SEASON
            </Mono>
            <Body style={styles.rankExplainer}>
              XP comes from rounds you finish and daily assignments. The board resets
              each season.
            </Body>
          </Card>
        </Brackets>
      </View>

      <ScrollView contentContainerStyle={{ padding: space(5), paddingBottom: space(8) }}>
        {rows.map((r, i) => {
          const top3 = i < 3;
          return (
            <FadeIn key={r.id} index={Math.min(i, 8)} delay={80}>
              <View style={[styles.row, r.you && styles.rowYou]}>
                <Text
                  style={[styles.rank, (top3 || r.you) && { color: color.accent }]}
                >
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[
                      styles.name,
                      top3 && { fontSize: 17 },
                      r.you && { color: color.accent },
                    ]}
                    numberOfLines={1}
                  >
                    {r.handle}
                    {r.you ? ' · YOU' : ''}
                  </Text>
                  <Mono style={{ fontSize: 9, color: color.faint, letterSpacing: 1 }}>
                    LVL {r.level}
                  </Mono>
                </View>
                <Text style={[styles.xp, r.you && { color: color.accent }]}>
                  {r.xp.toLocaleString()}
                </Text>
              </View>
            </FadeIn>
          );
        })}

        {onlyMe &&
          (scope === 'friends' ? (
            <EmptyState
              title="No friends on the board yet"
              body="Add friends by code and their season XP lines up next to yours."
              action={goFriends ? { title: 'Go to friends', onPress: goFriends } : undefined}
              style={{ marginTop: space(4) }}
            />
          ) : (
            <EmptyState
              title="The season board is still filling up"
              body="Play a round to put yourself on it."
              style={{ marginTop: space(4) }}
            />
          ))}

        <Mono style={styles.footnote}>
          HANDLES AND SCORES ONLY · NO LOCATION · NO CAPTURES · NOBODY HERE CAN CONTACT YOU
        </Mono>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: {
    paddingHorizontal: space(5),
    paddingBottom: space(4),
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  h1: {
    fontFamily: font.display,
    fontSize: 32,
    color: color.text,
    marginTop: space(3),
    letterSpacing: -0.5,
  },
  tabs: { flexDirection: 'row', gap: space(2), marginTop: space(4) },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.sm,
    alignItems: 'center',
    paddingVertical: space(2.5),
  },
  tabOn: { backgroundColor: color.accent, borderColor: color.accent },
  tabText: { fontSize: 11, letterSpacing: 1.6, color: color.text },
  rankCard: { padding: space(4) },
  rankRow: { flexDirection: 'row', alignItems: 'baseline', gap: space(2), marginTop: space(1) },
  rankBig: {
    fontFamily: font.numeral,
    fontSize: 40,
    color: color.accent,
    fontVariant: ['tabular-nums'],
  },
  rankOf: { fontSize: 12, letterSpacing: 1, color: color.dim },
  rankXp: { fontSize: 11, letterSpacing: 1, color: color.dim, marginTop: 2 },
  rankExplainer: { fontSize: 13, lineHeight: 19, color: color.dim, marginTop: space(2) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingVertical: space(3),
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  rowYou: {
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
    borderBottomColor: 'transparent',
    borderLeftWidth: 2,
    borderLeftColor: color.accent,
  },
  rank: {
    fontFamily: font.monoSemi,
    fontSize: 13,
    color: color.faint,
    width: 26,
  },
  name: { fontFamily: font.displayMed, fontSize: 15, color: color.text },
  xp: {
    fontFamily: font.monoSemi,
    fontSize: 13,
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  footnote: {
    fontSize: 9,
    letterSpacing: 1.2,
    lineHeight: 15,
    color: color.faint,
    textAlign: 'center',
    marginTop: space(6),
  },
});
