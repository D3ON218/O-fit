import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition, SlideOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GarmentArt } from '@/components/garment-art';
import { CloseIcon } from '@/components/icons';
import { MorphLayer, Rise, type MorphHandle, type Rect } from '@/components/motion';
import { Mega, Round, Tap } from '@/components/ui';
import { relativeDay } from '@/data/catalog';
import { useCloset } from '@/store/closet';
import { C, EASE, F, SIZES } from '@/theme';

type Props = {
  from: Rect;
  /** The heart button, re-measured for the way back. */
  back: () => Promise<Rect | null>;
  onClosed: () => void;
};

export function FavoritesOverlay({ from, back, onClosed }: Props) {
  const insets = useSafeAreaInsets();
  const { favs, removeFav } = useCloset();
  const morph = useRef<MorphHandle>(null);
  const busy = useRef(true);

  async function close() {
    if (busy.current) return;
    busy.current = true;
    const rect = await back();
    await morph.current?.close(rect ? { rect, radii: rect.w / 2 } : null);
    onClosed();
  }

  return (
    <MorphLayer
      ref={morph}
      from={from}
      radii={from.w / 2}
      fromColor={C.bosque}
      color={C.indigo}
      duration={700}
      closeDuration={600}
      onOpened={() => (busy.current = false)}
      style={[styles.root, { paddingTop: insets.top + 34, paddingBottom: insets.bottom + 28 }]}>
      <Rise i={0} style={styles.head}>
        <Mega size={32} color={C.papel}>
          Favoritos
        </Mega>
        <Round label="Cerrar favoritos" onPress={close}>
          <CloseIcon color={C.menta} />
        </Round>
      </Rise>
      <Rise i={1} style={styles.listWrap}>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {favs.length === 0 ? (
            <Text style={styles.empty}>
              Todavía no guardas ningún outfit. Toca Me gusta cuando salga una combinación que quieras repetir.
            </Text>
          ) : (
            favs.map((f) => (
              <Animated.View
                key={f.id}
                style={styles.fav}
                exiting={SlideOutRight.duration(300)}
                layout={LinearTransition.duration(350).easing(EASE)}>
                <View style={styles.th}>
                  {f.items.map((x, i) => (
                    <View key={x.id} style={[styles.thItem, { backgroundColor: x.bg, marginLeft: i ? -14 : 0 }]}>
                      <GarmentArt item={x} scale={0.8} style={StyleSheet.absoluteFill} />
                    </View>
                  ))}
                </View>
                <View style={styles.ft}>
                  <Text style={styles.ftTitle}>Outfit guardado</Text>
                  <Text style={styles.ftWhen}>{relativeDay(f.when)}</Text>
                </View>
                <Tap onPress={() => removeFav(f.id)} squash={0.9} style={styles.x} accessibilityLabel="Quitar de favoritos">
                  <CloseIcon size={16} color={C.tinta} />
                </Tap>
              </Animated.View>
            ))
          )}
        </ScrollView>
      </Rise>
    </MorphLayer>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: SIZES.gutter, gap: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  listWrap: { flex: 1, minHeight: 0 },
  list: { gap: 10, paddingBottom: 12 },
  fav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.papel,
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 10,
  },
  th: { flexDirection: 'row' },
  thItem: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, borderColor: C.papel, overflow: 'hidden' },
  ft: { flex: 1, minWidth: 0 },
  ftTitle: { fontFamily: F.bodyHeavy, fontSize: 15, color: C.tinta },
  ftWhen: { fontFamily: F.bodySemi, fontSize: 13, color: C.tinta, opacity: 0.7 },
  x: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(6,36,26,0.1)', alignItems: 'center', justifyContent: 'center' },
  empty: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 30,
    padding: 24,
    fontFamily: F.bodySemi,
    fontSize: 16,
    lineHeight: 24,
    color: C.lila,
    overflow: 'hidden',
  },
});
