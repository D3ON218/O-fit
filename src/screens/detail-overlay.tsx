import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GarmentArt } from '@/components/garment-art';
import { CloseIcon } from '@/components/icons';
import { MorphLayer, Rise, type MorphHandle, type Radii, type Rect } from '@/components/motion';
import { Btn, Mega, Pill, Round, Txt } from '@/components/ui';
import { catName, relativeDay } from '@/data/catalog';
import type { Garment } from '@/data/types';
import { useCloset } from '@/store/closet';
import { C, EASE, F, SIZES } from '@/theme';

type Props = {
  item: Garment;
  from: Rect;
  radii: Radii;
  /** Where to shrink back to: the tile, re-measured in case the grid moved. */
  back: () => Promise<{ rect: Rect; radii: Radii } | null>;
  onClosed: () => void;
};

export function DetailOverlay({ item, from, radii, back, onClosed }: Props) {
  const morph = useRef<MorphHandle>(null);
  const busy = useRef(true);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { removeItem } = useCloset();
  const [ask, setAsk] = useState(false);

  async function close(remove = false) {
    if (busy.current) return;
    busy.current = true;
    // A deleted garment has no tile left to return to, so it folds into the middle.
    const to = remove ? { rect: { x: width / 2 - 30, y: height / 2 - 30, w: 60, h: 60 }, radii: 30 } : await back();
    await morph.current?.close(to);
    if (remove) removeItem(item.id);
    onClosed();
  }

  return (
    <MorphLayer
      ref={morph}
      from={from}
      radii={radii}
      color={item.bg}
      duration={680}
      closeDuration={600}
      onOpened={() => (busy.current = false)}
      style={[styles.root, { paddingTop: insets.top + 34, paddingBottom: insets.bottom + 28 }]}>
      <Rise i={0}>
        <Round label="Cerrar" onPress={() => close()}>
          <CloseIcon color={C.menta} />
        </Round>
      </Rise>
      <Rise i={1} style={styles.art}>
        <GarmentArt item={item} scale={0.74} style={StyleSheet.absoluteFill} />
      </Rise>
      <Rise i={2} style={styles.info}>
        <Pill label={catName(item.cat)} />
        <Mega size={30} color={C.tinta}>
          {item.name}
        </Mega>
        <Txt style={styles.meta}>
          {item.imageUri ? 'Foto guardada en tu teléfono' : 'Ilustración de ejemplo'} · {relativeDay(item.createdAt)}
        </Txt>
      </Rise>
      <Rise i={3}>
        <DeleteRow ask={ask} onAsk={() => setAsk(true)} onCancel={() => setAsk(false)} onConfirm={() => close(true)} />
      </Rise>
    </MorphLayer>
  );
}

/** "Eliminar prenda" turns red and makes room for "Mejor no" before anything is deleted. */
function DeleteRow({ ask, onAsk, onCancel, onConfirm }: { ask: boolean; onAsk: () => void; onCancel: () => void; onConfirm: () => void }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(ask ? 1 : 0, { duration: 500, easing: EASE }));
  }, [ask, t]);
  const no = useAnimatedStyle(() => ({ flexGrow: t.value, opacity: t.value, marginRight: 8 * t.value }));
  return (
    <View style={styles.row}>
      <Animated.View style={[styles.noWrap, no]} pointerEvents={ask ? 'auto' : 'none'}>
        <Btn label="Mejor no" variant="ghost" onPress={onCancel} style={styles.fill} />
      </Animated.View>
      <View style={[styles.goWrap, ask && styles.goAsk]}>
        <Btn
          label={ask ? 'Sí, eliminar' : 'Eliminar prenda'}
          variant={ask ? 'danger' : 'dark'}
          onPress={ask ? onConfirm : onAsk}
          style={styles.fill}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: SIZES.gutter, gap: 14 },
  art: { flex: 1, minHeight: 0, borderRadius: 36, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.22)' },
  info: { gap: 10, alignItems: 'flex-start' },
  meta: { fontFamily: F.bodySemi, fontSize: 15, color: C.tinta, opacity: 0.8 },
  row: { flexDirection: 'row' },
  noWrap: { flexBasis: 0, overflow: 'hidden' },
  goWrap: { flexGrow: 1, flexBasis: 0 },
  goAsk: { flexGrow: 1.4 },
  fill: { alignSelf: 'stretch' },
});
