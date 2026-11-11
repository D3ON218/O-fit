import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, type HostInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { HangerIcon, SparkleIcon, StackIcon } from '@/components/icons';
import { measure, type Rect } from '@/components/motion';
import { Tap } from '@/components/ui';
import type { Profile } from '@/data/types';
import { C, EASE, F, SIZES, SPRING } from '@/theme';

export type TabId = 'closet' | 'outfit' | 'sel';

const TABS: { id: TabId; label: string; icon: (c: string) => ReactNode }[] = [
  { id: 'closet', label: 'Clóset', icon: (c) => <HangerIcon color={c} /> },
  { id: 'outfit', label: 'Outfit', icon: (c) => <SparkleIcon color={c} /> },
  { id: 'sel', label: 'Selector', icon: (c) => <StackIcon color={c} /> },
];

type Props = {
  current: TabId;
  visible: boolean;
  bottom: number;
  onSelect: (id: TabId, from: Rect | null) => void;
  profile: Profile;
  onProfile: (node: HostInstance) => void;
};

export function TabBar({ current, visible, bottom, onSelect, profile, onProfile }: Props) {
  const avatarRef = useRef<HostInstance>(null);
  const [lay, setLay] = useState<Partial<Record<TabId, { x: number; w: number }>>>({});
  const refs = useRef<Partial<Record<TabId, HostInstance | null>>>({});
  const left = useSharedValue(0);
  const right = useSharedValue(0);
  const shown = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    shown.set(withSpring(visible ? 1 : 0, SPRING));
  }, [visible, shown]);

  // The leading edge runs ahead and the trailing edge catches up, so the pill stretches.
  useEffect(() => {
    const t = lay[current];
    if (!t) return;
    const L = t.x;
    const R = t.x + t.w;
    if (!placed.current) {
      placed.current = true;
      left.set(L);
      right.set(R);
      return;
    }
    const goingRight = L > left.get();
    const lead = { duration: 380, easing: EASE };
    const trail = { duration: 460, easing: EASE };
    left.set(goingRight ? withDelay(160, withTiming(L, trail)) : withTiming(L, lead));
    right.set(goingRight ? withTiming(R, lead) : withDelay(160, withTiming(R, trail)));
  }, [current, lay, left, right]);

  const ind = useAnimatedStyle(() => ({ left: left.value, width: right.value - left.value }));
  const bar = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - shown.value) * 120 }] }));

  return (
    <Animated.View style={[styles.bar, { bottom }, bar]} pointerEvents={visible ? 'auto' : 'none'}>
      {lay[current] && <Animated.View style={[styles.ind, ind]} />}
      {TABS.map((t) => {
        const on = t.id === current;
        const color = on ? C.tinta : C.menta;
        return (
          <Tap
            key={t.id}
            ref={(v) => {
              refs.current[t.id] = v;
            }}
            squash={0.95}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setLay((l) => (l[t.id]?.x === x && l[t.id]?.w === width ? l : { ...l, [t.id]: { x, w: width } }));
            }}
            onPress={async () => {
              const node = refs.current[t.id];
              onSelect(t.id, node ? await measure({ current: node }) : null);
            }}>
            {t.icon(color)}
            <Text style={[styles.label, { color }]}>{t.label}</Text>
          </Tap>
        );
      })}
      <Tap
        ref={avatarRef}
        squash={0.92}
        style={styles.avatar}
        accessibilityLabel={`Perfil de ${profile.name}`}
        onPress={() => avatarRef.current && onProfile(avatarRef.current)}>
        <Avatar profile={profile} size={46} />
      </Tap>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: SIZES.tabBarInset,
    right: SIZES.tabBarInset,
    height: SIZES.tabBarHeight,
    padding: 6,
    borderRadius: 999,
    backgroundColor: C.bosque,
    flexDirection: 'row',
    zIndex: 7,
  },
  ind: { position: 'absolute', top: 6, bottom: 6, borderRadius: 999, backgroundColor: C.lima },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999 },
  label: { fontFamily: F.bodyHeavy, fontSize: 12 },
  avatar: { width: 54, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
});
