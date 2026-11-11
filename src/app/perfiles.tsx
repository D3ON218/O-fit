import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { PlusIcon } from '@/components/icons';
import { Rise } from '@/components/motion';
import { ProfileForm } from '@/components/profile-form';
import { Mega, Tap, Txt } from '@/components/ui';
import { useCloset } from '@/store/closet';
import { C, F, PALETTE, SIZES } from '@/theme';

/** Profile picker: who's getting dressed. Also where new profiles are created. */
export default function Perfiles() {
  const insets = useSafeAreaInsets();
  const { profiles, createProfile, selectProfile, profile: last } = useCloset();
  const [creating, setCreating] = useState(false);
  const showForm = creating || profiles.length === 0;

  function open(id: string) {
    selectProfile(id);
    router.replace('/main');
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 34, paddingBottom: insets.bottom + 34 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Rise i={0}>
          <Mega>{showForm ? (profiles.length ? 'Nuevo\nperfil' : 'Crea tu\nperfil') : '¿Quién se\nviste hoy?'}</Mega>
        </Rise>

        {showForm ? (
          <Rise i={1} style={styles.card} key="form">
            {profiles.length === 0 && (
              <Txt style={styles.intro}>
                Cada perfil tiene su propio clóset y sus outfits favoritos. Ideal si comparten el celular.
              </Txt>
            )}
            <ProfileForm
              color={PALETTE[profiles.length % PALETTE.length]}
              submitLabel="Crear perfil"
              onSubmit={(v) => {
                createProfile(v);
                router.replace('/main');
              }}
              onCancel={profiles.length ? () => setCreating(false) : undefined}
            />
          </Rise>
        ) : (
          <Rise i={1} style={styles.grid} key="grid">
            {profiles.map((p, i) => (
              <Animated.View key={p.id} entering={FadeIn.delay(300 + i * 60).duration(260)} style={styles.cell}>
                <Tap onPress={() => open(p.id)} squash={0.95} style={styles.tile} accessibilityLabel={`Entrar como ${p.name}`}>
                  <Avatar profile={p} size={104} style={last?.id === p.id && styles.lastRing} />
                  <Text style={styles.name} numberOfLines={1}>
                    {p.name}
                  </Text>
                </Tap>
              </Animated.View>
            ))}
            <View style={styles.cell}>
              <Tap onPress={() => setCreating(true)} squash={0.95} style={styles.tile} accessibilityLabel="Crear perfil nuevo">
                <View style={styles.add}>
                  <PlusIcon color={C.bosque} />
                </View>
                <Text style={styles.name}>Nuevo perfil</Text>
              </Tap>
            </View>
          </Rise>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.menta },
  content: { paddingHorizontal: SIZES.gutter, gap: 24 },
  card: { backgroundColor: 'rgba(14,59,46,0.08)', borderRadius: 32, padding: 20, gap: 16 },
  intro: { fontFamily: F.bodySemi, fontSize: 16, lineHeight: 23, color: C.bosque },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 22 },
  cell: { width: '50%', alignItems: 'center' },
  tile: { alignItems: 'center', gap: 10, maxWidth: 150 },
  lastRing: { borderWidth: 4, borderColor: C.bosque },
  name: { fontFamily: F.bodyHeavy, fontSize: 16, color: C.bosque, textAlign: 'center' },
  add: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: C.bosque,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
