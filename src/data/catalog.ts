import { PALETTE } from '@/theme';

import type { Cat, FavOutfit, Garment, Kind, PendingPhoto } from './types';

export const CATS: { id: Cat; name: string; icon: Kind; help: string }[] = [
  { id: 'torso', name: 'Torso', icon: 'tee', help: 'Camisetas, suéteres, casacas' },
  { id: 'piernas', name: 'Piernas', icon: 'pants', help: 'Pantalones, faldas, shorts' },
  { id: 'calzado', name: 'Calzado', icon: 'sneaker', help: 'Tenis, mocasines, botas' },
];

export const KINDS: Record<Cat, Kind[]> = {
  torso: ['tee', 'sweater', 'jacket'],
  piernas: ['pants', 'skirt', 'shorts'],
  calzado: ['sneaker', 'boot', 'loafer'],
};

export const FILLS = [
  '#E8D3B0', '#7FA6DC', '#FFFFFF', '#C9A37A', '#98B896', '#B8805A',
  '#5E86C4', '#4A4F55', '#7A4B2A', '#F6EEDC', '#232323', '#C8603A',
];

export const catName = (id: Cat) => CATS.find((c) => c.id === id)!.name;

export const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

let uidN = 0;
export const uid = (p = 'i') => `${p}${Date.now().toString(36)}${(uidN++).toString(36)}`;

let palN = 0;
export const nextBg = () => PALETTE[palN++ % PALETTE.length];

const mk = (cat: Cat, kind: Kind, name: string, fill: string): Garment => ({
  id: uid(),
  cat,
  kind,
  name,
  fill,
  bg: nextBg(),
  createdAt: Date.now(),
});

export function seedItems(): Garment[] {
  return [
    mk('torso', 'sweater', 'Cardigan beige', '#E8D3B0'),
    mk('torso', 'jacket', 'Casaca de mezclilla', '#7FA6DC'),
    mk('torso', 'tee', 'Camiseta básica', '#FFFFFF'),
    mk('torso', 'sweater', 'Suéter de lana', '#C9A37A'),
    mk('torso', 'tee', 'Playera salvia', '#98B896'),
    mk('piernas', 'pants', 'Pantalón de lino', '#B8805A'),
    mk('piernas', 'pants', 'Jeans vintage', '#5E86C4'),
    mk('piernas', 'skirt', 'Falda tableada', '#4A4F55'),
    mk('piernas', 'shorts', 'Short de mezclilla', '#7FA6DC'),
    mk('calzado', 'sneaker', 'Zapatillas retro', '#FFFFFF'),
    mk('calzado', 'loafer', 'Mocasines de cuero', '#7A4B2A'),
    mk('calzado', 'boot', 'Botines Chelsea', '#232323'),
  ];
}

const DAY = 86_400_000;

export function seedFavs(items: Garment[]): FavOutfit[] {
  return [
    { id: uid('f'), when: Date.now() - DAY, items: [items[0], items[6], items[9]] },
    { id: uid('f'), when: Date.now() - 3 * DAY, items: [items[1], items[7], items[11]] },
  ];
}

export function demoPhotos(): PendingPhoto[] {
  return (
    [
      { kind: 'tee', fill: '#F6EEDC', name: 'Importada hoy' },
      { kind: 'jacket', fill: '#7A4B2A', name: 'Importada hace 2 días' },
      { kind: 'pants', fill: '#232323', name: 'Importada hace 2 días' },
      { kind: 'sneaker', fill: '#C8603A', name: 'Importada hace 3 días' },
      { kind: 'skirt', fill: '#98B896', name: 'Importada hace 5 días' },
      { kind: 'sweater', fill: '#4A4F55', name: 'Importada hace 1 semana' },
    ] as const
  ).map((p) => ({ ...p, id: uid('p'), bg: nextBg() }));
}

/** "Hoy", "Ayer", "Hace 3 días"… */
export function relativeDay(ts: number) {
  const days = Math.floor((startOfDay(Date.now()) - startOfDay(ts)) / DAY);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  const w = Math.floor(days / 7);
  return w === 1 ? 'Hace 1 semana' : `Hace ${w} semanas`;
}

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
