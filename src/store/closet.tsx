import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';

import { demoPhotos, seedFavs, seedItems, uid } from '@/data/catalog';
import type { FavOutfit, Garment, PendingPhoto } from '@/data/types';
import { deletePhoto } from '@/lib/photos';

const KEY = 'ofit:v1';

type Data = { items: Garment[]; favs: FavOutfit[]; photos: PendingPhoto[] };

type Store = Data & {
  ready: boolean;
  addItem: (g: Garment) => void;
  removeItem: (id: string) => void;
  addFav: (items: Garment[]) => void;
  removeFav: (id: string) => void;
  addPhotos: (p: PendingPhoto[]) => void;
  dropPhoto: (id: string) => void;
};

const Ctx = createContext<Store | null>(null);

function initial(): Data {
  const items = seedItems();
  return { items, favs: seedFavs(items), photos: demoPhotos() };
}

export function ClosetProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>({ items: [], favs: [], photos: [] });
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => setData(raw ? (JSON.parse(raw) as Data) : initial()))
      .catch(() => setData(initial()))
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);

  const store: Store = {
    ...data,
    ready,
    addItem: (g) => setData((d) => ({ ...d, items: [g, ...d.items] })),
    removeItem: (id) =>
      setData((d) => {
        deletePhoto(d.items.find((i) => i.id === id)?.imageUri);
        // A favorite with a missing garment can no longer be shown whole.
        return {
          ...d,
          items: d.items.filter((i) => i.id !== id),
          favs: d.favs.filter((f) => !f.items.some((i) => i.id === id)),
        };
      }),
    addFav: (items) => setData((d) => ({ ...d, favs: [{ id: uid('f'), when: Date.now(), items }, ...d.favs] })),
    removeFav: (id) => setData((d) => ({ ...d, favs: d.favs.filter((f) => f.id !== id) })),
    addPhotos: (p) => setData((d) => ({ ...d, photos: [...d.photos, ...p] })),
    dropPhoto: (id) => setData((d) => ({ ...d, photos: d.photos.filter((p) => p.id !== id) })),
  };

  return <Ctx value={store}>{children}</Ctx>;
}

export function useCloset() {
  const s = use(Ctx);
  if (!s) throw new Error('useCloset must be used inside ClosetProvider');
  return s;
}
