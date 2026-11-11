import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type HostInstance, type ScrollViewInstance } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GarmentArt, GarmentShape } from '@/components/garment-art';
import { CloseIcon, PencilIcon } from '@/components/icons';
import { Rise, type Radii } from '@/components/motion';
import { useSheet } from '@/components/sheet';
import { CountPill, Mega, Round, Tap, Txt } from '@/components/ui';
import { CATS } from '@/data/catalog';
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
  const { items, updateItem, removeItem } = useCloset();
  const sheet = useSheet();
  const [menuId, setMenuId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollViewInstance>(null);
  const list = items.filter((i) => i.cat === cat);
  const n = items.length;
  // Two columns on a phone; wider screens (tablets, web) get a third so tiles stay card-sized.
  const cols = width >= 720 ? 3 : 2;
  const tile = Math.min(260, Math.floor((width - SIZES.gutter * 2 - 10 * (cols - 1)) / cols));

  useEffect(() => {
    if (scrollKey) scroll.current?.scrollTo({ y: 0, animated: true });
  }, [scrollKey]);

  async function rename(it: Garment) {
    setMenuId(null);
    const name = await sheet.prompt({ title: 'Cambiar nombre', value: it.name, placeholder: 'Nombre de la prenda' });
    if (name) updateItem(it.id, { name });
  }

  async function remove(it: Garment) {
    setMenuId(null);
    const ok = await sheet.confirm({
      title: '¿Eliminar prenda?',
      message: `"${it.name}" se borrará de tu clóset.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (ok) removeItem(it.id);
  }

  return (
    <ScrollView
      ref={scroll}
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 34, paddingBottom: 122 + insets.bottom }]}
      onScrollBeginDrag={() => setMenuId(null)}
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
            onPress={() => {
              setMenuId(null);
              onCat(c.id);
            }}
          />
        ))}
      </Rise>

      <Rise i={2} style={styles.grid}>
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aquí no hay nada</Text>
            <Txt style={styles.emptyText}>
              Toca el botón verde y fotografía tu primera prenda.
            </Txt>
          </View>
        ) : (
          list.map((it, i) => (
            <Tile
              key={`${cat}:${it.id}`}
              item={it}
              index={i}
              size={tile}
              menuOpen={menuId === it.id}
              onOpen={onOpen}
              onMenu={(open) => setMenuId(open ? it.id : null)}
              onEdit={() => rename(it)}
              onDelete={() => remove(it)}
            />
          ))
        )}
      </Rise>
    </ScrollView>
  );
}

type TileProps = {
  item: Garment;
  index: number;
  size: number;
  menuOpen: boolean;
  onOpen: Props['onOpen'];
  onMenu: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * Fade-and-rise driven by a shared value. Layout-animation keyframes with transforms left
 * tiles half-scaled and overlapping on web, so the entrance is animated by hand instead.
 */
function useEnter(delay: number, distance: number, duration: number) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) })));
  }, [t, delay, duration]);
  return useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * distance }],
  }));
}

function MenuButton({ delay, children }: { delay: number; children: ReactNode }) {
  const st = useEnter(delay, 8, 200);
  return <Animated.View style={st}>{children}</Animated.View>;
}

function Tile({ item, index, size, menuOpen, onOpen, onMenu, onEdit, onDelete }: TileProps) {
  const ref = useRef<HostInstance>(null);
  const enter = useEnter(Math.min(index, 8) * 25, 10, 240);
  const radii = TILE_RADII[index % 4];
  const r = typeof radii === 'number' ? [radii, radii, radii, radii] : radii;
  const centered = index % 4 !== 0;
  const shape = {
    width: size,
    height: size,
    borderTopLeftRadius: r[0],
    borderTopRightRadius: r[1],
    borderBottomRightRadius: r[2],
    borderBottomLeftRadius: r[3],
  };
  return (
    <Animated.View style={enter}>
      <Tap
        ref={ref}
        squash={0.95}
        accessibilityLabel={item.name}
        accessibilityHint="Mantén presionado para editar o eliminar"
        delayLongPress={350}
        onLongPress={() => onMenu(true)}
        onPress={() => ref.current && onOpen(item, ref.current, radii)}
        style={[styles.tile, shape, { backgroundColor: item.bg }]}>
        <GarmentArt item={item} style={StyleSheet.absoluteFill} />
        <View style={[styles.tlRow, centered && styles.tlRowCenter]} pointerEvents="none">
          <View style={styles.tl}>
            <Text style={styles.tlText} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        </View>
      </Tap>
      {/* Laid over the tile as a sibling: buttons can't nest inside the tile's own button. */}
      {menuOpen && (
        <Animated.View style={[styles.menu, shape]} entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => onMenu(false)} accessibilityLabel="Cerrar opciones" />
          <MenuButton delay={0}>
            <Round label={`Eliminar ${item.name}`} bg={C.rojo} onPress={onDelete}>
              <CloseIcon color="#FFFFFF" />
            </Round>
          </MenuButton>
          <MenuButton delay={50}>
            <Round label={`Cambiar nombre de ${item.name}`} bg={C.papel} onPress={onEdit}>
              <PencilIcon color={C.tinta} />
            </Round>
          </MenuButton>
        </Animated.View>
      )}
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
  menu: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    backgroundColor: 'rgba(6,36,26,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
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
