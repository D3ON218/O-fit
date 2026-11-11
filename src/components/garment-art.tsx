import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Kind } from '@/data/types';
import { C } from '@/theme';

/** Fill slot of each path: the garment color, the white sole, or an outline only. */
type Part = { d: string; fill: 'main' | 'sole' | 'none' };

/** Same paths as the prototype's SHAPES (viewBox 0 0 100 100). */
export const SHAPES: Record<Kind, Part[]> = {
  tee: [{ d: 'M30 16 L42 10 Q50 19 58 10 L70 16 L91 33 L81 46 L70 39 L70 88 L30 88 L30 39 L19 46 L9 33 Z', fill: 'main' }],
  sweater: [
    { d: 'M31 15 L43 9 Q50 17 57 9 L69 15 L93 70 L81 77 L69 50 L69 90 L31 90 L31 50 L19 77 L7 70 Z', fill: 'main' },
    { d: 'M31 82 H69', fill: 'none' },
  ],
  jacket: [
    { d: 'M31 15 L43 9 L50 20 L57 9 L69 15 L93 70 L81 77 L69 50 L69 90 L31 90 L31 50 L19 77 L7 70 Z', fill: 'main' },
    { d: 'M50 20 V90 M36 68 H44 M56 68 H64', fill: 'none' },
  ],
  pants: [
    { d: 'M30 8 H70 L75 92 H55 L50 38 L45 92 H25 Z', fill: 'main' },
    { d: 'M30 19 H70', fill: 'none' },
  ],
  skirt: [
    { d: 'M34 12 H66 L90 88 H10 Z', fill: 'main' },
    { d: 'M42 12 L30 88 M50 12 V88 M58 12 L70 88', fill: 'none' },
  ],
  shorts: [
    { d: 'M28 16 H72 L78 62 H55 L50 40 L45 62 H22 Z', fill: 'main' },
    { d: 'M28 26 H72', fill: 'none' },
  ],
  sneaker: [
    { d: 'M8 60 V46 Q30 44 40 32 L48 39 Q58 48 78 50 Q92 53 92 64 V70 H8 Z', fill: 'main' },
    { d: 'M6 70 H94 V80 H6 Z', fill: 'sole' },
    { d: 'M42 40 L36 48 M50 44 L44 52 M58 48 L52 55', fill: 'none' },
  ],
  boot: [
    { d: 'M28 10 H56 V44 Q64 54 82 56 Q92 59 92 68 V72 H28 Z', fill: 'main' },
    { d: 'M26 72 H94 V82 H26 Z', fill: 'sole' },
    { d: 'M28 26 H56', fill: 'none' },
  ],
  loafer: [
    { d: 'M8 66 Q10 48 30 46 L46 50 Q62 54 80 58 Q94 62 92 72 V74 H8 Z', fill: 'main' },
    { d: 'M6 74 H94 V83 H6 Z', fill: 'sole' },
    { d: 'M32 52 Q40 59 50 54', fill: 'none' },
  ],
};

type ShapeProps = {
  kind: Kind;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  size?: number | `${number}%`;
};

/** Flat vector garment with a 3px ink outline. `fill="none"` draws an icon-style outline. */
export function GarmentShape({ kind, fill = 'none', stroke = C.tinta, strokeWidth = 3, size = '100%' }: ShapeProps) {
  const sole = fill === 'none' ? 'none' : '#FFFFFF';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {SHAPES[kind].map((p, i) => (
        <Path
          key={i}
          d={p.d}
          fill={p.fill === 'main' ? fill : p.fill === 'sole' ? sole : 'none'}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

type ArtProps = {
  item: { kind: Kind; fill: string; imageUri?: string };
  /** Share of the box the vector drawing takes; photos always cover. */
  scale?: number;
  style?: StyleProp<ViewStyle>;
};

/** A garment's picture: its photo when it has one, the vector placeholder otherwise. */
export function GarmentArt({ item, scale = 0.62, style }: ArtProps) {
  return (
    <View style={[styles.box, style]} pointerEvents="none">
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <GarmentShape kind={item.kind} fill={item.fill} size={`${Math.round(scale * 100)}%`} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
