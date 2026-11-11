import { Easing } from 'react-native-reanimated';

export const C = {
  lima: '#8FD400',
  rosa: '#FF8FC7',
  sol: '#EFFF54',
  naranja: '#FF8A3D',
  lila: '#CFC2FF',
  cielo: '#8ED8FF',
  bosque: '#0E3B2E',
  tinta: '#06241A',
  menta: '#C8F2CF',
  papel: '#F2FFF0',
  indigo: '#3B00E8',
  rojo: '#FF3B5C',
  camara: '#08241A',
} as const;

/** Tile backgrounds rotate through this palette, like the prototype's PAL. */
export const PALETTE = [C.lima, C.rosa, C.sol, C.naranja, C.lila, C.cielo];

export const F = {
  display: 'Unbounded_900Black',
  displayBold: 'Unbounded_700Bold',
  body: 'Figtree_500Medium',
  bodySemi: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
  bodyHeavy: 'Figtree_800ExtraBold',
} as const;

/** Reference canvas from the Canva design. */
export const SIZES = {
  button: 56,
  buttonBig: 64,
  round: 52,
  fab: 68,
  tabBarHeight: 66,
  tabBarInset: 14,
  gutter: 20,
} as const;

/** The prototype's cubic-bezier(.76,0,.24,1). */
export const EASE = Easing.bezier(0.76, 0, 0.24, 1);
export const SPRING = { damping: 16, stiffness: 140, mass: 1 } as const;
export const SOFT_SPRING = { damping: 22, stiffness: 120, mass: 1 } as const;
