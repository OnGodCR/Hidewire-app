import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, font, radius, space } from '../../theme';
import { Bar, Body, Btn, Card, Display, Label, Mono } from '../../components/ui';
import { AvatarMark, CosmeticPreview } from '../../components/Cosmetics';
import { FadeIn, PressScale } from '../../components/motion';
import { useGame } from '../../engine/GameContext';
import { COSMETICS, byId, categoryKind } from '../../data/catalog';
import { TEST_MODE } from '../../config';

// ---------------------------------------------------------------------------
// Profile: who you are and what you own. No shopping, no social.
// ---------------------------------------------------------------------------

export function ProfileTab() {
  const { go, profile, pass, auth, hasAccount, ageBracket, resetProgress, daily } = useGame();
  const eq = profile.equipped;
  const eqTitle = byId(eq.title);
  const owned = COSMETICS.filter((c) => profile.owned.includes(c.id));

  const stats = [
    { k: 'LEVEL', v: String(profile.level) },
    { k: 'SEASON XP', v: profile.seasonXp.toLocaleString() },
    { k: 'PASS TIER', v: String(pass.tier) },
    { k: 'STREAK', v: `${daily.streak} WK` },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ padding: space(5), paddingBottom: space(8) }}
      showsVerticalScrollIndicator={false}
    >
      <FadeIn>
        <Display style={{ marginBottom: space(3) }}>Profile</Display>
      </FadeIn>

      {/* ---- loadout preview ----
          The handle already sits in the IdentityBar directly above this tab,
          so the hero leads with the equipped title instead of repeating it. */}
      <FadeIn>
        <Card style={styles.hero}>
          <AvatarMark
            size={84}
            tint={byId(eq.pin)?.tint ?? color.accent}
            frameTint={byId(eq.frame)?.tint ?? color.accent}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[styles.name, { color: eqTitle?.tint ?? color.text }]}
              numberOfLines={1}
            >
              {eqTitle?.name ?? 'NO TITLE'}
            </Text>
            <Mono style={styles.kind}>
              {hasAccount ? (auth?.kind ?? 'account').toUpperCase() : 'GUEST'}
              {ageBracket ? ` · ${ageBracket === '18_plus' ? '18+' : '13-17'}` : ''}
            </Mono>
            <PressScale onPress={() => go('loadout')} style={{ marginTop: space(2) }}>
              <View style={styles.editBtn}>
                <Mono style={styles.editText}>EDIT LOADOUT →</Mono>
              </View>
            </PressScale>
          </View>
        </Card>
      </FadeIn>

      {/* ---- guest promotion ----
          Promoted out of the settings list: a guest whose progress can vanish
          with the phone should not learn that from a row of settings. */}
      {!hasAccount && (
        <FadeIn index={1}>
          <Card style={styles.block}>
            <Label tone="accent">Guest account</Label>
            <Body style={{ color: color.dim, marginTop: space(2), fontSize: 14, lineHeight: 20 }}>
              Your progress lives on this phone only. Lose the phone, lose the
              progress.
            </Body>
            <Btn
              title="Create an account"
              variant="outline"
              style={{ marginTop: space(3) }}
              onPress={() => go('auth')}
            />
          </Card>
        </FadeIn>
      )}

      {/* ---- XP ---- */}
      <FadeIn index={1}>
        <Card style={styles.block}>
          <View style={styles.rowBetween}>
            <Label tone="text">Level {profile.level}</Label>
            <Mono style={styles.dim}>{Math.round(profile.xp * 100)}% TO {profile.level + 1}</Mono>
          </View>
          <View style={{ marginTop: space(2.5) }}>
            <Bar value={profile.xp} height={6} />
          </View>
          <View style={styles.statGrid}>
            {stats.map((s) =>
              s.k === 'PASS TIER' ? (
                <View key={s.k} style={styles.stat}>
                  <PressScale onPress={() => go('pass')}>
                    <Mono style={styles.statK}>{s.k}</Mono>
                    <Text style={styles.statV}>{s.v}</Text>
                    <Mono style={styles.statLink}>VIEW THE PASS →</Mono>
                  </PressScale>
                </View>
              ) : (
                <View key={s.k} style={styles.stat}>
                  <Mono style={styles.statK}>{s.k}</Mono>
                  <Text style={styles.statV}>{s.v}</Text>
                </View>
              ),
            )}
          </View>
        </Card>
      </FadeIn>

      {/* ---- owned cosmetics ---- */}
      <FadeIn index={2}>
        <View style={styles.sectionHead}>
          <Label tone="text">Owned</Label>
          <Mono style={styles.dim}>
            {owned.length} / {COSMETICS.length}
          </Mono>
        </View>
        {owned.length === 0 ? (
          <Card>
            <Body style={{ color: color.dim, fontSize: 14, lineHeight: 20 }}>
              Nothing yet. Everything you buy or earn lands here.
            </Body>
            <PressScale onPress={() => go('shop')} style={{ marginTop: space(3) }}>
              <View style={styles.editBtn}>
                <Mono style={styles.editText}>BROWSE THE STORE →</Mono>
              </View>
            </PressScale>
          </Card>
        ) : (
          <View style={styles.ownedGrid}>
            {owned.map((c) => (
              <View key={c.id} style={styles.ownedTile}>
                <CosmeticPreview kind={categoryKind(c.category)} tint={c.tint} size={40} />
                <Mono style={styles.ownedName} numberOfLines={1}>
                  {c.name}
                </Mono>
              </View>
            ))}
          </View>
        )}
      </FadeIn>

      {/* ---- settings ---- */}
      <FadeIn index={3}>
        <View style={styles.sectionHead}>
          <Label tone="text">Settings</Label>
        </View>
        <Card style={{ padding: 0 }}>
          <SettingRow label="How to play" onPress={() => go('tutorial')} />
          <SettingRow label="How to read the map" onPress={() => go('mapTutorial')} />
        </Card>
      </FadeIn>

      {/* Local wipe. There is no server, so this is the only way back to a
          genuinely new account without clearing app data by hand. */}
      {TEST_MODE && (
        <FadeIn index={4}>
          <PressScale
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              resetProgress();
            }}
          >
            <Mono style={styles.reset}>RESET PROGRESS · LOCAL ONLY · TEST MODE</Mono>
          </PressScale>
        </FadeIn>
      )}
    </ScrollView>
  );
}

function SettingRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressScale onPress={onPress}>
      <View style={styles.settingRow}>
        {/* A settings row is a sentence a person wrote, so it gets the human
            face. The chevron is furniture and stays mono. */}
        <Text style={styles.settingLabel}>{label}</Text>
        <Mono style={styles.chev}>›</Mono>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space(4), padding: space(4) },
  name: { fontFamily: font.display, fontSize: 26, color: color.text },
  kind: { fontSize: 9, letterSpacing: 1.3, color: color.faint, marginTop: 2 },
  editBtn: {
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.sm,
    paddingVertical: space(1.5),
    alignItems: 'center',
  },
  editText: { fontSize: 10, letterSpacing: 1.3, color: color.text },
  block: { padding: space(4), marginTop: space(3) },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dim: { fontSize: 10, letterSpacing: 1.1, color: color.faint },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space(4) },
  stat: { width: '50%', paddingVertical: space(1.5) },
  statK: { fontSize: 8, letterSpacing: 1.3, color: color.faint },
  statLink: { fontSize: 8, letterSpacing: 1, color: color.accent, marginTop: 3 },
  statV: { fontFamily: font.display, fontSize: 20, color: color.text, marginTop: 2 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space(5),
    marginBottom: space(2.5),
  },
  ownedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2.5) },
  ownedTile: {
    width: 84,
    alignItems: 'center',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.sm,
    paddingVertical: space(3),
    gap: space(1.5),
  },
  ownedName: { fontSize: 8, letterSpacing: 1, color: color.dim, paddingHorizontal: 4 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space(3.5),
    paddingHorizontal: space(4),
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  settingLabel: { fontFamily: font.displayMed, fontSize: 15, color: color.text },
  chev: { fontSize: 16, color: color.faint },
  reset: {
    fontSize: 9,
    letterSpacing: 1.3,
    color: color.faint,
    textAlign: 'center',
    marginTop: space(6),
    paddingVertical: space(2),
  },
});
