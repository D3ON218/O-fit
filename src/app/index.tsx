import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type HostInstance } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleReveal, measure, type RevealOrigin } from '@/components/motion';
import { Tap, Txt } from '@/components/ui';
import { C, F } from '@/theme';

/** Slow wobble for the two background blobs. */
function useBlob(delay: number) {
  const t = useSharedValue(delay);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [t]);
  return useAnimatedStyle(() => ({
    borderTopLeftRadius: 130 * (1 + 0.24 * t.value),
    borderTopRightRadius: 130 * (1 - 0.24 * t.value),
    borderBottomRightRadius: 130 * (1 - 0.08 * t.value),
    borderBottomLeftRadius: 130 * (1 + 0.08 * t.value),
    transform: [{ rotate: `${40 * t.value}deg` }],
  }));
}

export default function Splash() {
  const insets = useSafeAreaInsets();
  const circle = useRef<HostInstance>(null);
  const [reveal, setReveal] = useState<RevealOrigin | null>(null);
  const busy = useRef(false);

  const b1 = useBlob(0);
  const b2 = useBlob(0.5);
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.set(withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [breathe]);
  const breatheStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.05 * breathe.value }] }));

  async function start() {
    if (busy.current) return;
    busy.current = true;
    const r = await measure(circle);
    if (!r) {
      router.replace('/main');
      return;
    }
    setReveal({ cx: r.x + r.w / 2, cy: r.y + r.h / 2, r0: r.w / 2 });
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.b1, b1]} />
      <Animated.View style={[styles.b2, b2]} />

      <Animated.View style={breatheStyle}>
        <Tap ref={circle} onPress={start} squash={0.95} style={styles.circle} accessibilityLabel="Empezar">
          <Text style={styles.logo}>O-fit</Text>
          <View style={styles.start}>
            <Text style={styles.startText}>Empezar</Text>
          </View>
        </Tap>
      </Animated.View>

      <Txt style={[styles.tag, { bottom: 34 + insets.bottom }]}>
        Tu clóset en el celular y un outfit nuevo cada mañana.
      </Txt>

      {reveal && (
        // The closet's mint grows out of the circle; the closet screen picks up from there.
        <CircleReveal epoch={1} origin={reveal} duration={900} onDone={() => router.replace('/main')}>
          <View style={styles.fill} />
        </CircleReveal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bosque, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  b1: { position: 'absolute', width: 260, height: 260, backgroundColor: C.lima, left: -90, top: -60 },
  b2: { position: 'absolute', width: 220, height: 220, backgroundColor: C.rosa, right: -80, bottom: -40 },
  circle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: C.menta,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  logo: { fontFamily: F.display, fontSize: 60, letterSpacing: -3, color: C.bosque },
  start: { backgroundColor: C.bosque, borderRadius: 99, height: 40, paddingHorizontal: 20, justifyContent: 'center' },
  startText: { fontFamily: F.bodyHeavy, fontSize: 15, color: C.menta },
  tag: {
    position: 'absolute',
    left: 24,
    right: 24,
    textAlign: 'center',
    color: C.menta,
    fontFamily: F.bodySemi,
    fontSize: 16,
    lineHeight: 22,
  },
  fill: { flex: 1, backgroundColor: C.menta },
});
