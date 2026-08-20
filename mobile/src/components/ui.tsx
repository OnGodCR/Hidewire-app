import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Text,
  TextProps,
  View,
  ViewProps,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, font, radius, space } from '../theme';

// ---------- typography ----------

export function Display({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.display, style]} />;
}

export function Body({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.body, style]} />;
}

export function Mono({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.mono, style]} />;
}

/**
 * Uppercase micro-label, letterspaced. The app's signature text style.
 *
 * `size` exists because 10px caps are fine in a settings list and unreadable
 * on a phone held at arm's length outdoors. Inside a round, or anywhere read
 * in sunlight, pass `size={12}`. Nothing player-facing goes below 10.
 */
export function Label({
  style,
  children,
  tone = 'dim',
  size,
  ...rest
}: TextProps & {
  tone?: 'dim' | 'text' | 'accent' | 'danger' | 'faint';
  size?: number;
}) {
  const c =
    tone === 'accent'
      ? color.accent
      : tone === 'danger'
        ? color.danger
        : tone === 'text'
          ? color.text
          : tone === 'faint'
            ? color.faint
            : color.dim;
  return (
    <Text
      {...rest}
      style={[
        styles.label,
        { color: c },
        size != null && { fontSize: size, letterSpacing: size >= 12 ? 1.0 : 1.6 },
        style,
      ]}
    >
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Text>
  );
}

// ---------- surfaces ----------

export function Card({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.card, style]} />;
}

export function Rule({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: 1, backgroundColor: color.line }, style]} />;
}

// ---------- buttons ----------

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'outline';

export function Btn({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
  sub,
}: {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  style?: ViewStyle;
  sub?: string;
}) {
  const base: ViewStyle[] = [styles.btn];
  if (variant === 'primary') base.push({ backgroundColor: color.accent });
  if (variant === 'ghost') base.push({ backgroundColor: color.surface2 });
  if (variant === 'danger') base.push({ backgroundColor: color.danger });
  if (variant === 'outline')
    base.push({
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: color.lineBright,
    });
  const textColor =
    variant === 'primary'
      ? color.onAccent
      : variant === 'danger'
        ? '#FFF'
        : color.text;
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      style={({ pressed }) => [
        base,
        style,
        disabled && { opacity: 0.35 },
        pressed && !disabled && { opacity: 0.75 },
      ]}
    >
      <Text style={[styles.btnText, { color: textColor }]}>
        {title.toUpperCase()}
      </Text>
      {sub ? (
        <Text style={[styles.btnSub, { color: textColor, opacity: 0.6 }]}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ---------- progress ----------

export function Bar({
  value,
  height = 4,
  fg = color.accent,
  bg = color.line,
}: {
  value: number; // 0..1
  height?: number;
  fg?: string;
  bg?: string;
}) {
  return (
    <View style={{ height, backgroundColor: bg, borderRadius: height / 2, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          height,
          backgroundColor: fg,
        }}
      />
    </View>
  );
}

// ---------- corner brackets (the wordmark motif) ----------

export function Brackets({
  size = 14,
  thickness = 2,
  inset = 0,
  tint = color.accent,
  children,
  style,
}: {
  size?: number;
  thickness?: number;
  inset?: number;
  tint?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  const corner = (pos: ViewStyle): ViewStyle => ({
    position: 'absolute',
    width: size,
    height: size,
    borderColor: tint,
    ...pos,
  });
  return (
    <View style={style}>
      {children}
      <View
        pointerEvents="none"
        style={corner({
          top: inset,
          left: inset,
          borderTopWidth: thickness,
          borderLeftWidth: thickness,
        })}
      />
      <View
        pointerEvents="none"
        style={corner({
          top: inset,
          right: inset,
          borderTopWidth: thickness,
          borderRightWidth: thickness,
        })}
      />
      <View
        pointerEvents="none"
        style={corner({
          bottom: inset,
          left: inset,
          borderBottomWidth: thickness,
          borderLeftWidth: thickness,
        })}
      />
      <View
        pointerEvents="none"
        style={corner({
          bottom: inset,
          right: inset,
          borderBottomWidth: thickness,
          borderRightWidth: thickness,
        })}
      />
    </View>
  );
}

// ---------- section header ----------

/**
 * A titled rule between sections. Every long screen was hand-rolling this
 * with a bare Label floating on the background, which is why scrolling felt
 * like one continuous card: nothing said where an idea ended.
 */
export function SectionHeader({
  title,
  right,
  style,
}: {
  title: string;
  right?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={style}>
      <View style={styles.sectionHeadRow}>
        <Label tone="text">{title}</Label>
        {typeof right === 'string' ? <Label tone="faint">{right}</Label> : right}
      </View>
      <Rule style={{ marginTop: space(2) }} />
    </View>
  );
}

// ---------- empty state ----------

/**
 * What a list says when it has nothing in it. A blank gap under a heading
 * reads as a bug; an empty state reads as an instruction.
 */
export function EmptyState({
  title,
  body,
  action,
  style,
}: {
  title: string;
  body?: string;
  action?: { title: string; onPress: () => void };
  style?: ViewStyle;
}) {
  return (
    <Card style={[styles.empty, style]}>
      <Display style={styles.emptyTitle}>{title}</Display>
      {body ? <Body style={styles.emptyBody}>{body}</Body> : null}
      {action ? (
        <Btn
          title={action.title}
          variant="ghost"
          onPress={action.onPress}
          style={{ marginTop: space(4), alignSelf: 'stretch' }}
        />
      ) : null}
    </Card>
  );
}

// ---------- toast ----------

/**
 * A transient confirmation, bottom-anchored so it appears where thumbs are,
 * clear of the tab bar. Render it last in the screen so it stacks on top.
 *
 * Controlled: the parent owns the message and clears it via onDone. Passing a
 * new message while one is showing restarts the timer.
 */
export function Toast({
  text,
  onDone,
  bottom = 84,
  duration = 2400,
}: {
  text: string | null;
  onDone: () => void;
  bottom?: number;
  duration?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  // Snapshot the text so the fade-out animates the old message rather than
  // collapsing the moment the parent clears it.
  const shown = useRef<string | null>(null);
  if (text) shown.current = text;

  useEffect(() => {
    if (!text) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(
        () => onDone(),
      );
    }, duration);
    return () => clearTimeout(t);
  }, [text, duration, onDone, opacity]);

  if (!text && !shown.current) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { bottom, opacity }]}>
      <Mono style={styles.toastText}>{shown.current}</Mono>
    </Animated.View>
  );
}

