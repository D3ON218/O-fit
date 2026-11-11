import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type HostInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlusIcon } from '@/components/icons';
import { CircleReveal, measure, RiseProvider, type Radii, type Rect, type RevealOrigin } from '@/components/motion';
import { TabBar, type TabId } from '@/components/tab-bar';
import { Tap } from '@/components/ui';
import type { Cat, Garment } from '@/data/types';
import { CaptureOverlay } from '@/screens/capture-overlay';
import { ClosetView } from '@/screens/closet-view';
import { DetailOverlay } from '@/screens/detail-overlay';
import { FavoritesOverlay } from '@/screens/favorites-overlay';
import { OutfitView } from '@/screens/outfit-view';
import { SelectorView } from '@/screens/selector-view';
import { C, SIZES, SPRING } from '@/theme';

type Overlay =
  | { type: 'detail'; item: Garment; from: Rect; radii: Radii; node: HostInstance }
  | { type: 'capture'; from: Rect }
  | { type: 'favs'; from: Rect; node: HostInstance };

const TAB_IDS: TabId[] = ['closet', 'outfit', 'sel'];

/**
 * Guards every screen-changing animation. The lock also expires on its own, so a failed
 * animation can never leave the UI frozen.
 */
function useBusy() {
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  return {
    lock() {
      if (busy.current) return false;
      busy.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => (busy.current = false), 3000);
      return true;
    },
    unlock() {
      busy.current = false;
      clearTimeout(timer.current);
    },
  };
}

export default function Main() {
  const insets = useSafeAreaInsets();
  const busy = useBusy();
  const [tab, setTab] = useState<TabId>('closet');
  const [under, setUnder] = useState<TabId | null>(null);
  const [epochs, setEpochs] = useState<Record<TabId, number>>({ closet: 0, outfit: 0, sel: 0 });
  const [origin, setOrigin] = useState<RevealOrigin | null>(null);
  const epochN = useRef(0);

  const [cat, setCat] = useState<Cat>('torso');
  const [scrollKey, setScrollKey] = useState(0);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const fab = useRef<HostInstance>(null);

  function goTab(id: TabId, from: Rect | null) {
    if (id === tab || overlay || !busy.lock()) return;
    const o = from ? { cx: from.x + from.w / 2, cy: from.y + from.h / 2, r0: from.h / 2 } : { cx: 0, cy: 0, r0: 0 };
    setOrigin(o);
    setUnder(tab);
    setTab(id);
    setEpochs((e) => ({ ...e, [id]: ++epochN.current }));
  }

  function revealDone() {
    setUnder(null);
    busy.unlock();
  }

  async function open(make: () => Promise<Overlay | null>) {
    if (overlay || !busy.lock()) return;
    const o = await make();
    if (o) setOverlay(o);
    busy.unlock();
  }

  const openDetail = (item: Garment, node: HostInstance, radii: Radii) =>
    open(async () => {
      const from = await measure({ current: node });
      return from && { type: 'detail', item, from, radii, node };
    });

  const openCapture = () =>
    open(async () => {
      const from = await measure(fab);
      return from && { type: 'capture', from };
    });

  const openFavs = (node: HostInstance) =>
    open(async () => {
      const from = await measure({ current: node });
      return from && { type: 'favs', from, node };
    });

  const closeOverlay = () => setOverlay(null);

  const views: Record<TabId, ReactNode> = {
    closet: (
      <ClosetView
        cat={cat}
        onCat={setCat}
        onOpen={openDetail}
        scrollKey={scrollKey}
      />
    ),
    outfit: <OutfitView onFavs={openFavs} />,
    sel: <SelectorView />,
  };

  return (
    <View style={styles.root}>
      {TAB_IDS.map((id) => {
        const shown = id === tab || id === under;
        return (
          <View
            key={id}
            style={[StyleSheet.absoluteFill, { zIndex: id === tab ? 2 : 1, display: shown ? 'flex' : 'none' }]}
            pointerEvents={id === tab ? 'box-none' : 'none'}>
            <CircleReveal epoch={epochs[id]} origin={origin} onDone={revealDone}>
              <RiseProvider value={epochs[id]}>{views[id]}</RiseProvider>
            </CircleReveal>
          </View>
        );
      })}

      <Fab ref={fab} visible={tab === 'closet' && overlay?.type !== 'capture'} bottom={insets.bottom + 98} onPress={openCapture} />

      <TabBar current={tab} visible={!overlay} bottom={insets.bottom + SIZES.tabBarInset} onSelect={goTab} />

      {overlay?.type === 'detail' && (
        <DetailOverlay
          item={overlay.item}
          from={overlay.from}
          radii={overlay.radii}
          back={async () => {
            const rect = await measure({ current: overlay.node });
            return rect && { rect, radii: overlay.radii };
          }}
          onClosed={closeOverlay}
        />
      )}
      {overlay?.type === 'capture' && (
        <CaptureOverlay
          from={overlay.from}
          back={() => measure(fab)}
          onSaved={(c) => {
            setCat(c);
            setScrollKey((k) => k + 1);
          }}
          onClosed={closeOverlay}
        />
      )}
      {overlay?.type === 'favs' && (
        <FavoritesOverlay from={overlay.from} back={() => measure({ current: overlay.node })} onClosed={closeOverlay} />
      )}
    </View>
  );
}

function Fab({ visible, bottom, onPress, ref }: { visible: boolean; bottom: number; onPress: () => void; ref: React.Ref<HostInstance> }) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.set(withSpring(visible ? 1 : 0, SPRING));
  }, [visible, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[styles.fabWrap, { bottom }, st]} pointerEvents={visible ? 'auto' : 'none'}>
      <Tap ref={ref} onPress={onPress} squash={0.92} style={styles.fab} accessibilityLabel="Agregar prenda">
        <PlusIcon color={C.tinta} />
      </Tap>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.menta },
  fabWrap: { position: 'absolute', right: SIZES.gutter, zIndex: 6 },
  fab: {
    width: SIZES.fab,
    height: SIZES.fab,
    borderRadius: SIZES.fab / 2,
    backgroundColor: C.lima,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 0 -2px rgba(6,36,26,0.18)',
  },
});
