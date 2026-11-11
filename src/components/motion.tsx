import {
  createContext,
  use,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle, type HostInstance } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { EASE, SPRING } from '@/theme';

export type Rect = { x: number; y: number; w: number; h: number };
/** One radius, or [topLeft, topRight, bottomRight, bottomLeft]. */
export type Radii = number | [number, number, number, number];

const toCorners = (r: Radii, rect: Rect): [number, number, number, number] => {
  const max = Math.min(rect.w, rect.h) / 2;
  const a = typeof r === 'number' ? [r, r, r, r] : r;
  return a.map((v) => Math.min(v, max)) as [number, number, number, number];
};

export function measure(ref: RefObject<HostInstance | null>): Promise<Rect | null> {
  return new Promise((resolve) => {
    const node = ref.current;
    if (!node) return resolve(null);
    node.measureInWindow((x, y, w, h) => resolve(w || h ? { x, y, w, h } : null));
  });
}

/**
 * Animates a shared value and resolves when it lands. A timer backs up the worklet callback,
 * so a dropped or interrupted animation can never leave the caller (and its busy flag) waiting.
 */
export function animate(sv: SharedValue<number>, to: number, duration: number, delay = 0) {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    sv.set(withDelay(delay, withTiming(to, { duration, easing: EASE }, () => scheduleOnRN(finish))));
    setTimeout(finish, delay + duration + 250);
  });
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function useBoxSize() {
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (s && s.W === width && s.H === height ? s : { W: width, H: height }));
  };
  return [size, onLayout] as const;
}

/* ---------- Rise: staggered entrance, replayed whenever the epoch changes ---------- */

const RiseEpoch = createContext(0);
export const RiseProvider = RiseEpoch.Provider;

export function Rise({ i = 0, style, children }: { i?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const epoch = use(RiseEpoch);
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(0);
    v.set(withDelay(280 + i * 70, withSpring(1, SPRING)));
  }, [epoch, i, v]);
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.6], [0, 1], 'clamp'),
    transform: [{ translateY: (1 - v.value) * 26 }, { scale: 0.94 + 0.06 * v.value }],
  }));
  return <Animated.View style={[st, style]}>{children}</Animated.View>;
}

/* ---------- MorphLayer: a full-screen layer that grows out of a rect and shrinks back ---------- */

export type MorphHandle = {
  /** Shrinks back to `to` (re-measured origin) or to where it came from. */
  close: (to?: { rect: Rect; radii: Radii } | null) => Promise<void>;
};

type MorphProps = {
  from: Rect;
  radii: Radii;
  color: string;
  /** Color at the start of the grow (usually the opener's own color). */
  fromColor?: string;
  duration?: number;
  closeDuration?: number;
  onOpened?: () => void;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<MorphHandle>;
  children: ReactNode;
};

export function MorphLayer({
  from,
  radii,
  color,
  fromColor = color,
  duration = 680,
  closeDuration = 580,
  onOpened,
  style,
  ref,
  children,
}: MorphProps) {
  const [size, onLayout] = useBoxSize();
  const p = useSharedValue(0);
  const fade = useSharedValue(0);
  const o = useSharedValue({ ...from, r: toCorners(radii, from) });

  useEffect(() => {
    if (!size) return;
    let alive = true;
    animate(p, 1, duration).then(() => alive && onOpened?.());
    fade.set(withDelay(duration * 0.35, withTiming(1, { duration: 320 })));
    return () => {
      alive = false;
    };
    // Grow once, when the layer first knows its size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size !== null]);

  useImperativeHandle(ref, () => ({
    close: async (to) => {
      if (to) o.set({ ...to.rect, r: toCorners(to.radii, to.rect) });
      fade.set(withTiming(0, { duration: 180 }));
      await animate(p, 0, closeDuration);
    },
  }));

  const W = size?.W ?? 0;
  const H = size?.H ?? 0;

  const outer = useAnimatedStyle(() => {
    const t = p.value;
    const k = 1 - t;
    const r = o.value;
    return {
      left: r.x * k,
      top: r.y * k,
      width: r.w + (W - r.w) * t,
      height: r.h + (H - r.h) * t,
      borderTopLeftRadius: r.r[0] * k,
      borderTopRightRadius: r.r[1] * k,
      borderBottomRightRadius: r.r[2] * k,
      borderBottomLeftRadius: r.r[3] * k,
      backgroundColor: interpolateColor(t, [0, 1], [fromColor, color]),
    };
  });
  const inner = useAnimatedStyle(() => {
    const k = 1 - p.value;
    return {
      opacity: fade.value,
      transform: [{ translateX: -o.value.x * k }, { translateY: -o.value.y * k }],
    };
  });

  return (
    <View style={styles.layer} pointerEvents="box-none" onLayout={onLayout}>
      {size && (
        <Animated.View style={[styles.clip, outer]}>
          <Animated.View style={[{ width: W, height: H }, inner, style]}>
            <RiseProvider value={1}>{children}</RiseProvider>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

/* ---------- CircleReveal: content shown through a circle growing from a point ---------- */

export type RevealOrigin = { cx: number; cy: number; r0: number };

type RevealProps = {
  /** Change it to replay the reveal from `origin`. 0 means "already fully shown". */
  epoch: number;
  origin: RevealOrigin | null;
  duration?: number;
  onDone?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function CircleReveal({ epoch, origin, duration = 760, onDone, style, children }: RevealProps) {
  const [size, onLayout] = useBoxSize();
  const p = useSharedValue(1);
  const c = useSharedValue<RevealOrigin>(origin ?? { cx: 0, cy: 0, r0: 0 });

  useEffect(() => {
    if (!epoch || !origin || !size) return;
    let alive = true;
    c.set(origin);
    p.set(0);
    animate(p, 1, duration).then(() => alive && onDone?.());
    return () => {
      alive = false;
    };
    // Replays only on a new epoch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epoch, size !== null]);

  const W = size?.W ?? 0;
  const H = size?.H ?? 0;

  const outer = useAnimatedStyle(() => {
    if (p.value >= 1) return { left: 0, top: 0, width: W, height: H, borderRadius: 0 };
    const { cx, cy, r0 } = c.value;
    const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
    const r = r0 + (R - r0) * p.value;
    return { left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: r };
  });
  const inner = useAnimatedStyle(() => {
    if (p.value >= 1) return { transform: [{ translateX: 0 }, { translateY: 0 }] };
    const { cx, cy, r0 } = c.value;
    const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
    const r = r0 + (R - r0) * p.value;
    return { transform: [{ translateX: r - cx }, { translateY: r - cy }] };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={onLayout}>
      {size && (
        <Animated.View style={[styles.clip, outer]}>
          <Animated.View style={[{ width: W, height: H }, inner, style]}>{children}</Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, zIndex: 30 },
  clip: { position: 'absolute', overflow: 'hidden' },
});
