import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { GalleryIcon } from '@/components/icons';
import { Btn, Tap } from '@/components/ui';
import { pickOne } from '@/lib/media';
import { persistPhoto } from '@/lib/photos';
import { C, F, PALETTE } from '@/theme';

export type ProfileFormValue = { name: string; photoUri?: string };

type Props = {
  initial?: { name: string; photoUri?: string; color: string };
  /** Avatar color to preview when there's no initial profile. */
  color?: string;
  submitLabel: string;
  onSubmit: (v: ProfileFormValue) => void;
  onCancel?: () => void;
  /** Text color for labels; the form sits on both light and dark screens. */
  ink?: string;
};

export function ProfileForm({ initial, color, submitLabel, onSubmit, onCancel, ink = C.tinta }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [photoUri, setPhotoUri] = useState(initial?.photoUri);
  const [busy, setBusy] = useState(false);
  const ok = name.trim().length > 0;

  async function choosePhoto() {
    const uri = await pickOne();
    if (!uri) return;
    setBusy(true);
    try {
      setPhotoUri(await persistPhoto(uri));
    } catch {
      setPhotoUri(uri);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.photoRow}>
        <Tap onPress={choosePhoto} squash={0.95} accessibilityLabel="Elegir foto de perfil">
          <Avatar profile={{ name: name || '?', photoUri, color: initial?.color ?? color ?? PALETTE[0] }} size={88} />
          <View style={styles.badge}>
            <GalleryIcon size={16} color={C.tinta} />
          </View>
        </Tap>
        <View style={styles.photoText}>
          <Text style={[styles.label, { color: ink }]}>Foto (opcional)</Text>
          <Tap onPress={choosePhoto} style={styles.link}>
            <Text style={[styles.linkText, { color: ink }]}>{photoUri ? 'Cambiar foto' : 'Elegir de la galería'}</Text>
          </Tap>
          {photoUri && (
            <Tap onPress={() => setPhotoUri(undefined)} style={styles.link}>
              <Text style={[styles.linkText, { color: ink, opacity: 0.7 }]}>Quitar foto</Text>
            </Tap>
          )}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: ink }]}>Nombre del perfil</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej. Johan"
          placeholderTextColor="rgba(6,36,26,0.4)"
          maxLength={24}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={() => ok && onSubmit({ name: name.trim(), photoUri })}
        />
      </View>


      <View style={styles.actions}>
        {onCancel && <Btn label="Cancelar" variant="ghost" onPress={onCancel} style={styles.btn} />}
        <Btn
          label={submitLabel}
          variant={ok ? 'dark' : 'ghost'}
          disabled={!ok || busy}
          onPress={() => ok && !busy && onSubmit({ name: name.trim(), photoUri })}
          style={[styles.btn, !ok && styles.off]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 18 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.sol,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: { gap: 2, alignItems: 'flex-start' },
  label: { fontFamily: F.bodyHeavy, fontSize: 15 },
  link: { paddingVertical: 4 },
  linkText: { fontFamily: F.bodyBold, fontSize: 14, textDecorationLine: 'underline' },
  field: { gap: 8 },
  input: {
    height: 56,
    borderRadius: 999,
    paddingHorizontal: 20,
    backgroundColor: C.papel,
    fontFamily: F.bodyBold,
    fontSize: 16,
    color: C.tinta,
  },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingHorizontal: 12 },
  off: { opacity: 0.6 },
});
