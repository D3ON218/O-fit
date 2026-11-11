import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { GarmentArt } from '@/components/garment-art';
import { TrashIcon } from '@/components/icons';
import { animate, Rise } from '@/components/motion';
import { Btn, CountPill, Mega, Tap, Txt } from '@/components/ui';
import { CATS, catName, demoPhotos, nextBg, uid } from '@/data/catalog';
import type { Cat, PendingPhoto } from '@/data/types';
import { pickMany } from '@/lib/media';
import { deletePhoto, persistPhoto } from '@/lib/photos';
import { useCloset } from '@/store/closet';
import { C, EASE, F, SIZES, SPRING } from '@/theme';

const THRESHOLD = 110;
const DEFAULT_HINT = 'Arrastra la foto o usa los botones.';

export function SelectorView() {
  const insets = useSafeAreaInsets();
  const { photos, addPhotos, dropPhoto, addItem } = useCloset();
  const [selCat, setSelCat] = useState<Cat | null>(null);
  const [done, setDone] = useState(0);
  const [hint, setHintText] = useState(DEFAULT_HINT);
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const busy = useRef(false);

  const top = photos[0];
  const next = photos[1];
  const total = done + photos.length;

  const tx = useSharedValue(0);
  const nudge = useSharedValue(0);

  useEffect(() => () => clearTimeout(hintTimer.current), []);

  // Recenter only once the next card is on screen, so the thrown one never flashes back.
  const topId = top?.id;
  useEffect(() => {
    tx.set(0);
  }, [topId, tx]);

  // The pan gesture keeps the callbacks from its first render, so decide() reads these instead.
  const selRef = useRef(selCat);
  const topRef = useRef(top);
  useEffect(() => {
    selRef.current = selCat;
    topRef.current = top;
  }, [selCat, top]);

  function setHint(t: string, ms: number) {
    setHintText(t);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintText(DEFAULT_HINT), ms);
  }

  async function decide(action: 'save' | 'trash') {
    const top = topRef.current;
    const selCat = selRef.current;
    if (busy.current || !top) return;
    if (action === 'save' && !selCat) {
      tx.set(withSpring(0, SPRING));
      nudge.set(withSequence(withTiming(-10, { duration: 110 }), withTiming(10, { duration: 220 }), withTiming(0, { duration: 110 })));
      setHint('Elige primero una categoría para guardarla.', 2200);
      return;
    }
    busy.current = true;
    try {
      const dir = action === 'save' ? 1 : -1;
      await animate(tx, dir * 540, 440);
      if (action === 'save' && selCat) {
        addItem({
          id: uid(),
          name: `${catName(selCat)} importado`,
          cat: selCat,
          kind: top.kind,
          fill: top.fill,
          bg: top.bg,
          imageUri: top.imageUri,
          createdAt: Date.now(),
        });
        setHint(`Guardada en ${catName(selCat)}.`, 2200);
      } else {
        deletePhoto(top.imageUri);
        setHint('Foto borrada.', 1800);
      }
      dropPhoto(top.id);
      setDone((d) => d + 1);
      setSelCat(null);
    } finally {
      busy.current = false;
    }
  }

  async function importMore() {
    const uris = await pickMany();
    if (!uris.length) return;
    const list: PendingPhoto[] = [];
    for (const u of uris) {
      let imageUri = u;
      try {
        imageUri = await persistPhoto(u);
      } catch {
        // Keep the original URI; it still works for this session.
      }
      list.push({ id: uid('p'), name: 'Importada hoy', kind: 'tee', fill: '#FFFFFF', bg: nextBg(), imageUri });
    }
    addPhotos(list);
  }

  const pan = usePanGesture({
    activeOffsetX: [-8, 8],
    onUpdate: (e) => {
      'worklet';
      tx.set(e.translationX);
    },
    onDeactivate: () => {
      'worklet';
      const x = tx.get();
      if (x > THRESHOLD) scheduleOnRN(decide, 'save');
      else if (x < -THRESHOLD) scheduleOnRN(decide, 'trash');
      else tx.set(withSpring(0, SPRING));
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(tx.value), [300, 540], [1, 0], 'clamp'),
    transform: [{ translateX: tx.value }, { rotate: `${tx.value / 18}deg` }],
  }));
  const okStyle = useAnimatedStyle(() => ({ opacity: interpolate(tx.value, [0, THRESHOLD], [0, 1], 'clamp') }));
  const noStyle = useAnimatedStyle(() => ({ opacity: interpolate(tx.value, [-THRESHOLD, 0], [1, 0], 'clamp') }));
  const chipsStyle = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.value }] }));

  return (
    <View style={[styles.root, { paddingTop: insets.top + 34, paddingBottom: insets.bottom + 122 }]}>
      <Rise i={0} style={styles.head}>
        <Mega size={40} color={C.papel}>
          Selector
        </Mega>
        <CountPill label={top ? `${done + 1}/${total}` : `${total}/${total}`} bg={C.lima} color={C.tinta} />
      </Rise>

      {top ? (
        <>
          <Rise i={1} style={styles.deck}>
            {next && (
              <View style={[styles.card, styles.next, { backgroundColor: next.bg }]}>
                <GarmentArt item={next} scale={0.56} style={StyleSheet.absoluteFill} />
              </View>
            )}
            <GestureDetector gesture={pan}>
              <Animated.View key={top.id} style={[styles.card, { backgroundColor: top.bg }, cardStyle]}>
                <Promote>
                  <GarmentArt item={top} scale={0.56} style={StyleSheet.absoluteFill} />
                  <View style={styles.ctag}>
                    <Text style={styles.ctagText}>{top.name}</Text>
                  </View>
                  <Animated.View style={[styles.stamp, styles.ok, okStyle]}>
                    <Text style={styles.stampText}>Guardar</Text>
                  </Animated.View>
                  <Animated.View style={[styles.stamp, styles.no, noStyle]}>
                    <Text style={styles.stampText}>Borrar</Text>
                  </Animated.View>
                </Promote>
              </Animated.View>
            </GestureDetector>
          </Rise>

          <Rise i={2}>
            <Animated.View style={[styles.chips, chipsStyle]}>
              {CATS.map((c) => (
                <Chip key={c.id} label={c.name} on={selCat === c.id} onPress={() => setSelCat(c.id)} />
              ))}
            </Animated.View>
          </Rise>

          <Rise i={3} style={styles.selact}>
            <Tap onPress={() => decide('trash')} squash={0.92} style={styles.trash} accessibilityLabel="Borrar foto">
              <TrashIcon color={C.tinta} />
            </Tap>
            <Btn
              label={selCat ? `Guardar en ${catName(selCat)}` : 'Elige una categoría'}
              onPress={() => decide('save')}
              disabled={!selCat}
              style={[styles.save, !selCat && styles.saveOff]}
              textStyle={!selCat && styles.saveOffText}
            />
          </Rise>
          <Txt style={styles.hint}>{hint}</Txt>
        </>
      ) : (
        <View style={styles.empty}>
          <Mega size={34} color={C.papel}>
            {'Todo\nclasificado'}
          </Mega>
          <Txt style={styles.emptyText}>
            Ya no quedan fotos por revisar. Importa más desde tu galería para ampliar tu clóset.
          </Txt>
          <Btn label="Importar de la galería" onPress={importMore} />
          <Tap onPress={() => addPhotos(demoPhotos())} style={styles.link}>
            <Text style={styles.linkText}>Cargar fotos de ejemplo</Text>
          </Tap>
        </View>
      )}
    </View>
  );
}

