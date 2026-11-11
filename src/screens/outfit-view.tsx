import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type HostInstance } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GarmentArt } from '@/components/garment-art';
import { HeartIcon, ShuffleIcon } from '@/components/icons';
import { animate, measure, Rise, wait } from '@/components/motion';
import { Btn, Mega, Pill, Round, Tap } from '@/components/ui';
import { CATS, pick } from '@/data/catalog';
import type { Garment } from '@/data/types';
import { useCloset } from '@/store/closet';
import { C, F, PALETTE, SIZES, SPRING } from '@/theme';

const SLAB_BG = [C.lima, C.sol, C.lila];
const SLAB_FLEX = [1.25, 1.4, 1];
const BLOB = 224;

type Shown = { item: Garment; bg: string } | null;

export function OutfitView({ onFavs }: { onFavs: (node: HostInstance) => void }) {
  const insets = useSafeAreaInsets();
  const { items, favs, addFav } = useCloset();
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [generated, setGenerated] = useState(false);
  const [outfit, setOutfit] = useState<Garment[] | null>(null);
  const [shown, setShown] = useState<Shown[]>([null, null, null]);
  const [pops, setPops] = useState([0, 0, 0]);
  const [rolling, setRolling] = useState(false);
  const [liked, setLiked] = useState(false);
  const [flying, setFlying] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const favRef = useRef<HostInstance>(null);
  const likeRef = useRef<HostInstance>(null);

  const missing = CATS.filter((c) => !items.some((i) => i.cat === c.id));
  const canGen = missing.length === 0;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // A garment deleted from the closet can't stay on screen.
  const valid = !!outfit && outfit.every((o) => items.some((i) => i.id === o.id));

  /* ----- blob: morphs into the slab stack ----- */
  const m = useSharedValue(0);
  const idle = useSharedValue(0);
  const shake = useSharedValue(0);
  const split = useSharedValue(0);
  useEffect(() => {
    idle.set(withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [idle]);

  const blobStyle = useAnimatedStyle(() => {
    const w = area?.w ?? BLOB;
    const h = area?.h ?? BLOB;
    const t = m.value;
    const wob = (1 - t) * idle.value * (canGen ? 1 : 0);
    const R = BLOB / 2;
    const r = interpolate(t, [0, 1], [R, 40]);
    return {
      left: ((w - BLOB) / 2) * (1 - t),
      top: ((h - BLOB) / 2) * (1 - t),
      width: BLOB + (w - BLOB) * t,
      height: BLOB + (h - BLOB) * t,
      borderTopLeftRadius: r * (1 + 0.16 * wob),
      borderTopRightRadius: r * (1 - 0.16 * wob),
      borderBottomRightRadius: r * (1 - 0.08 * wob),
      borderBottomLeftRadius: r * (1 + 0.08 * wob),
      transform: [{ translateX: shake.value }],
    };
  });

  function roll() {
    if (rolling || !canGen) return;
    setRolling(true);
    setLiked(false);
    const next = CATS.map((c, i) => {
      const pool = items.filter((x) => x.cat === c.id);
      const opts = pool.filter((x) => !outfit?.[i] || x.id !== outfit[i].id);
      return pick(opts.length ? opts : pool);
    });
    setOutfit(next);
    let left = 3;
    CATS.forEach((c, i) => {
      const pool = items.filter((x) => x.cat === c.id);
      const n = 8 + i * 5;
      for (let k = 1; k <= n; k++) {
        timers.current.push(
          setTimeout(() => {
            const fin = k === n;
            setShown((s) => s.map((v, j) => (j === i ? { item: fin ? next[i] : pick(pool), bg: fin ? SLAB_BG[i] : pick(PALETTE) } : v)));
            if (fin) {
              setPops((p) => p.map((v, j) => (j === i ? v + 1 : v)));
              if (--left === 0) setRolling(false);
            }
          }, k * 70),
        );
      }
    });
  }

  async function sortear() {
    if (generated || busy.current) return;
    if (!canGen) {
      shake.set(withSequence(withTiming(-10, { duration: 110 }), withTiming(10, { duration: 220 }), withTiming(0, { duration: 110 })));
      return;
    }
    busy.current = true;
    await animate(m, 1, 720);
    setGenerated(true);
    await wait(30);
    await animate(split, 1, 600);
    busy.current = false;
    await wait(100);
    roll();
  }

  async function like() {
    if (liked || rolling || !outfit || !valid) return;
    setLiked(true);
    addFav(outfit);
    const [a, b] = await Promise.all([measure(likeRef), measure(favRef)]);
    if (a && b) {
      const x = a.x + a.w / 2 - 22;
      const y = a.y + a.h / 2 - 22;
      setFlying({ x, y, dx: b.x + b.w / 2 - 22 - x, dy: b.y + b.h / 2 - 22 - y });
    }
  }

  const onArea = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea((a) => (a && a.w === width && a.h === height ? a : { w: width, h: height }));
  };


  return (
    <View style={[styles.root, { paddingTop: insets.top + 34, paddingBottom: insets.bottom + 122 }]}>
      <Rise i={0} style={styles.head}>
        <Mega color={C.tinta}>{'Tu\noutfit'}</Mega>
        <FavButton ref={favRef} count={favs.length} bump={flying === null ? favs.length : -1} onPress={() => favRef.current && onFavs(favRef.current)} />
      </Rise>

      <Rise i={1} style={styles.area}>
        <View style={StyleSheet.absoluteFill} onLayout={onArea}>
          {generated ? (
            <View style={styles.stack}>
              {CATS.map((c, i) => (
                <Slab key={c.id} index={i} split={split} shown={valid || rolling ? shown[i] : null} pop={pops[i]} catName={c.name} />
              ))}
            </View>
          ) : (
            area && (
              <Animated.View style={[styles.blob, { backgroundColor: canGen ? C.lima : 'rgba(6,36,26,0.14)' }, blobStyle]}>
                <Tap onPress={sortear} squash={0.96} style={styles.blobTap} accessibilityLabel="Sortear outfit">
                  <Text style={styles.blobTitle}>{canGen ? 'Sortear' : 'Faltan prendas'}</Text>
                  <Text style={styles.blobSub}>{canGen ? 'una de cada tipo' : 'Agrega torso, piernas y calzado'}</Text>
                </Tap>
              </Animated.View>
            )
          )}
        </View>
      </Rise>

      {generated && missing.length > 0 && (
        <Text style={styles.warn}>
          Te falta {missing.map((x) => x.name.toLowerCase()).join(' y ')}. Agrégalo desde el clóset para seguir sorteando.
        </Text>
      )}
      {generated && outfit && !valid && canGen && !rolling && <Text style={styles.warn}>Esa prenda ya no está. Toca Cambiar para sortear otra vez.</Text>}

      {generated && (
        <Rise i={0} style={styles.ctl}>
          <Btn
            ref={likeRef}
            label={liked ? 'Guardado' : 'Me gusta'}
            variant={liked ? 'dark' : 'white'}
            onPress={like}
            style={styles.likeBtn}
            icon={(c) => <HeartIcon size={20} color={c} filled={liked} />}
          />
          <Btn
            label="Cambiar"
            variant="dark"
            onPress={roll}
            disabled={!canGen}
            style={[styles.chgBtn, !canGen && styles.off]}
            icon={(c) => <ShuffleIcon color={c} />}
          />
        </Rise>
      )}

      {flying && <FlyingHeart {...flying} onDone={() => setFlying(null)} />}
    </View>
  );
}

function Slab({ index, split, shown, pop, catName }: { index: number; split: SharedValue<number>; shown: Shown; pop: number; catName: string }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (pop) s.set(withSequence(withTiming(1.05, { duration: 0 }), withSpring(1, SPRING)));
  }, [pop, s]);

  const st = useAnimatedStyle(() => {
    const t = split.value;
    const base = {
      flexGrow: SLAB_FLEX[index],
      marginBottom: index < 2 ? 10 * t : 0,
      transform: [{ scale: s.value }],
    };
    if (index === 0)
      return { ...base, marginRight: 34 * t, borderTopLeftRadius: 40 + 20 * t, borderTopRightRadius: 40 + 20 * t, borderBottomLeftRadius: 26 * t, borderBottomRightRadius: 26 * t };
    if (index === 1) return { ...base, marginHorizontal: 14 * t, borderRadius: 28 * t };
    return { ...base, marginLeft: 34 * t, borderTopLeftRadius: 50 * t, borderTopRightRadius: 50 * t, borderBottomLeftRadius: 40 + 10 * t, borderBottomRightRadius: 40 + 10 * t };
  });

  return (
    <Animated.View style={[styles.slab, { backgroundColor: shown?.bg ?? C.lima }, st]}>
      {shown && (
        <>
          <View style={styles.sart}>
            <GarmentArt item={shown.item} scale={0.88} style={StyleSheet.absoluteFill} />
          </View>
          <View style={styles.stxt}>
            <Pill label={catName} />
            <Text style={styles.sname} numberOfLines={2}>
              {shown.item.name}
            </Text>
          </View>
        </>
      )}
    </Animated.View>
  );
}

