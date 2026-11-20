import { Image } from 'expo-image';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, TextInput, View, type HostInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GarmentArt, GarmentShape } from '@/components/garment-art';
import { BackIcon, CameraIcon, CheckIcon, CloseIcon, CropIcon, GalleryIcon, RetakeIcon } from '@/components/icons';
import { ImageCropper } from '@/components/image-cropper';
import { measure, MorphLayer, Rise, wait, type MorphHandle, type Radii, type Rect } from '@/components/motion';
import { Btn, Mega, Pill, Round, Tap, Txt } from '@/components/ui';
import { CATS, FILLS, KINDS, nextBg, pick, uid } from '@/data/catalog';
import type { Cat, Garment } from '@/data/types';
import { explainDenied, pickOne } from '@/lib/media';
import { persistPhoto } from '@/lib/photos';
import { useCloset } from '@/store/closet';
import { C, F, SIZES } from '@/theme';

type Props = {
  from: Rect;
  /** The "+" button, re-measured for the way back. */
  back: () => Promise<Rect | null>;
  onSaved: (cat: Cat) => void;
  onClosed: () => void;
};

type Layer = { id: 'cam' | 'cat' | 'done'; from: Rect; radii: Radii; fromColor: string; color: string };

const SLABS: { bg: string; radii: Radii }[] = [
  { bg: C.rosa, radii: [56, 56, 24, 24] },
  { bg: C.cielo, radii: 26 },
  { bg: C.sol, radii: 999 },
];

function playShutterAudio() {
  if (typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio not permitted or not supported
    }
  }
}

