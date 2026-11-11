import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Mega, Txt } from '@/components/ui';
import { C, F } from '@/theme';

type PromptOpts = { title: string; message?: string; value?: string; placeholder?: string; confirmLabel?: string };
type ConfirmOpts = { title: string; message?: string; confirmLabel: string; danger?: boolean };

type Request =
  | ({ kind: 'prompt'; resolve: (v: string | null) => void } & PromptOpts)
  | ({ kind: 'confirm'; resolve: (v: boolean) => void } & ConfirmOpts);

type Sheet = {
  /** Asks for a line of text. Resolves to the trimmed text ('' allowed), or null if cancelled. */
  prompt: (o: PromptOpts) => Promise<string | null>;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
};

const Ctx = createContext<Sheet | null>(null);

export function SheetProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<Request | null>(null);
  const api: Sheet = {
    prompt: (o) => new Promise((resolve) => setReq({ kind: 'prompt', resolve, ...o })),
    confirm: (o) => new Promise((resolve) => setReq({ kind: 'confirm', resolve, ...o })),
  };
  return (
    <Ctx value={api}>
      <View style={styles.host}>
        {children}
        {req && <SheetView key={req.title} req={req} onDone={() => setReq(null)} />}
      </View>
    </Ctx>
  );
}

export function useSheet() {
  const s = use(Ctx);
  if (!s) throw new Error('useSheet must be used inside SheetProvider');
  return s;
}

function SheetView({ req, onDone }: { req: Request; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(req.kind === 'prompt' ? (req.value ?? '') : '');
  const settled = useRef(false);
  const input = useRef<TextInputInstance>(null);

  // autoFocus alone loses the race with the entrance animation on some platforms.
  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  function finish(ok: boolean) {
    if (settled.current) return;
    settled.current = true;
    if (req.kind === 'prompt') req.resolve(ok ? text.trim() : null);
    else req.resolve(ok);
    onDone();
  }

  const danger = req.kind === 'confirm' && req.danger;
  return (
    <Animated.View style={styles.backdrop} entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => finish(false)} accessibilityLabel="Cancelar" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.wrap, { paddingTop: insets.top + 90 }]} pointerEvents="box-none">
        <Animated.View style={styles.card} entering={FadeInDown.duration(260)}>
          <Mega size={24} color={C.tinta}>
            {req.title}
          </Mega>
          {req.message && <Txt style={styles.message}>{req.message}</Txt>}
          {req.kind === 'prompt' && (
            <TextInput
              ref={input}
              selectTextOnFocus
              value={text}
              onChangeText={setText}
              placeholder={req.placeholder}
              placeholderTextColor="rgba(6,36,26,0.4)"
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={() => finish(true)}
              style={styles.input}
            />
          )}
          <View style={styles.row}>
            <Btn label="Cancelar" variant="ghost" onPress={() => finish(false)} style={styles.btn} />
            <Btn
              label={req.confirmLabel ?? 'Guardar'}
              variant={danger ? 'danger' : 'lime'}
              onPress={() => finish(true)}
              style={styles.btn}
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, zIndex: 100, backgroundColor: 'rgba(6,36,26,0.55)' },
  wrap: { flex: 1, paddingHorizontal: 20 },
  card: { backgroundColor: C.papel, borderRadius: 32, padding: 22, gap: 14 },
  message: { fontFamily: F.bodySemi, fontSize: 15, lineHeight: 21, opacity: 0.8 },
  input: {
    height: 56,
    borderRadius: 999,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(6,36,26,0.08)',
    fontFamily: F.bodyBold,
    fontSize: 16,
    color: C.tinta,
  },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingHorizontal: 12 },
});
