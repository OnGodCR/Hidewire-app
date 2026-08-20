import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { color, font, radius, space } from '../theme';
import { Body, Btn, Display, Label, Rule } from './ui';
import {
  CHECKIN_WINDOW,
  ROUND_DISPLAY_MINUTES,
  TickerEvent,
} from '../engine/GameContext';

// ---------- event ticker ----------

/**
 * The last three events, stacked newest-first and fading with age. Two-line
 * cards rather than a single shouting strip: the category is the machine part
 * (mono label, tinted), the sentence is the human part (Body, sentence case).
 * Fully opaque on purpose, since map labels bleeding through a live event read
 * as a glitch. The stack stays pinned; events only demote when newer ones land.
 */
const TICKER_OPACITY = [1, 0.55, 0.3];

export function Ticker({ events }: { events: TickerEvent[] }) {
  const latest = events[0];
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!latest) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [latest?.id]);
  if (!latest) return null;
  const stack = events.slice(0, 3);
  return (
    <View style={{ gap: space(1.5) }}>
      {stack.map((e, i) => {
        const tint =
          e.tone === 'danger'
            ? color.danger
            : e.tone === 'warn'
              ? color.warn
              : e.tone === 'accent'
                ? color.accent
                : color.dim;
        const card = (
          <View style={styles.tickerCard}>
            <Label size={11} style={{ color: tint }}>
              {e.category}
            </Label>
            <Body numberOfLines={2} style={styles.tickerBody}>
              {e.text}
            </Body>
          </View>
        );
        return i === 0 ? (
          <Animated.View key={e.id} style={{ opacity: fade }}>
            {card}
          </Animated.View>
        ) : (
          <View key={e.id} style={{ opacity: TICKER_OPACITY[i] }}>
            {card}
          </View>
        );
      })}
    </View>
  );
}

// ---------- SOS ----------

export function SosButton({ onLeave }: { onLeave: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.sos, pressed && { opacity: 0.8 }]}
        hitSlop={10}
      >
        <Text style={styles.sosText}>SOS</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Display style={{ fontSize: 22 }}>Safety</Display>
            <Body style={{ marginTop: space(2), marginBottom: space(4), color: color.dim }}>
              Leaving is always free. No XP penalty, no quitter flag. If something is
              wrong, stop playing.
            </Body>
            <Btn title="Back to round" onPress={() => setOpen(false)} />
            <View style={{ height: space(2) }} />
            <Btn
              title="Leave round"
              variant="ghost"
              onPress={() => {
                setOpen(false);
                onLeave();
              }}
            />
            <Rule style={{ marginVertical: space(4) }} />
            <Btn
              title="Call emergency services"
              variant="danger"
              sub="opens your phone dialer"
              onPress={() => {
                // No number is hardcoded: the dialer opens and the player
                // dials whatever their region uses. If the device cannot
                // open a dialer, fail quietly rather than crashing mid-round.
                Linking.openURL('tel:').catch(() => {});
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ---------- Explainer card (renders fully offline by design) ----------

function FakeQr({ size }: { size: number }) {
  const cells = useMemo(() => {
    let a = 1337;
    const rnd = () => {
      a = (a * 16807) % 2147483647;
      return a / 2147483647;
    };
    const n = 21;
    const grid: boolean[][] = [];
    for (let y = 0; y < n; y++) {
      grid.push([]);
      for (let x = 0; x < n; x++) grid[y].push(rnd() > 0.5);
    }
    const finder = (gx: number, gy: number) => {
      for (let y = 0; y < 7; y++)
        for (let x = 0; x < 7; x++) {
          const edge = x === 0 || y === 0 || x === 6 || y === 6;
          const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          grid[gy + y][gx + x] = edge || core;
        }
    };
    finder(0, 0);
    finder(14, 0);
    finder(0, 14);
    return grid;
  }, []);
  const cell = size / 21;
  return (
    <Svg width={size} height={size}>
      <Rect x={0} y={0} width={size} height={size} fill="#FFF" />
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <Rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="#000" />
          ) : null,
        ),
      )}
    </Svg>
  );
}

/** One key-value line in the rules section of the explainer modal. */
function ExplainerRule({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ marginTop: space(3) }}>
      <Text style={styles.ruleKey}>{k}</Text>
      <Text style={styles.ruleBody}>{v}</Text>
    </View>
  );
}