function FavButton({ count, bump, onPress, ref }: { count: number; bump: number; onPress: () => void; ref: React.Ref<HostInstance> }) {
  const s = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (bump < 0) return;
    if (first.current) {
      first.current = false;
      return;
    }
    s.set(withSequence(withTiming(1.25, { duration: 180 }), withSpring(1, SPRING)));
  }, [bump, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={st}>
      <Round ref={ref} label="Ver favoritos" onPress={onPress}>
        <HeartIcon color={C.menta} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      </Round>
    </Animated.View>
  );
}

function FlyingHeart({ x, y, dx, dy, onDone }: { x: number; y: number; dx: number; dy: number; onDone: () => void }) {
  const t = useSharedValue(0);
  useEffect(() => {
    animate(t, 1, 700).then(onDone);
    // Flies once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateX: dx * t.value }, { translateY: dy * t.value }, { scale: 1 - 0.2 * t.value }],
  }));
  return (
    <Animated.View style={[styles.fly, { left: x, top: y }, st]} pointerEvents="none">
      <HeartIcon size={20} color="#FFFFFF" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.rosa, paddingHorizontal: SIZES.gutter, gap: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  area: { flex: 1, minHeight: 330 },
  blob: { position: 'absolute', overflow: 'hidden' },
  blobTap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 24 },
  blobTitle: { fontFamily: F.display, fontSize: 30, letterSpacing: -1.2, textTransform: 'uppercase', color: C.tinta, textAlign: 'center' },
  blobSub: { fontFamily: F.bodyBold, fontSize: 14, lineHeight: 18, color: C.tinta, textAlign: 'center' },
  stack: { flex: 1 },
  slab: {
    flexBasis: 0,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 22,
    overflow: 'hidden',
  },
  sart: { height: '100%', aspectRatio: 1, borderRadius: 999, overflow: 'hidden' },
  stxt: { flex: 1, gap: 6, alignItems: 'flex-start' },
  sname: { fontFamily: F.bodyHeavy, fontSize: 19, lineHeight: 22, color: C.tinta },
  warn: { fontFamily: F.bodyBold, fontSize: 15, lineHeight: 21, color: C.tinta },
  ctl: { flexDirection: 'row', gap: 10 },
  likeBtn: { flex: 1, paddingHorizontal: 12 },
  chgBtn: { flex: 1.3 },
  off: { opacity: 0.45 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 99,
    backgroundColor: C.lima,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { fontFamily: F.bodyHeavy, fontSize: 12, color: C.tinta },
  fly: {
    position: 'absolute',
    zIndex: 40,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.rojo,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
