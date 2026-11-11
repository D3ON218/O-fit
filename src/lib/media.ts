import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';

/** Asks for gallery access, pointing to Settings when the user already said no for good. */
async function requestGallery() {
  // On web, permission requests are no-ops and the picker must open straight from the press.
  if (Platform.OS === 'web') return true;
  const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (res.granted) return true;
  explainDenied('tu galería', res.canAskAgain);
  return false;
}

export function explainDenied(what: string, canAskAgain: boolean) {
  if (Platform.OS === 'web') return;
  if (!canAskAgain) {
    Alert.alert('Permiso requerido', `Negaste el acceso a ${what}. Actívalo desde los ajustes del dispositivo para continuar.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
    ]);
  } else {
    Alert.alert('Permiso requerido', `Necesitamos acceso a ${what} para agregar tus prendas.`);
  }
}

/** One photo, square-cropped so every garment tile lines up. */
export async function pickOne(): Promise<string | null> {
  if (!(await requestGallery())) return null;
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  return r.canceled ? null : r.assets[0].uri;
}

export async function pickMany(): Promise<string[]> {
  if (!(await requestGallery())) return [];
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 20,
    quality: 0.8,
  });
  return r.canceled ? [] : r.assets.map((a) => a.uri);
}
