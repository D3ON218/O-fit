import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';

import { uid } from '@/data/catalog';
import type { Closet, FavOutfit, Garment, PendingPhoto, Prefs, Profile } from '@/data/types';
import { deletePhoto } from '@/lib/photos';
import { PALETTE } from '@/theme';

const KEY = 'ofit:v2';
const LEGACY_KEY = 'ofit:v1';

type Root = {
  profiles: Profile[];
  closets: Record<string, Closet>;
  current: string | null;
  prefs: Prefs;
  seenSplash: boolean;
  /** Garments saved before profiles existed; the first profile created adopts them. */
  legacy?: Closet;
};

const EMPTY: Closet = { items: [], favs: [], photos: [] };

const fresh = (): Root => ({
  profiles: [],
  closets: {},
  current: null,
  prefs: { askProfileOnOpen: false, cameraSound: true },
  seenSplash: false,
});

type NewProfile = { name: string; photoUri?: string };

type Store = Closet & {
  ready: boolean;
  profiles: Profile[];
  profile: Profile | null;
  prefs: Prefs;
  seenSplash: boolean;
  /** Where the app should land when it starts. */
  entry: () => Href;

  createProfile: (p: NewProfile) => string;
  updateProfile: (id: string, patch: Partial<Pick<Profile, 'name' | 'photoUri'>>) => void;
  deleteProfile: (id: string) => void;
  selectProfile: (id: string) => void;
  signOut: () => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  markSplashSeen: () => void;

  addItem: (g: Garment) => void;
  updateItem: (id: string, patch: Partial<Pick<Garment, 'name'>>) => void;
  removeItem: (id: string) => void;
  clearCloset: () => void;
  addFav: (items: Garment[], name?: string) => void;
  removeFav: (id: string) => void;
  addPhotos: (p: PendingPhoto[]) => void;
  dropPhoto: (id: string) => void;
};

const Ctx = createContext<Store | null>(null);

function deleteClosetFiles(c: Closet) {
  c.items.forEach((i) => deletePhoto(i.imageUri));
  c.photos.forEach((p) => deletePhoto(p.imageUri));
}

export function ClosetProvider({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<Root>(fresh);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          setRoot({ ...fresh(), ...(JSON.parse(raw) as Root) });
          return;
        }
        const old = await AsyncStorage.getItem(LEGACY_KEY);
        if (old) setRoot({ ...fresh(), seenSplash: true, legacy: JSON.parse(old) as Closet });
      } catch {
        // Unreadable storage: start clean rather than crash.
      }
    })().finally(() => {
      loaded.current = true;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(root)).catch(() => {});
  }, [root]);

  const profile = root.profiles.find((p) => p.id === root.current) ?? null;
  const closet = (profile && root.closets[profile.id]) || EMPTY;

  /** Applies a change to the signed-in profile's closet. */
  const edit = (fn: (c: Closet) => Closet) =>
    setRoot((r) => (r.current ? { ...r, closets: { ...r.closets, [r.current]: fn(r.closets[r.current] ?? EMPTY) } } : r));

  const store: Store = {
    ...closet,
    ready,
    profiles: root.profiles,
    profile,
    prefs: root.prefs,
    seenSplash: root.seenSplash,
    entry: () => (!profile || root.prefs.askProfileOnOpen ? '/perfiles' : '/main'),

    createProfile: ({ name, photoUri }) => {
      const id = uid('u');
      setRoot((r) => {
        const p: Profile = { id, name, photoUri, color: PALETTE[r.profiles.length % PALETTE.length], createdAt: Date.now() };
        const c = r.legacy ?? { ...EMPTY };
        return { ...r, profiles: [...r.profiles, p], closets: { ...r.closets, [id]: c }, current: id, legacy: undefined };
      });
      return id;
    },
    updateProfile: (id, patch) =>
      setRoot((r) => ({
        ...r,
        profiles: r.profiles.map((p) => {
          if (p.id !== id) return p;
          if ('photoUri' in patch && patch.photoUri !== p.photoUri) deletePhoto(p.photoUri);
          return { ...p, ...patch };
        }),
      })),
    deleteProfile: (id) =>
      setRoot((r) => {
        const p = r.profiles.find((x) => x.id === id);
        deletePhoto(p?.photoUri);
        if (r.closets[id]) deleteClosetFiles(r.closets[id]);
        const closets = { ...r.closets };
        delete closets[id];
        return { ...r, profiles: r.profiles.filter((x) => x.id !== id), closets, current: r.current === id ? null : r.current };
      }),
    selectProfile: (id) => setRoot((r) => ({ ...r, current: id })),
    signOut: () => setRoot((r) => ({ ...r, current: null })),
    setPrefs: (patch) => setRoot((r) => ({ ...r, prefs: { ...r.prefs, ...patch } })),
    markSplashSeen: () => setRoot((r) => (r.seenSplash ? r : { ...r, seenSplash: true })),

    addItem: (g) => edit((c) => ({ ...c, items: [g, ...c.items] })),
    updateItem: (id, patch) =>
      edit((c) => ({
        ...c,
        items: c.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        // Saved outfits hold copies of their garments; keep their names in step.
        favs: c.favs.map((f) => ({ ...f, items: f.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      })),
    removeItem: (id) =>
      edit((c) => {
        deletePhoto(c.items.find((i) => i.id === id)?.imageUri);
        // A favorite with a missing garment can no longer be shown whole.
        return {
          ...c,
          items: c.items.filter((i) => i.id !== id),
          favs: c.favs.filter((f) => !f.items.some((i) => i.id === id)),
        };
      }),
    clearCloset: () =>
      edit((c) => {
        deleteClosetFiles(c);
        return { items: [], favs: [], photos: [] };
      }),
    addFav: (items, name) =>
      edit((c) => {
        const fav: FavOutfit = { id: uid('f'), name, when: Date.now(), items };
        return { ...c, favs: [fav, ...c.favs] };
      }),
    removeFav: (id) => edit((c) => ({ ...c, favs: c.favs.filter((f) => f.id !== id) })),
    addPhotos: (p) => edit((c) => ({ ...c, photos: [...c.photos, ...p] })),
    dropPhoto: (id) => edit((c) => ({ ...c, photos: c.photos.filter((p) => p.id !== id) })),
  };

  return <Ctx value={store}>{children}</Ctx>;
}

export function useCloset() {
  const s = use(Ctx);
  if (!s) throw new Error('useCloset must be used inside ClosetProvider');
  return s;
}
