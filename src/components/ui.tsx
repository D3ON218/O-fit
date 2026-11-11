import type { ReactNode, Ref } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type HostInstance,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { C, F, SIZES } from '@/theme';

const APressable = Animated.createAnimatedComponent(Pressable);

type TapProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far it shrinks while pressed. */
  squash?: number;
  ref?: Ref<HostInstance>;
  children?: ReactNode;
};

/** Pressable that springs down while held, like the prototype's :active scale. */
export function Tap({ style, squash = 0.94, onPressIn, onPressOut, ref, children, ...rest }: TapProps) {
  const s = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      ref={ref}
      accessibilityRole="button"
      onPressIn={(e) => {
        s.set(withSpring(squash, { damping: 18, stiffness: 400 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.set(withSpring(1, { damping: 12, stiffness: 260 }));
        onPressOut?.(e);
      }}
      style={[style, st]}
      {...rest}>
      {children}
    </APressable>
  );
}

type MegaProps = TextProps & { size?: number; color?: string };

/** Heavy, wide, uppercase display type. */
export function Mega({ size = 50, color = C.bosque, style, ...rest }: MegaProps) {
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: F.display, fontSize: size, lineHeight: size * 0.98, letterSpacing: -size * 0.03, color },
        styles.upper,
        style,
      ]}
    />
  );
}

export function Txt({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.body, style]} />;
}

export function Pill({ label, bg = C.bosque, color = C.menta, style }: { label: string; bg?: string; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function CountPill({ label, bg = C.bosque, color = C.menta }: { label: string; bg?: string; color?: string }) {
  return (
    <View style={[styles.count, { backgroundColor: bg }]}>
      <Text style={[styles.countText, { color }]}>{label}</Text>
    </View>
  );
}

type Variant = 'lime' | 'dark' | 'white' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, { bg: string; fg: string }> = {
  lime: { bg: C.lima, fg: C.tinta },
  dark: { bg: C.bosque, fg: C.menta },
  white: { bg: C.papel, fg: C.tinta },
  ghost: { bg: 'rgba(6,36,26,0.14)', fg: C.tinta },
  danger: { bg: C.rojo, fg: '#FFFFFF' },
};

type BtnProps = Omit<TapProps, 'children'> & {
  label: string;
  variant?: Variant;
  big?: boolean;
  icon?: (color: string) => ReactNode;
  disabled?: boolean;
  textStyle?: StyleProp<TextStyle>;
};

export function Btn({ label, variant = 'lime', big, icon, style, disabled, textStyle, ...rest }: BtnProps) {
  const v = VARIANTS[variant];
  return (
    <Tap
      squash={0.96}
      accessibilityState={{ disabled }}
      style={[styles.btn, big && styles.btnBig, { backgroundColor: v.bg }, style]}
      {...rest}>
      {icon?.(v.fg)}
      <Text style={[styles.btnText, big && styles.btnTextBig, { color: v.fg }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </Tap>
  );
}

type RoundProps = Omit<TapProps, 'children'> & { bg?: string; children: ReactNode; label: string };

export function Round({ bg = C.bosque, style, children, label, ...rest }: RoundProps) {
  return (
    <Tap squash={0.92} accessibilityLabel={label} style={[styles.round, { backgroundColor: bg }, style]} {...rest}>
      {children}
    </Tap>
  );
}

const styles = StyleSheet.create({
  upper: { textTransform: 'uppercase', includeFontPadding: false },
  body: { fontFamily: F.body, color: C.tinta },
  pill: { alignSelf: 'flex-start', height: 26, paddingHorizontal: 11, borderRadius: 99, justifyContent: 'center' },
  pillText: { fontFamily: F.bodyHeavy, fontSize: 12 },
  count: { height: 34, paddingHorizontal: 14, borderRadius: 99, justifyContent: 'center', marginBottom: 4 },
  countText: { fontFamily: F.bodyHeavy, fontSize: 13 },
  btn: {
    height: SIZES.button,
    borderRadius: 999,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnBig: { height: SIZES.buttonBig, alignSelf: 'stretch' },
  btnText: { fontFamily: F.bodyHeavy, fontSize: 16 },
  btnTextBig: { fontSize: 18 },
  round: {
    width: SIZES.round,
    height: SIZES.round,
    borderRadius: SIZES.round / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