/** The card behind springs forward when it becomes the top one. */
function Promote({ children }: { children: React.ReactNode }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withSpring(1, SPRING));
  }, [t]);
  const st = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + 0.08 * t.value }, { translateY: 16 * (1 - t.value) }],
  }));
  return <Animated.View style={[StyleSheet.absoluteFill, styles.promote, st]}>{children}</Animated.View>;
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const t = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    t.set(withTiming(on ? 1 : 0, { duration: 550, easing: EASE }));
  }, [on, t]);
  const st = useAnimatedStyle(() => ({ flexGrow: 1 + t.value }));
  return (
    <Animated.View style={[styles.chipWrap, st]}>
      <Tap
        onPress={onPress}
        squash={0.95}
        accessibilityState={{ selected: on }}
        style={[styles.chip, { backgroundColor: on ? C.sol : 'rgba(255,255,255,0.14)' }]}>
        <Text style={[styles.chipText, { color: on ? C.tinta : C.papel }]} numberOfLines={1}>
          {label}
        </Text>
      </Tap>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.indigo, paddingHorizontal: SIZES.gutter, gap: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  deck: { flex: 1, minHeight: 250 },
  card: {
    ...StyleSheet.absoluteFill,
    borderTopLeftRadius: 150,
    borderTopRightRadius: 150,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  next: { transform: [{ scale: 0.92 }, { translateY: 16 }] },
  promote: { alignItems: 'center', justifyContent: 'center' },
  ctag: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: C.bosque,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ctagText: { fontFamily: F.bodyBold, fontSize: 12, color: C.menta },
  stamp: { position: 'absolute', top: '30%', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 10 },
  ok: { right: 14, backgroundColor: C.lima },
  no: { left: 14, backgroundColor: C.rosa },
  stampText: { fontFamily: F.display, fontSize: 18, letterSpacing: -0.4, textTransform: 'uppercase', color: C.tinta },
  chips: { flexDirection: 'row', gap: 8 },
  chipWrap: { flexBasis: 0, minWidth: 0 },
  chip: { height: 48, borderRadius: 99, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  chipText: { fontFamily: F.bodyHeavy, fontSize: 14 },
  selact: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  trash: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.rosa, alignItems: 'center', justifyContent: 'center' },
  save: { flex: 1 },
  saveOff: { backgroundColor: 'rgba(255,255,255,0.18)' },
  saveOffText: { color: C.lila },
  hint: { fontFamily: F.bodySemi, fontSize: 14, color: C.lila, minHeight: 20, textAlign: 'center' },
  empty: { flex: 1, justifyContent: 'center', gap: 16 },
  emptyText: { fontFamily: F.bodySemi, fontSize: 17, lineHeight: 25, color: C.lila },
  link: { alignSelf: 'center', padding: 12 },
  linkText: { fontFamily: F.bodyBold, fontSize: 15, color: C.lila, textDecorationLine: 'underline' },
});
