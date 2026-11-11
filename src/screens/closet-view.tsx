import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions, type HostInstance, type ScrollViewInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GarmentArt, GarmentShape } from '@/components/garment-art';
import { Rise, type Radii } from '@/components/motion';
import { CountPill, Mega, Tap, Txt } from '@/components/ui';
import { CATS, catName } from '@/data/catalog';
import type { Cat, Garment } from '@/data/types';
import { useCloset } from '@/store/closet';
import { C, EASE, F, SIZES } from '@/theme';

/** Four tile silhouettes, cycled through the grid (prototype .s0–.s3). */
export const TILE_RADII: Radii[] = [30, [90, 90, 30, 30], [30, 90, 30, 90], 90];

type Props = {
  cat: Cat;
  onCat: (c: Cat) => void;
  onOpen: (item: Garment, node: HostInstance, radii: Radii) => void;
  /** Bumped after a new garment is saved so the list jumps back to the top. */
  scrollKey: number;
};

export function ClosetView({ cat, onCat, onOpen, scrollKey }: Props) {
  const { items } = useCloset();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollViewInstance>(null);
  const list = items.filter((i) => i.cat === cat);
  const n = items.length;
  const tile = Math.floor((Math.min(width, 560) - SIZES.gutter * 2 - 10) / 2);

  useEffect(() => {
    if (scrollKey) scroll.current?.scrollTo({ y: 0, animated: true });
  }, [scrollKey]);

  return (
    <ScrollView
      ref={scroll}
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 34, paddingBottom: 122 + insets.bottom }]}
      showsVerticalScrollIndicator={false}>
      <Rise i={0} style={styles.head}>
        <Mega>{'Mi\nclóset'}</Mega>
        <CountPill label={`${n} ${n === 1 ? 'prenda' : 'prendas'}`} />
      </Rise>

      <Rise i={1} style={styles.cats}>
        {CATS.map((c) => (
          <CatButton
            key={c.id}
            cat={c.id}
            on={c.id === cat}
            count={items.filter((i) => i.cat === c.id).length}
            onPress={() => onCat(c.id)}
          />
        ))}
      </Rise>

      <Rise i={2} style={styles.grid}>
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aquí no hay nada</Text>
            <Txt style={styles.emptyText}>
              Toca el botón verde y fotografía tu primera prenda de {catName(cat).toLowerCase()}.
            </Txt>
          </View>
        ) : (
          list.map((it, i) => (
            <Tile key={`${cat}:${it.id}`} item={it} index={i} size={tile} onOpen={onOpen} />
          ))
        )}
      </Rise>
    </ScrollView>
  );
}

function Tile({ item, index, size, onOpen }: { item: Garment; index: number; size: number; onOpen: Props['onOpen'] }) {
  const ref = useRef<HostInstance>(null);
  const radii = TILE_RADII[index % 4];
  const r = typeof radii === 'number' ? [radii, radii, radii, radii] : radii;
  const centered = index % 4 !== 0;
  return (
    <Animated.View entering={ZoomIn.delay(Math.min(index, 10) * 55).springify().damping(14)}>
      <Tap
        ref={ref}
        squash={0.95}
        accessibilityLabel={item.name}
        onPress={() => ref.current && onOpen(item, ref.current, radii)}
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            backgroundColor: item.bg,
            borderTopLeftRadius: r[0],
            borderTopRightRadius: r[1],
            borderBottomRightRadius: r[2],
            borderBottomLeftRadius: r[3],
          },
        ]}>
        <GarmentArt item={item} style={StyleSheet.absoluteFill} />
        <View style={[styles.tlRow, centered && styles.tlRowCenter]} pointerEvents="none">
          <View style={styles.tl}>
            <Text style={styles.tlText} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        </View>
      </Tap>
    </Animated.View>
  );
}

function CatButton({ cat, on, count, onPress }: { cat: Cat; on: boolean; count: number; onPress: () => void }) {
  const t = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    t.set(withTiming(on ? 1 : 0, { duration: 600, easing: EASE }));
  }, [on, t]);
  const box = useAnimatedStyle(() => ({ flexGrow: 1 + 2.2 * t.value }));
  const label = useAnimatedStyle(() => ({ maxWidth: 90 * t.value, opacity: t.value }));
  const badge = useAnimatedStyle(() => ({ maxWidth: 40 * t.value, opacity: t.value }));
  const def = CATS.find((c) => c.id === cat)!;
  const fg = on ? C.menta : C.bosque;
  return (
    <Animated.View style={[styles.catWrap, box]}>
      <Tap
        onPress={onPress}
        squash={0.95}
        accessibilityLabel={`${def.name}, ${count} prendas`}
        accessibilityState={{ selected: on }}
        style={[styles.cat, { backgroundColor: on ? C.bosque : 'rgba(14,59,46,0.12)' }]}>
        <GarmentShape kind={def.icon} stroke={fg} strokeWidth={7} size={26} />
        <Animated.View style={[styles.clip, label]}>
          <Text style={[styles.catLabel, { color: fg }]} numberOfLines={1}>
            {def.name}
          </Text>
        </Animated.View>
        <Animated.View style={[styles.clip, badge]}>
          <View style={styles.cn}>
            <Text style={styles.cnText}>{count}</Text>
          </View>
        </Animated.View>
      </Tap>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.menta },
  content: { paddingHorizontal: SIZES.gutter, gap: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  cats: { flexDirection: 'row', gap: 8 },
  catWrap: { flexBasis: 0, minWidth: 0 },
  cat: {
    height: 58,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  clip: { overflow: 'hidden' },
  catLabel: { fontFamily: F.bodyHeavy, fontSize: 16 },
  cn: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 99, backgroundColor: C.lima, alignItems: 'center', justifyContent: 'center' },
  cnText: { fontFamily: F.bodyHeavy, fontSize: 12, color: C.tinta },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tlRow: { position: 'absolute', left: 10, right: 10, bottom: 10, alignItems: 'flex-start' },
  tlRowCenter: { alignItems: 'center' },
  tl: {
    maxWidth: '100%',
    backgroundColor: C.bosque,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tlText: { fontFamily: F.bodyBold, fontSize: 11, color: C.menta },
  empty: { width: '100%', backgroundColor: 'rgba(14,59,46,0.1)', borderRadius: 30, paddingVertical: 26, paddingHorizontal: 22 },
  emptyTitle: { fontFamily: F.display, fontSize: 22, lineHeight: 24, letterSpacing: -0.5, textTransform: 'uppercase', color: C.bosque, marginBottom: 8 },
  emptyText: { fontFamily: F.bodySemi, fontSize: 16, lineHeight: 23, color: C.bosque },
});
