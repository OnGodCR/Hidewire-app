import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, font, space, REDUCED_MOTION } from '../theme';
import { Body, Btn, Label } from '../components/ui';
import {
  useGame,
  SEEKER_BOT,
  CHECKIN_WINDOW,
  HIDER_CHECKIN_TICKS,
} from '../engine/GameContext';

const NAMES = ['MAYA', 'KAI', 'DEV', 'JULES', 'ARI', 'YOU'];

export function RoleReveal() {
  const { go, round } = useGame();
  const role = round?.role ?? 'hider';
  const [phase, setPhase] = useState<'shuffle' | 'reveal'>('shuffle');
  const [shuffleName, setShuffleName] = useState(NAMES[0]);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let i = 0;
    const spin = setInterval(() => {
      i++;
      setShuffleName(NAMES[i % NAMES.length]);
    }, 110);
    const stop = setTimeout(() => {
      clearInterval(spin);
      setPhase('reveal');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (REDUCED_MOTION) fade.setValue(1);
      else Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 2200);
    // No auto-advance: this screen carries the rules, and the player leaves it
    // when they have read them. The round clock runs regardless, and the start
    // button says so, which is its own pressure to go.
    return () => {
      clearInterval(spin);
      clearTimeout(stop);
    };
  }, []);

  if (phase === 'shuffle') {
    return (
      <View style={styles.screen}>
        <Label tone="faint">Picking the seeker</Label>
        <Text style={styles.shuffle}>{shuffleName}</Text>
      </View>
    );
  }

  const seeking = role === 'seeker';
  const firstTickMin = HIDER_CHECKIN_TICKS[0].at / 60;
  const lines = seeking
    ? [
        { k: 'COOLDOWN', v: 'You hold position for 5:00 while hiders disperse.' },
        { k: 'THE FEED', v: 'Every check-in a hider passes lands in your feed.' },
        { k: 'TO WIN', v: 'Tag every hider before the clock runs out.' },
      ]
    : [
        { k: 'FIRST CHECK-IN', v: `In ${firstTickMin} minutes.` },
        { k: 'TO STAY IN', v: `A photo inside every ${CHECKIN_WINDOW} second window.` },
        { k: 'IF YOU MISS ONE', v: 'Out for the rest of the round.' },
      ];

  return (
    <Animated.View style={[styles.screen, { opacity: fade }]}>
      <Label tone={seeking ? 'danger' : 'accent'}>
        {seeking ? 'You are the seeker' : `${SEEKER_BOT.name} is seeking`}
      </Label>
      <Text style={[styles.role, { color: seeking ? color.danger : color.accent }]}>
        {seeking ? 'SEEK' : 'HIDE'}
      </Text>

      <View style={styles.lines}>
        {lines.map((l) => (
          <View key={l.k} style={styles.lineRow}>
            <Label tone="faint" size={12}>
              {l.k}
            </Label>
            <Body style={styles.lineBody}>{l.v}</Body>
          </View>
        ))}
      </View>

      <Body style={styles.safety}>
        Public ground only, at street level. Nothing here is worth climbing for.
      </Body>

      <Btn
        title={seeking ? 'Start seeking' : 'Start hiding'}
        sub="the clock is already running"
        onPress={() => go('round')}
        style={{ alignSelf: 'stretch', marginTop: space(4) }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space(8),
  },
  shuffle: {
    fontFamily: font.display,
    fontSize: 44,
    letterSpacing: 4,
    color: color.faint,
    marginTop: space(4),
  },
  role: {
    fontFamily: font.display,
    fontSize: 88,
    letterSpacing: 8,
    marginTop: space(3),
  },
  lines: {
    alignSelf: 'stretch',
    marginTop: space(7),
    gap: space(4),
  },
  lineRow: {
    alignItems: 'flex-start',
  },
  lineBody: {
    marginTop: 2,
  },
  safety: {
    alignSelf: 'stretch',
    color: color.dim,
    marginTop: space(6),
  },
});