// ---------- confirm ----------

/**
 * A blocking yes-or-no for actions that cannot be undone. One primitive so
 * every irreversible tap in the app asks the same way.
 *
 * Safety controls (REPORT) must never be routed through this: reporting
 * should stay one tap. This is for BLOCK, REMOVE, and deletions.
 */
export function Confirm({
  visible,
  title,
  body,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmBackdrop}>
        <Card style={styles.confirmCard}>
          <Display style={styles.confirmTitle}>{title}</Display>
          <Body style={styles.confirmBody}>{body}</Body>
          <Btn
            title={confirmLabel}
            variant={danger ? 'danger' : 'ghost'}
            onPress={onConfirm}
            style={{ marginTop: space(5) }}
          />
          <Btn
            title="Cancel"
            variant="outline"
            onPress={onCancel}
            style={{ marginTop: space(2.5) }}
          />
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  display: {
    fontFamily: font.display,
    color: color.text,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  body: {
    fontFamily: font.displayMed,
    color: color.text,
    fontSize: 15,
    lineHeight: 22,
  },
  mono: {
    fontFamily: font.mono,
    color: color.dim,
    fontSize: 13,
  },
  label: {
    fontFamily: font.monoMed,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    padding: space(4),
  },
  btn: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(5),
    paddingVertical: space(3),
  },
  btnText: {
    fontFamily: font.monoSemi,
    fontSize: 14,
    letterSpacing: 2,
  },
  btnSub: {
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: space(7),
  },
  emptyTitle: { fontSize: 20, textAlign: 'center' },
  emptyBody: {
    color: color.dim,
    textAlign: 'center',
    marginTop: space(2),
    fontSize: 14,
    lineHeight: 20,
  },
  toast: {
    position: 'absolute',
    left: space(5),
    right: space(5),
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.lineBright,
    borderRadius: radius.md,
    paddingVertical: space(3),
    paddingHorizontal: space(4),
    alignItems: 'center',
  },
  toastText: { fontSize: 12, color: color.text },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: space(6),
  },
  confirmCard: { borderColor: color.lineBright, padding: space(5) },
  confirmTitle: { fontSize: 22 },
  confirmBody: {
    color: color.dim,
    marginTop: space(2),
    fontSize: 14,
    lineHeight: 21,
  },
});
