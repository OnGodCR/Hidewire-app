import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { color, font, radius, space } from '../theme';
import {
  Bar,
  Body,
  Brackets,
  Btn,
  Card,
  Confirm,
  EmptyState,
  Label,
  Mono,
  Rule,
  SectionHeader,
  Toast,
} from '../components/ui';
import { FadeIn, PressScale } from '../components/motion';
import { ProceduralPhoto } from '../components/ProceduralPhoto';
import { useGame } from '../engine/GameContext';
import { ECONOMY } from '../data/economy';
import { REFERRAL_TASKS } from '../data/friends';
import { setLobbyNotice } from './JoinLobby';
import { TEST_MODE } from '../config';
import QRCode from 'react-native-qrcode-svg';

// ---------------------------------------------------------------------------
// Friends.
//
// **Codes only. No search, no suggestions, no people-you-may-know.** A code you
// deliberately hand to somebody is consent; a list of nearby strangers is not,
// and marketing/BRIEF.md 9 makes stranger play a legal line rather than a
// preference. The age gate means minors are here, which is why report and block
// are on every row from the first commit rather than added after launch.
//
// One code, three tiers. The friend code and the referral code are the same
// string, so the screen leads with a single card that says both things, then
// the add box, then the feed. Redemption (entering somebody else's referral
// code) is the rare, once-ever action, so it lives at the bottom.
// ---------------------------------------------------------------------------

/**
 * QR renderer, in the game's palette.
 *
 * Acid on near-black inside the same corner brackets the wordmark and the
 * viewfinder use, so the code reads as part of Hidewire rather than a pasted-in
 * utility widget. Scanners cope fine: what they need is contrast, and acid on
 * #0A0A0C is a stronger ratio than the usual black on white.
 *
 * Rendered on every platform including web, since react-native-qrcode-svg
 * draws through react-native-svg, which is already a dependency here.
 */
function QrBlock({ value, size = 160 }: { value: string; size?: number }) {
  return (
    <View style={styles.qrOuter}>
      <Brackets size={18} thickness={2} inset={-10} tint={color.accent}>
        <View style={styles.qrWrap}>
          <QRCode
            value={value}
            size={size}
            backgroundColor={color.black}
            color={color.accent}
            ecl="M"
          />
        </View>
      </Brackets>
      <Mono style={styles.qrCaption}>SCAN TO SEND A FRIEND REQUEST</Mono>
    </View>
  );
}

type PendingConfirm = { type: 'block' | 'remove'; id: string; handle: string };