export function ExplainerButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.explainerBtn} hitSlop={8}>
        <View style={styles.cardGlyph}>
          <View style={styles.cardGlyphLine} />
        </View>
        <Label tone="text" size={10} style={{ marginTop: 3 }}>
          Show a stranger
        </Label>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.explainer}>
          <ScrollView contentContainerStyle={{ padding: space(7), paddingTop: space(14) }}>
            <Text style={styles.rulesHeading}>HOW THIS WORKS</Text>
            <ExplainerRule
              k="THE ROUND"
              v={`${ROUND_DISPLAY_MINUTES} minutes on one clock. Hiders who outlast it win.`}
            />
            <ExplainerRule
              k="CHECK-INS"
              v={`Hiders prove where they are with a photo inside every ${CHECKIN_WINDOW} second window. Miss one and you are out.`}
            />
            <ExplainerRule
              k="REVEALS"
              v="Every reveal tick drops every hider's position on the seeker's map, then it fades."
            />
            <ExplainerRule
              k="TAGS"
              v="The seeker has to physically reach a hider. GPS alone never confirms a tag."
            />

            <View style={styles.rulesDivider} />

            <Text style={styles.explainerTitle}>I'm playing a mobile game called Hidewire.</Text>
            <Text style={styles.explainerBody}>
              It's an app-based game of hide and seek with friends.{'\n\n'}I'm not filming
              you and I'm not recording audio.{'\n\n'}If I'm somewhere I shouldn't be,
              please tell me and I'll leave.
            </Text>
            <View style={{ alignItems: 'center', marginTop: space(8) }}>
              <FakeQr size={132} />
              <Text style={styles.explainerQrCaption}>frame.game/what-is-this</Text>
            </View>
          </ScrollView>
          <View style={{ padding: space(5) }}>
            <Text style={styles.explainerOffline}>THIS CARD WORKS WITHOUT SIGNAL</Text>
            <Btn title="Close" variant="ghost" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

// ---------- inventory drawer ----------

const HIDER_ITEMS = [
  { name: 'GHOST PING', desc: 'Skip one location reveal entirely.' },
  { name: 'GRACE', desc: 'Extend a check-in window by 90 s. Usable after the tick.' },
];
const SEEKER_ITEMS = [
  { name: 'THERMAL', desc: 'Direction to the nearest hider for 60 s. No distance.' },
  { name: 'PRESSURE', desc: 'Force an extra check-in from all hiders.' },
];

export function InventoryDrawer({ role }: { role: 'hider' | 'seeker' }) {
  const [open, setOpen] = useState(false);
  const items = role === 'hider' ? HIDER_ITEMS : SEEKER_ITEMS;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.invBtn} hitSlop={8}>
        <Label tone="text" size={12}>
          ITEMS
        </Label>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Label size={12}>{`Item reference · ${role === 'hider' ? 'hider pool' : 'seeker pool'}`}</Label>
            {items.map((it, i) => (
              <View key={it.name}>
                {i > 0 && <Rule style={{ marginVertical: space(3) }} />}
                <View style={{ marginTop: i === 0 ? space(4) : 0 }}>
                  <Text style={styles.invName}>{it.name}</Text>
                  <Body style={{ marginTop: 2, color: color.dim }}>{it.desc}</Body>
                </View>
              </View>
            ))}
            <Body style={{ marginTop: space(4), color: color.faint }}>
              Earned through play only. Never purchasable. 90 second cooldown between uses.
            </Body>
            <View style={{ height: space(3) }} />
            <Btn title="Close" variant="outline" onPress={() => setOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tickerCard: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.sm,
    paddingVertical: space(2),
    paddingHorizontal: space(3),
  },
  tickerBody: {
    marginTop: 1,
  },
  sos: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: color.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF7B72',
  },
  sosText: {
    fontFamily: font.monoSemi,
    fontSize: 12,
    letterSpacing: 1.5,
    color: '#FFF',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.line,
    padding: space(5),
    paddingBottom: space(10),
  },
  explainerBtn: {
    minHeight: 44,
    paddingHorizontal: space(2.5),
    paddingVertical: space(1.5),
    borderRadius: radius.md,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.lineBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGlyph: {
    width: 22,
    height: 15,
    borderWidth: 1.5,
    borderColor: color.text,
    borderRadius: 3,
    justifyContent: 'flex-end',
    paddingHorizontal: 3,
    paddingBottom: 2,
  },
  cardGlyphLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: color.text,
  },
  explainer: { flex: 1, backgroundColor: '#FFFFFF' },
  rulesHeading: {
    fontFamily: font.monoSemi,
    fontSize: 12,
    letterSpacing: 1.6,
    color: '#000',
  },
  ruleKey: {
    fontFamily: font.monoMed,
    fontSize: 11,
    letterSpacing: 1.4,
    color: '#666',
  },
  ruleBody: {
    fontFamily: font.displayMed,
    fontSize: 15,
    lineHeight: 21,
    color: '#111',
    marginTop: 2,
  },
  rulesDivider: {
    height: 1,
    backgroundColor: '#DDD',
    marginVertical: space(6),
  },
  explainerTitle: {
    fontFamily: font.display,
    fontSize: 30,
    lineHeight: 36,
    color: '#000',
  },
  explainerBody: {
    fontFamily: font.displayMed,
    fontSize: 20,
    lineHeight: 28,
    color: '#111',
    marginTop: space(6),
  },
  explainerQrCaption: {
    fontFamily: font.monoMed,
    fontSize: 12,
    color: '#444',
    marginTop: space(2),
  },
  explainerOffline: {
    fontFamily: font.monoMed,
    fontSize: 10,
    letterSpacing: 1.6,
    color: '#666',
    textAlign: 'center',
    marginBottom: space(3),
  },
  invBtn: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invName: {
    fontFamily: font.monoSemi,
    fontSize: 13,
    letterSpacing: 1.5,
    color: color.text,
  },
});
