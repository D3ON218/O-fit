import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Profile } from '@/data/types';
import { C, F } from '@/theme';

type Props = {
  profile: Pick<Profile, 'name' | 'photoUri' | 'color'>;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** Profile photo, or the name's first letter on the profile's color. */
export function Avatar({ profile, size = 44, style }: Props) {
  const initial = profile.name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size / 2, backgroundColor: profile.color }, style]}>
      {profile.photoUri ? (
        <Image source={{ uri: profile.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { fontFamily: F.display, color: C.tinta },
});