export function CaptureOverlay({ from, back, onSaved, onClosed }: Props) {
  const [perm, requestPerm] = useCameraPermissions();
  const [startedGranted] = useState(() => !!perm?.granted);
  const insets = useSafeAreaInsets();
  const { addItem, prefs } = useCloset();

  const outer = useRef<MorphHandle>(null);
  const layerRefs = useRef<Partial<Record<Layer['id'], MorphHandle | null>>>({});
  const busy = useRef(true);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [saved, setSaved] = useState<{ item: Garment; catName: string } | null>(null);
  const [name, setName] = useState('');

  // Permission resolves asynchronously; once it is known to be granted the base layer is the camera.
  const camIsBase = startedGranted || (!!perm?.granted && !layers.some((l) => l.id === 'cam'));
  const has = (id: Layer['id']) => layers.some((l) => l.id === id);

  async function run(fn: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    try {
      await fn();
    } finally {
      busy.current = false;
    }
  }

  const opened = useRef<() => void>(() => {});
  const push = (l: Layer) =>
    new Promise<void>((resolve) => {
      opened.current = resolve;
      setLayers((ls) => [...ls, l]);
      setTimeout(resolve, 1200);
    });

  async function pop(id: Layer['id'], node?: HostInstance | null) {
    const l = layers.find((x) => x.id === id);
    const rect = node ? await measure({ current: node }) : null;
    await layerRefs.current[id]?.close(rect && l ? { rect, radii: l.radii } : null);
    setLayers((ls) => ls.filter((x) => x.id !== id));
  }

  const closeAll = () =>
    run(async () => {
      setIsCropping(false);
      const rect = await back();
      await outer.current?.close(rect ? { rect, radii: rect.w / 2 } : null);
      onClosed();
    });

  /* ----- permission ----- */
  const allowRef = useRef<HostInstance>(null);
  const allow = () =>
    run(async () => {
      const res = await requestPerm();
      if (!res.granted) {
        explainDenied('la cámara', res.canAskAgain);
        return;
      }
      const r = await measure(allowRef);
      if (r) await push({ id: 'cam', from: r, radii: r.h / 2, fromColor: C.lima, color: C.camara });
    });

  /* ----- camera & review ----- */
  const cam = useRef<CameraView>(null);
  const shutterRef = useRef<HostInstance>(null);
  const galRef = useRef<HostInstance>(null);
  const confirmRef = useRef<HostInstance>(null);
  const retakeRef = useRef<HostInstance>(null);
  const cropBtnRef = useRef<HostInstance>(null);
  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  async function openCat(node: HostInstance | null, fromColor: string) {
    const r = node ? await measure({ current: node }) : null;
    if (r) await push({ id: 'cat', from: r, radii: Math.min(r.w, r.h) / 2, fromColor, color: C.lima });
  }

  const shoot = () =>
    run(async () => {
      flash.set(withSequence(withTiming(0.9, { duration: 0 }), withTiming(0, { duration: 350 })));
      const soundEnabled = prefs.cameraSound ?? true;
      let uri: string | null = null;
      try {
        if (soundEnabled && Platform.OS === 'web') {
          playShutterAudio();
        }
        // On an emulator without a camera this throws; the garment then gets a drawing instead.
        const pic = await cam.current?.takePictureAsync({
          quality: 0.85,
          shutterSound: soundEnabled,
        });
        uri = pic?.uri ?? null;
      } catch {
        await wait(120);
      }
      if (uri) {
        setPhoto(uri);
      } else {
        setPhoto(null);
        await openCat(shutterRef.current, '#FFFFFF');
      }
    });

  const gallery = () =>
    run(async () => {
      const uri = await pickOne();
      if (!uri) return;
      setPhoto(uri);
    });

  const confirmPhoto = () =>
    run(async () => {
      if (!photo) return;
      await openCat(confirmRef.current, C.lima);
    });

  /* ----- category ----- */
  const slabRefs = useRef<(HostInstance | null)[]>([]);
  const choose = (i: number) =>
    run(async () => {
      Keyboard.dismiss();
      const c = CATS[i];
      const node = slabRefs.current[i];
      const r = node ? await measure({ current: node }) : null;
      let imageUri: string | undefined;
      try {
        imageUri = photo ? await persistPhoto(photo) : undefined;
      } catch {
        imageUri = photo ?? undefined;
      }
      const item: Garment = {
        id: uid(),
        cat: c.id,
        kind: pick(KINDS[c.id]),
        name: name.trim() || `${c.name} nuevo`,
        fill: pick(FILLS),
        bg: nextBg(),
        imageUri,
        createdAt: Date.now(),
      };
      setSaved({ item, catName: c.name });
      if (r) await push({ id: 'done', from: r, radii: SLABS[i].radii, fromColor: SLABS[i].bg, color: SLABS[i].bg });
      await wait(1000);
      addItem(item);
      onSaved(c.id);
      busy.current = false;
      await closeAll();
    });

  const renderLayer = (l: Layer) => (
    <MorphLayer
      key={l.id}
      ref={(h) => {
        layerRefs.current[l.id] = h;
      }}
      from={l.from}
      radii={l.radii}
      fromColor={l.fromColor}
      color={l.color}
      duration={l.id === 'cam' ? 700 : 660}
      closeDuration={560}
      onOpened={() => opened.current()}>
      {l.id === 'cam' ? camera : l.id === 'cat' ? catPick : done}
    </MorphLayer>
  );

  const permission = (
    <View style={[styles.layer, { paddingTop: insets.top + 34, paddingBottom: insets.bottom + 28 }]}>
      <Rise i={0}>
        <Round label="Cerrar" bg="rgba(255,255,255,0.16)" onPress={closeAll}>
          <CloseIcon color={C.papel} />
        </Round>
      </Rise>
      <View style={styles.pbody}>
        <Rise i={1}>
          <View style={styles.pglyph}>
            <CameraIcon color={C.tinta} />
          </View>
        </Rise>
        <Rise i={2}>
          <Mega size={40} color={C.menta}>
            {'Tu cámara,\ntu clóset'}
          </Mega>
        </Rise>
        <Rise i={3}>
          <Txt style={styles.ptext}>
            O-fit usa la cámara solo para fotografiar tus prendas. Las fotos se guardan en tu teléfono y no salen de él.
          </Txt>
        </Rise>
      </View>
      <Rise i={4} style={styles.pact}>
        <Btn ref={allowRef} label="Permitir cámara" big onPress={allow} />
        <Tap onPress={closeAll} style={styles.link}>
          <Text style={styles.linkText}>Ahora no</Text>
        </Tap>
      </Rise>
    </View>
  );

  const preview = photo && (
    <View style={styles.previewContainer}>
      <View style={[styles.camtop, { paddingTop: insets.top + 34 }]}>
        <Round label="Cerrar cámara" bg="rgba(255,255,255,0.16)" onPress={closeAll}>
          <CloseIcon color="#FFFFFF" />
        </Round>
        <Pill label="Revisa tu foto antes de guardar" bg="rgba(0,0,0,0.35)" color={C.papel} style={styles.camPill} />
      </View>

      <View style={styles.previewImageWrapper}>
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="contain" />
        {/* En una esquinita: el símbolo de recortar la foto */}
        <Tap
          ref={cropBtnRef}
          onPress={() => setIsCropping(true)}
          squash={0.92}
          style={styles.cropCornerBtn}
          accessibilityLabel="Recortar foto">
          <CropIcon size={20} color="#FFFFFF" />
          <Text style={styles.cropCornerText}>Recortar</Text>
        </Tap>
      </View>

      {/* Botones abajo */}
      <View style={[styles.reviewCtl, { paddingBottom: insets.bottom + 38 }]}>
        {/* Retake: círculo de los que se apuntan a sí mismos */}
        <Tap
          ref={retakeRef}
          onPress={() => setPhoto(null)}
          squash={0.9}
          style={styles.retakeBtn}
          accessibilityLabel="Volver a tomar foto">
          <RetakeIcon size={30} color="#FFFFFF" />
        </Tap>

        {/* Palomita: confirmación */}
        <Tap
          ref={confirmRef}
          onPress={confirmPhoto}
          squash={0.9}
          style={styles.confirmBtn}
          accessibilityLabel="Aceptar foto">
          <CheckIcon size={36} color={C.tinta} />
        </Tap>
      </View>
    </View>
  );

  const camera = (
    <View style={styles.cam}>
      {!photo && (
        <>
          <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" />
          <View style={[styles.camtop, { paddingTop: insets.top + 34 }]}>
            <Round label="Cerrar cámara" bg="rgba(255,255,255,0.16)" onPress={closeAll}>
              <CloseIcon color="#FFFFFF" />
            </Round>
            <Pill label="Pon la prenda sobre una superficie lisa" bg="rgba(0,0,0,0.35)" color={C.papel} style={styles.camPill} />
          </View>
          <View style={styles.guide} pointerEvents="none">
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <View style={styles.ghost}>
              <GarmentShape kind="tee" fill="rgba(255,255,255,0.28)" stroke="transparent" />
            </View>
          </View>
          <View style={[styles.camctl, { paddingBottom: insets.bottom + 38 }]}>
            <Btn
              ref={galRef}
              label="Galería"
              variant="ghost"
              onPress={gallery}
              style={styles.galBtn}
              textStyle={styles.galText}
              icon={() => <GalleryIcon color="#FFFFFF" />}
            />
            <Tap ref={shutterRef} onPress={shoot} squash={0.92} style={styles.shutter} accessibilityLabel="Tomar foto">
              <View style={styles.shutterDot} />
            </Tap>
            <View style={styles.sp} />
          </View>
          <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none" />
        </>
      )}

      {photo && preview}

      {isCropping && photo && (
        <ImageCropper
          imageUri={photo}
          onDone={(croppedUri) => {
            setPhoto(croppedUri);
            setIsCropping(false);
          }}
          onCancel={() => setIsCropping(false)}
        />
      )}
    </View>
  );

  const catPick = (
    <View style={[styles.layer, styles.catpick, { paddingTop: insets.top + 34, paddingBottom: insets.bottom + 28 }]}>
      <Rise i={0} style={styles.cprow}>
        <Round
          label="Volver a la cámara"
          onPress={() => run(() => pop('cat', photo ? (confirmRef.current ?? galRef.current) : shutterRef.current))}>
          <BackIcon color={C.menta} />
        </Round>
        <View style={styles.thumb}>
          {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <CameraIcon size={26} color={C.menta} />}
        </View>
      </Rise>
      <Rise i={1}>
        <Mega size={40} color={C.tinta}>
          {'¿Qué\nprenda es?'}
        </Mega>
      </Rise>
      <Rise i={2} style={styles.nameField}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ponle nombre (opcional)"
          placeholderTextColor="rgba(6,36,26,0.45)"
          maxLength={40}
          returnKeyType="done"
          style={styles.nameInput}
        />
        <Txt style={styles.cptext}>Luego elige una categoría para guardarla en tu clóset.</Txt>
      </Rise>
      <Rise i={3} style={styles.slabs}>
        {CATS.map((c, i) => {
          const r = SLABS[i].radii;
          const rr = typeof r === 'number' ? { borderRadius: r } : { borderTopLeftRadius: r[0], borderTopRightRadius: r[1], borderBottomRightRadius: r[2], borderBottomLeftRadius: r[3] };
          return (
            <Tap
              key={c.id}
              ref={(v) => {
                slabRefs.current[i] = v;
              }}
              squash={0.97}
              onPress={() => choose(i)}
              style={[styles.cslab, { backgroundColor: SLABS[i].bg }, rr]}>
              <GarmentShape kind={c.icon} strokeWidth={6} size={56} />
              <View style={styles.cslabText}>
                <Text style={styles.cslabTitle}>{c.name}</Text>
                <Txt style={styles.cslabHelp}>{c.help}</Txt>
              </View>
            </Tap>
          );
        })}
      </Rise>
    </View>
  );

  const done = saved && (
    <View style={[styles.layer, styles.done]}>
      <Rise i={0} style={styles.ddArt}>
        <GarmentArt item={saved.item} scale={1} style={StyleSheet.absoluteFill} />
      </Rise>
      <Rise i={1}>
        <Mega size={30} color={C.tinta} style={styles.center}>
          {`Guardada\nen ${saved.catName}`}
        </Mega>
      </Rise>
      <Rise i={2}>
        <View style={styles.check}>
          <CheckIcon color={C.lima} />
        </View>
      </Rise>
    </View>
  );

  return (
    <MorphLayer
      ref={outer}
      from={from}
      radii={from.w / 2}
      fromColor={C.lima}
      color={startedGranted ? C.camara : C.bosque}
      duration={700}
      closeDuration={600}
      onOpened={() => (busy.current = false)}>
      {camIsBase && !has('cam') ? camera : permission}
      {layers.map(renderLayer)}
    </MorphLayer>
  );
}

