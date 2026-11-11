import { PALETTE } from '@/theme';

import type { Cat, Kind } from './types';

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

const DAY = 86_400_000;

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