export function Friends({ embedded = false }: { embedded?: boolean } = {}) {
  const {
    go,
    friends,
    addFriend,
    removeFriend,
    blockFriend,
    reportFriend,
    applaud,
    applauseToday,
    redeemReferral,
    referralProgress,
  } = useGame();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refCode, setRefCode] = useState('');
  const [refError, setRefError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  // What each applaud actually paid, so the row can say so afterwards. Local
  // by design: on a restart the chip just reads APPLAUDED, which is enough.
  const [applaudPaid, setApplaudPaid] = useState<Record<string, number>>({});

  const visible = friends.friends.filter((f) => !f.blocked);
  const capped = applauseToday.earned >= applauseToday.cap;

  const shareCode = () => {
    Haptics.selectionAsync();
    Share.share({
      message:
        `Play Hidewire with me. Use my code ${friends.myCode} and we both get ` +
        `${ECONOMY.referralFilm} FILM.`,
    }).catch(() => {
      // Share can be dismissed or unavailable on web. Nothing to recover
      // from and nothing worth interrupting for.
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          padding: space(5),
          paddingTop: embedded ? space(4) : insets.top + space(5),
          paddingBottom: space(8),
        }}
      >
        <FadeIn>
          {!embedded && (
            <PressScale onPress={() => go('home')}>
              <Mono style={{ fontSize: 11, color: color.dim, letterSpacing: 1.5 }}>← HOME</Mono>
            </PressScale>
          )}
          {!embedded && <Text style={styles.h1}>Friends</Text>}
        </FadeIn>

        {/* ---- tier 1: your code, which is also your referral code ---- */}
        <FadeIn index={1}>
          <Brackets size={14} thickness={2} inset={-1} tint={color.accent} style={{ marginTop: space(4) }}>
            <Card style={{ padding: space(4) }}>
              <View style={styles.rowBetween}>
                <Label tone="text">Your code</Label>
                <PressScale onPress={() => setShowQr((v) => !v)}>
                  <View style={styles.qrToggleHit}>
                    <Mono style={{ fontSize: 10, color: color.accent, letterSpacing: 1.2 }}>
                      {showQr ? 'HIDE QR' : 'SHOW QR'}
                    </Mono>
                  </View>
                </PressScale>
              </View>
              <Text style={styles.myCode}>{friends.myCode}</Text>
              {showQr && (
                <View style={{ alignItems: 'center', marginVertical: space(3) }}>
                  <QrBlock value={`hidewire://friend/${friends.myCode}`} />
                </View>
              )}
              <Body style={styles.codeBlurb}>
                Friend code and referral code in one. New players pay you both{' '}
                {ECONOMY.referralFilm.toLocaleString()} FILM.
              </Body>
              <Btn
                title="Share code"
                variant="ghost"
                style={{ marginTop: space(3) }}
                onPress={shareCode}
              />
              <Mono style={styles.refGuard}>REFERRAL PAYS FROM LEVEL 2</Mono>
            </Card>
          </Brackets>
        </FadeIn>

        {/* ---- tier 2: add by code ---- */}
        <FadeIn index={2}>
          <Card style={{ marginTop: space(3), padding: space(4) }}>
            <Label tone="text">Add a friend</Label>
            <View style={styles.inputRow}>
              <TextInput
                value={code}
                onChangeText={(t) => {
                  setCode(t.toUpperCase());
                  setError(null);
                }}
                placeholder="FRIEND CODE"
                placeholderTextColor={color.faint}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                style={styles.input}
              />
              <Pressable
                onPress={() => {
                  const err = addFriend(code);
                  if (err) {
                    setError(err);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  } else {
                    setCode('');
                    setToast('Friend added.');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }}
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
              >
                <Mono style={styles.addBtnText}>ADD</Mono>
              </Pressable>
            </View>
            {error && <Mono style={styles.error}>{error}</Mono>}
            {TEST_MODE ? (
              <Body style={styles.hintBody}>
                Try KAY2XQ7M, MAYA5TRW, or JUKE3NBH in this build.
              </Body>
            ) : (
              <Body style={styles.hintBody}>Codes only. There is no search.</Body>
            )}
          </Card>
        </FadeIn>

        {/* ---- tier 3: the feed ---- */}
        <FadeIn index={3}>
          <SectionHeader title="Today's captures" style={{ marginTop: space(6) }} />
          <View style={styles.walletStrip}>
            <Label tone="faint">FILM you earned from applause today</Label>
            <Mono style={styles.walletValue}>
              {applauseToday.earned} / {applauseToday.cap}
            </Mono>
            <View style={{ marginTop: space(2) }}>
              <Bar
                value={applauseToday.cap > 0 ? applauseToday.earned / applauseToday.cap : 0}
                fg={capped ? color.warn : color.accent}
              />
            </View>
            {capped && (
              <Body style={styles.cappedBody}>
                Capped for today. You can still applaud, it just stops paying.
              </Body>
            )}
          </View>
        </FadeIn>

        {visible.length === 0 ? (
          <FadeIn index={4}>
            <EmptyState
              title="No friends yet"
              body="Add someone by code and their daily capture shows up here, the same way yours shows up for them."
              style={{ marginTop: space(3) }}
            />
          </FadeIn>
        ) : (
          visible.map((f, i) => {
            const paid = applaudPaid[f.id];
            return (
              <FadeIn key={f.id} index={4 + i}>
                <Card style={styles.friendCard}>
                  <View style={styles.friendTop}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.friendName}>{f.handle}</Text>
                      <Mono style={{ fontSize: 9, color: color.faint, letterSpacing: 1 }}>
                        LVL {f.level} · {f.code}
                      </Mono>
                    </View>
                    <PressScale
                      onPress={() => {
                        setLobbyNotice(
                          `Party open. Send ${f.handle} the code from this screen.`,
                        );
                        go('lobby');
                      }}
                    >
                      <View style={styles.inviteBtn}>
                        <Mono style={styles.inviteText}>HOST</Mono>
                        <Mono style={styles.inviteSub}>SEND THEM YOUR CODE</Mono>
                      </View>
                    </PressScale>
                  </View>

                  {f.postedToday ? (
                    <View style={styles.postRow}>
                      <View style={styles.postShot}>
                        <ProceduralPhoto
                          seed={f.id.charCodeAt(0) * 613}
                          width={84}
                          height={84}
                          variant="back"
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Body style={{ fontSize: 13, lineHeight: 18, color: color.dim }}>
                          Posted today's assignment.
                        </Body>
                        <PressScale
                          disabled={f.applauded}
                          onPress={() => {
                            const got = applaud(f.id);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setApplaudPaid((m) => ({ ...m, [f.id]: got }));
                            setToast(
                              got > 0
                                ? `Applauded. ${f.handle} gets ${got} FILM.`
                                : 'Applauded. Daily FILM cap reached, so no payout.',
                            );
                          }}
                        >
                          <View
                            style={[
                              styles.applaudBtn,
                              f.applauded && { borderColor: color.accentDim, opacity: 0.6 },
                            ]}
                          >
                            <Mono style={styles.applaudText}>
                              {f.applauded ? 'APPLAUDED' : 'APPLAUD'}
                            </Mono>
                          </View>
                        </PressScale>
                        {f.applauded && paid != null && (
                          <Mono
                            style={{
                              fontSize: 9,
                              letterSpacing: 1,
                              marginTop: space(1.5),
                              color: paid > 0 ? color.accent : color.faint,
                            }}
                          >
                            {paid > 0
                              ? `+${paid} FILM TO ${f.handle}`
                              : 'CAP REACHED · NO PAYOUT'}
                          </Mono>
                        )}
                      </View>
                    </View>
                  ) : (
                    <Body style={{ fontSize: 13, color: color.faint, marginTop: space(3) }}>
                      Has not posted today.
                    </Body>
                  )}

                  <Rule style={{ marginVertical: space(3) }} />
                  <View style={styles.modRow}>
                    {/* REPORT stays one tap, always. Never route it through Confirm. */}
                    <PressScale disabled={f.reported} onPress={() => reportFriend(f.id)}>
                      <View style={styles.modHit}>
                        <Mono style={[styles.modAction, f.reported && { opacity: 0.45 }]}>
                          {f.reported ? 'REPORTED' : 'REPORT'}
                        </Mono>
                      </View>
                    </PressScale>
                    <PressScale
                      onPress={() => setConfirm({ type: 'block', id: f.id, handle: f.handle })}
                    >
                      <View style={styles.modHit}>
                        <Mono style={styles.modDanger}>BLOCK</Mono>
                      </View>
                    </PressScale>
                    <PressScale
                      onPress={() => setConfirm({ type: 'remove', id: f.id, handle: f.handle })}
                    >
                      <View style={styles.modHit}>
                        <Mono style={styles.modAction}>REMOVE</Mono>
                      </View>
                    </PressScale>
                  </View>
                  {f.reported && (
                    <Body style={{ fontSize: 13, color: color.accent, marginTop: space(1) }}>
                      Reported. Our team will review this account.
                    </Body>
                  )}
                </Card>
              </FadeIn>
            );
          })
        )}

        {/* ---- redemption only, the rare once-ever action ---- */}
        <FadeIn index={10}>
          <Card style={{ marginTop: space(6), padding: space(4) }}>
            <View style={styles.rowBetween}>
              <Label tone="text">Were you invited?</Label>
              <Mono style={{ fontSize: 9, color: color.faint, letterSpacing: 1 }}>
                {ECONOMY.referralFilm} FILM EACH
              </Mono>
            </View>

            {friends.referredBy ? (
              <>
                <Body style={{ fontSize: 13, color: color.accent, marginTop: space(3) }}>
                  Referred by {friends.referredBy}. Both of you were paid.
                </Body>
                <Body style={styles.hintBody}>
                  Finish these together to keep the bonus coming.
                </Body>
                <View style={{ marginTop: space(3), gap: space(2.5) }}>
                  {REFERRAL_TASKS.map((t) => {
                    const done = referralProgress[t.key] ?? 0;
                    const pct = Math.min(1, done / t.target);
                    return (
                      <View key={t.key}>
                        <View style={styles.rowBetween}>
                          <Body style={{ fontSize: 12, color: color.text }}>{t.label}</Body>
                          <Mono style={{ fontSize: 10, color: color.faint }}>
                            {done}/{t.target}
                          </Mono>
                        </View>
                        <View style={{ marginTop: 5 }}>
                          <Bar value={pct} bg={color.surface2} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Body style={{ fontSize: 13, lineHeight: 19, color: color.dim, marginTop: space(2) }}>
                  One time. You both get {ECONOMY.referralFilm.toLocaleString()} FILM.
                </Body>
                <View style={styles.inputRow}>
                  <TextInput
                    value={refCode}
                    onChangeText={(t) => {
                      setRefCode(t.toUpperCase());
                      setRefError(null);
                    }}
                    placeholder="REFERRAL CODE"
                    placeholderTextColor={color.faint}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={12}
                    style={styles.input}
                  />
                  <Pressable
                    onPress={() => {
                      const err = redeemReferral(refCode);
                      if (err) {
                        setRefError(err);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      } else {
                        setRefCode('');
                        setToast(`Referral redeemed. ${ECONOMY.referralFilm} FILM each.`);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }
                    }}
                    style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Mono style={styles.addBtnText}>USE</Mono>
                  </Pressable>
                </View>
                {refError && <Mono style={styles.error}>{refError}</Mono>}
              </>
            )}
          </Card>
        </FadeIn>
      </ScrollView>

      <Confirm
        visible={confirm != null}
        title={
          confirm?.type === 'remove'
            ? `Remove ${confirm?.handle ?? ''}?`
            : `Block ${confirm?.handle ?? ''}?`
        }
        body={
          confirm?.type === 'remove'
            ? 'They come off your list. You can add them back later with their code.'
            : 'They disappear from your friends list, your leaderboard, and their captures. This cannot be undone.'
        }
        confirmLabel={confirm?.type === 'remove' ? 'Remove' : 'Block'}
        danger={confirm?.type !== 'remove'}
        onConfirm={() => {
          if (confirm) {
            if (confirm.type === 'block') blockFriend(confirm.id);
            else removeFriend(confirm.id);
          }
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />

      <Toast text={toast} onDone={() => setToast(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  h1: {
    fontFamily: font.display,
    fontSize: 34,
    color: color.text,
    marginTop: space(3),
    letterSpacing: -0.5,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  myCode: {
    fontFamily: font.monoSemi,
    fontSize: 34,
    letterSpacing: 6,
    color: color.accent,
    marginTop: space(2),
  },
  codeBlurb: { fontSize: 13, lineHeight: 19, color: color.dim, marginTop: space(2) },
  refGuard: {
    fontSize: 9,
    letterSpacing: 1.3,
    color: color.faint,
    marginTop: space(2.5),
    textAlign: 'center',
  },
  qrToggleHit: { paddingVertical: space(2), paddingLeft: space(3) },
  qrOuter: { alignItems: 'center' },
  qrWrap: {
    padding: space(3),
    backgroundColor: color.black,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.accentDim,
  },
  qrCaption: {
    fontSize: 9,
    letterSpacing: 1.4,
    color: color.faint,
    marginTop: space(3),
  },
  hintBody: { fontSize: 13, lineHeight: 19, color: color.faint, marginTop: space(2.5) },
  inputRow: { flexDirection: 'row', gap: space(2), marginTop: space(3) },
  input: {
    flex: 1,
    minWidth: 0,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null),
    height: 46,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.sm,
    color: color.text,
    fontFamily: font.monoSemi,
    fontSize: 14,
    letterSpacing: 2,
    paddingHorizontal: space(3),
  },
  addBtn: {
    paddingHorizontal: space(4),
    justifyContent: 'center',
    backgroundColor: color.accent,
    borderRadius: radius.sm,
  },
  addBtnText: { fontSize: 12, letterSpacing: 1.5, color: color.black },
  error: { fontSize: 10, color: color.warn, marginTop: space(2) },
  walletStrip: {
    marginTop: space(3),
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    padding: space(3),
  },
  walletValue: { fontSize: 14, color: color.accent, marginTop: space(1.5) },
  cappedBody: { fontSize: 13, lineHeight: 19, color: color.dim, marginTop: space(2) },
  feedExplainer: { fontSize: 13, lineHeight: 19, color: color.dim, marginTop: space(2.5) },
  friendCard: { marginTop: space(3), padding: space(4) },
  friendTop: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  friendName: { fontFamily: font.monoSemi, fontSize: 18, letterSpacing: 1, color: color.text },
  inviteBtn: {
    borderWidth: 1,
    borderColor: color.accent,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
    alignItems: 'center',
  },
  inviteText: { fontSize: 10, letterSpacing: 1.4, color: color.accent },
  inviteSub: { fontSize: 8, letterSpacing: 1, color: color.faint, marginTop: 2 },
  postRow: { flexDirection: 'row', gap: space(3), marginTop: space(3), alignItems: 'center' },
  postShot: { borderWidth: 1, borderColor: color.line, borderRadius: radius.sm, overflow: 'hidden' },
  applaudBtn: {
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.sm,
    alignItems: 'center',
    paddingVertical: space(2),
    marginTop: space(2),
  },
  applaudText: { fontSize: 10, letterSpacing: 1.4, color: color.text },
  modRow: { flexDirection: 'row', gap: space(2), alignItems: 'center' },
  /* Padding grows the tap target: PressScale does not forward hitSlop. */
  modHit: { paddingVertical: space(2.5), paddingHorizontal: space(2) },
  modAction: { fontSize: 10, letterSpacing: 1.2, color: color.faint },
  modDanger: { fontSize: 10, letterSpacing: 1.2, color: color.danger },
});