const corner = 44;
const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, paddingHorizontal: SIZES.gutter },
  pbody: { flex: 1, justifyContent: 'center', gap: 18 },
  pglyph: {
    width: 96,
    height: 96,
    backgroundColor: C.lima,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    borderBottomRightRadius: 48,
    borderBottomLeftRadius: 22,
  },
  ptext: { fontSize: 17, lineHeight: 25, color: '#B8DDC4' },
  pact: { alignItems: 'center', gap: 4 },
  link: { padding: 12 },
  linkText: { fontFamily: F.bodyBold, fontSize: 15, color: C.papel, opacity: 0.8, textDecorationLine: 'underline' },

  cam: { ...StyleSheet.absoluteFill, backgroundColor: C.camara },
  camtop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SIZES.gutter },
  camPill: { height: 36, flexShrink: 1 },
  guide: { flex: 1, margin: 40, marginTop: 22, marginBottom: 22, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: corner, height: corner, borderColor: C.lima },
  tl: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 22 },
  tr: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 22 },
  bl: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 22 },
  br: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 22 },
  ghost: { width: '44%', aspectRatio: 1 },
  camctl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  galBtn: { backgroundColor: 'rgba(255,255,255,0.16)', height: 48, paddingHorizontal: 18, width: 112 },
  galText: { color: '#FFFFFF', fontSize: 14 },
  shutter: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterDot: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFFFFF' },
  sp: { width: 112 },
  flash: { ...StyleSheet.absoluteFill, backgroundColor: '#FFFFFF' },

  previewContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: C.camara,
    justifyContent: 'space-between',
  },
  previewImageWrapper: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#04160F',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  cropCornerBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  cropCornerText: {
    fontFamily: F.bodyBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  reviewCtl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
    paddingHorizontal: 24,
  },
  retakeBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: C.lima,
    alignItems: 'center',
    justifyContent: 'center',
  },

  catpick: { gap: 14 },
  cprow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  thumb: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#1E5A43', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cptext: { fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20, opacity: 0.8 },
  nameField: { gap: 8 },
  nameInput: {
    height: 52,
    borderRadius: 999,
    paddingHorizontal: 20,
    backgroundColor: C.papel,
    fontFamily: F.bodyBold,
    fontSize: 16,
    color: C.tinta,
  },
  slabs: { flex: 1, gap: 10, minHeight: 0 },
  cslab: { flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24 },
  cslabText: { gap: 2, flexShrink: 1 },
  cslabTitle: { fontFamily: F.display, fontSize: 26, letterSpacing: -0.8, textTransform: 'uppercase', color: C.tinta },
  cslabHelp: { fontFamily: F.bodySemi, fontSize: 13 },

  done: { alignItems: 'center', justifyContent: 'center', gap: 18 },
  ddArt: { width: '60%', maxWidth: 220, aspectRatio: 1, borderRadius: 999, overflow: 'hidden' },
  center: { textAlign: 'center' },
  check: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.bosque, alignItems: 'center', justifyContent: 'center' },
});
