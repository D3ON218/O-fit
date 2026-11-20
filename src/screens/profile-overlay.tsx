import { useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { CloseIcon, EmptyClosetIcon, GearIcon, LogoutIcon, TrashIcon, UserIcon, VolumeIcon } from '@/components/icons';
import { MorphLayer, Rise, type MorphHandle, type Rect } from '@/components/motion';
import { ProfileForm } from '@/components/profile-form';
import { useSheet } from '@/components/sheet';
import { Mega, Round, Tap, Txt } from '@/components/ui';
import type { Profile } from '@/data/types';
import { useCloset } from '@/store/closet';
import { C, F, SIZES } from '@/theme';

type Props = {
  profile: Profile;
  from: Rect;
  /** The avatar in the tab bar, re-measured for the way back. */
  back: () => Promise<Rect | null>;
  onClosed: () => void;
};

export function ProfileOverlay({ profile, from, back, onClosed }: Props) {
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const { items, favs, prefs, setPrefs, updateProfile, deleteProfile, clearCloset, signOut } = useCloset();
  const morph = useRef<MorphHandle>(null);
  const busy = useRef(true);
  const [editing, setEditing] = useState(false);

  async function close(then?: () => void) {
    if (busy.current) return;
    busy.current = true;
    const rect = await back();
    await morph.current?.close(rect ? { rect, radii: rect.w / 2 } : null);
    onClosed();
    then?.();
  }

  async function remove() {
    const ok = await sheet.confirm({
      title: '¿Eliminar perfil?',
      message: `Se borrarán el clóset, las fotos y los outfits de ${profile.name}. No se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (ok) close(() => deleteProfile(profile.id));
  }

  async function handleClearCloset() {
    const ok = await sheet.confirm({
      title: '¿Vaciar clóset?',
      message: `Se perderán todas las prendas y outfits guardados de ${profile.name}. Esta acción no se puede deshacer.`,
      confirmLabel: 'Vaciar clóset',
      danger: true,
    });
    if (ok) {
      clearCloset();
    }
  }

  const n = items.length;
  const cameraSound = prefs.cameraSound ?? true;
  return (
    <MorphLayer
      ref={morph}
      from={from}
      radii={from.w / 2}
      fromColor={profile.color}
      color={C.bosque}
      duration={680}
      closeDuration={580}
      onOpened={() => (busy.current = false)}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 34, paddingBottom: insets.bottom + 28 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Rise i={0} style={styles.head}>
            <Mega size={32} color={C.papel}>
              {editing ? 'Mi perfil' : 'Perfil'}
            </Mega>
            <Round label="Cerrar perfil" bg="rgba(255,255,255,0.16)" onPress={() => (editing ? setEditing(false) : close())}>
              <CloseIcon color={C.papel} />
            </Round>
          </Rise>

          {editing ? (
            <Animated.View entering={FadeIn.duration(220)} style={styles.formCard}>
              <ProfileForm
                initial={profile}
                submitLabel="Guardar"
                onCancel={() => setEditing(false)}
                onSubmit={(v) => {
                  updateProfile(profile.id, { name: v.name, photoUri: v.photoUri });
                  setEditing(false);
                }}
              />
            </Animated.View>
          ) : (
            <>
              <Rise i={1} style={styles.who}>
                <Avatar profile={profile} size={76} />
                <View style={styles.whoText}>
                  <Text style={styles.whoName} numberOfLines={1}>
                    {profile.name}
                  </Text>
                  <Txt style={styles.stats}>
                    {n} {n === 1 ? 'prenda' : 'prendas'} · {favs.length} {favs.length === 1 ? 'outfit guardado' : 'outfits guardados'}
                  </Txt>
                </View>
              </Rise>

              <Rise i={2} style={styles.group}>
                <Row icon={<UserIcon color={C.tinta} />} label="Mi perfil" help="Nombre y foto" onPress={() => setEditing(true)} />
              </Rise>

              <Rise i={3} style={styles.group}>
                <Text style={styles.section}>Preferencias</Text>
                <View style={styles.row}>
                  <View style={styles.rowIcon}>
                    <GearIcon color={C.tinta} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>Elegir perfil al abrir</Text>
                    <Text style={styles.rowHelp}>
                      {prefs.askProfileOnOpen ? 'O-fit te pregunta quién eres cada vez.' : 'O-fit abre el último perfil que usaste.'}
                    </Text>
                  </View>
                  <Switch
                    value={prefs.askProfileOnOpen}
                    onValueChange={(v) => setPrefs({ askProfileOnOpen: v })}
                    trackColor={{ false: 'rgba(6,36,26,0.2)', true: C.lima }}
                    thumbColor={C.papel}
                  />
                </View>
                <View style={styles.row}>
                  <View style={styles.rowIcon}>
                    <VolumeIcon color={C.tinta} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>Sonido de la cámara</Text>
                    <Text style={styles.rowHelp}>
                      {cameraSound ? 'Suena un obturador al tomar una foto.' : 'Captura fotos en silencio.'}
                    </Text>
                  </View>
                  <Switch
                    value={cameraSound}
                    onValueChange={(v) => setPrefs({ cameraSound: v })}
                    trackColor={{ false: 'rgba(6,36,26,0.2)', true: C.lima }}
                    thumbColor={C.papel}
                  />
                </View>
              </Rise>

              <Rise i={4} style={styles.group}>
                <Row icon={<LogoutIcon color={C.tinta} />} label="Cerrar sesión" help="Volver a elegir perfil" onPress={() => close(signOut)} />
                <Row
                  icon={<EmptyClosetIcon color={C.papel} />}
                  label="Vaciar clóset"
                  help="Borrar todas las prendas y outfits de este perfil"
                  danger
                  onPress={handleClearCloset}
                />
                <Row icon={<TrashIcon color={C.papel} />} label="Eliminar perfil" danger onPress={remove} />
              </Rise>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </MorphLayer>
  );
}

function Row({ icon, label, help, danger, onPress }: { icon: ReactNode; label: string; help?: string; danger?: boolean; onPress: () => void }) {
  return (
    <Tap onPress={onPress} squash={0.97} style={[styles.row, danger && styles.rowDanger]}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
        {help && <Text style={styles.rowHelp}>{help}</Text>}
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: SIZES.gutter, gap: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 6 },
  whoText: { flex: 1, gap: 4 },
  whoName: { fontFamily: F.display, fontSize: 24, letterSpacing: -0.6, textTransform: 'uppercase', color: C.lima },
  stats: { fontFamily: F.bodySemi, fontSize: 14, color: C.menta },
  group: { gap: 10 },
  section: { fontFamily: F.bodyHeavy, fontSize: 13, color: C.lila, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.papel,
    borderRadius: 30,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 16,
    minHeight: 64,
  },
  rowDanger: { backgroundColor: 'rgba(255,59,92,0.16)' },
  rowIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.menta, alignItems: 'center', justifyContent: 'center' },
  rowIconDanger: { backgroundColor: C.rojo },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: F.bodyHeavy, fontSize: 16, color: C.tinta },
  rowHelp: { fontFamily: F.bodySemi, fontSize: 13, color: C.tinta, opacity: 0.65 },
  dangerText: { color: '#FFB3C0' },
  formCard: { backgroundColor: C.menta, borderRadius: 32, padding: 20 },
});
