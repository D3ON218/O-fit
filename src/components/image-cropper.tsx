import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image as RNImage,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon, CloseIcon, RotateCwIcon } from '@/components/icons';
import { Round, Tap, Txt } from '@/components/ui';
import { C, F, SIZES } from '@/theme';

type Props = {
  imageUri: string;
  onDone: (croppedUri: string) => void;
  onCancel: () => void;
};

type Ratio = 'free' | '1:1' | '3:4' | '4:3';

type RectBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const MIN_SIZE = 60;
const HANDLE_SIZE = 44;

function calculateRatioBox(
  r: Ratio,
  dispW: number,
  dispH: number,
  offsetX: number,
  offsetY: number
): RectBox {
  let targetW = dispW * 0.9;
  let targetH = dispH * 0.9;

  if (r === '1:1') {
    const side = Math.min(dispW, dispH) * 0.88;
    targetW = side;
    targetH = side;
  } else if (r === '3:4') {
    const maxW = dispW * 0.88;
    const maxH = dispH * 0.88;
    if (maxW * (4 / 3) <= maxH) {
      targetW = maxW;
      targetH = maxW * (4 / 3);
    } else {
      targetH = maxH;
      targetW = maxH * (3 / 4);
    }
  } else if (r === '4:3') {
    const maxW = dispW * 0.88;
    const maxH = dispH * 0.88;
    if (maxW * (3 / 4) <= maxH) {
      targetW = maxW;
      targetH = maxW * (3 / 4);
    } else {
      targetH = maxH;
      targetW = maxH * (4 / 3);
    }
  }

  return {
    x: offsetX + (dispW - targetW) / 2,
    y: offsetY + (dispH - targetH) / 2,
    w: targetW,
    h: targetH,
  };
}

export function ImageCropper({ imageUri, onDone, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const [rawSize, setRawSize] = useState<{ width: number; height: number } | null>(null);
  const [container, setContainer] = useState<{ width: number; height: number } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [ratio, setRatio] = useState<Ratio>('1:1');
  const [processing, setProcessing] = useState(false);

  // Reanimated shared values for smooth gesture positioning
  const boxX = useSharedValue(0);
  const boxY = useSharedValue(0);
  const boxW = useSharedValue(100);
  const boxH = useSharedValue(100);

  // Gesture start memories
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startW = useSharedValue(0);
  const startH = useSharedValue(0);

  // Load image dimensions
  useEffect(() => {
    let active = true;
    RNImage.getSize(
      imageUri,
      (width, height) => {
        if (active) setRawSize({ width, height });
      },
      () => {
        if (active) setRawSize({ width: 1080, height: 1440 });
      }
    );
    return () => {
      active = false;
    };
  }, [imageUri]);

  // Compute displayed image metrics
  const metrics = useMemo(() => {
    if (!rawSize || !container || container.width <= 0 || container.height <= 0) return null;

    const isSwapped = rotation % 180 !== 0;
    const effW = isSwapped ? rawSize.height : rawSize.width;
    const effH = isSwapped ? rawSize.width : rawSize.height;

    const padH = 24;
    const padV = 20;
    const availW = Math.max(10, container.width - padH * 2);
    const availH = Math.max(10, container.height - padV * 2);

    const scale = Math.min(availW / effW, availH / effH);
    const dispW = effW * scale;
    const dispH = effH * scale;
    const offsetX = (container.width - dispW) / 2;
    const offsetY = (container.height - dispH) / 2;

    return { effW, effH, scale, dispW, dispH, offsetX, offsetY };
  }, [rawSize, container, rotation]);

  // Shared values for boundaries inside worklets
  const boundLeft = useSharedValue(0);
  const boundTop = useSharedValue(0);
  const boundRight = useSharedValue(0);
  const boundBottom = useSharedValue(0);
  const ratioMode = useSharedValue<Ratio>('1:1');

  useEffect(() => {
    if (!metrics) return;
    boundLeft.set(metrics.offsetX);
    boundTop.set(metrics.offsetY);
    boundRight.set(metrics.offsetX + metrics.dispW);
    boundBottom.set(metrics.offsetY + metrics.dispH);
    ratioMode.set(ratio);

    const initial = calculateRatioBox(ratio, metrics.dispW, metrics.dispH, metrics.offsetX, metrics.offsetY);
    boxX.set(initial.x);
    boxY.set(initial.y);
    boxW.set(initial.w);
    boxH.set(initial.h);
  }, [metrics, ratio, boundLeft, boundTop, boundRight, boundBottom, ratioMode, boxX, boxY, boxW, boxH]);

  // Gestures
  const centerPan = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startX.set(boxX.value);
      startY.set(boxY.value);
    })
    .onUpdate((e) => {
      'worklet';
      const minX = boundLeft.value;
      const maxX = boundRight.value - boxW.value;
      const minY = boundTop.value;
      const maxY = boundBottom.value - boxH.value;

      const nextX = Math.max(minX, Math.min(maxX, startX.value + e.translationX));
      const nextY = Math.max(minY, Math.min(maxY, startY.value + e.translationY));
      boxX.set(nextX);
      boxY.set(nextY);
    });

  const tlPan = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startX.set(boxX.value);
      startY.set(boxY.value);
      startW.set(boxW.value);
      startH.set(boxH.value);
    })
    .onUpdate((e) => {
      'worklet';
      const curRatio = ratioMode.value;
      const targetRatio = curRatio === '1:1' ? 1 : curRatio === '3:4' ? 3 / 4 : curRatio === '4:3' ? 4 / 3 : null;

      let nextX = Math.min(startX.value + startW.value - MIN_SIZE, Math.max(boundLeft.value, startX.value + e.translationX));
      let nextY = Math.min(startY.value + startH.value - MIN_SIZE, Math.max(boundTop.value, startY.value + e.translationY));
      let nextW = startX.value + startW.value - nextX;
      let nextH = startY.value + startH.value - nextY;

      if (targetRatio !== null) {
        const side = Math.min(nextW, nextH * targetRatio);
        nextW = side;
        nextH = side / targetRatio;
        nextX = startX.value + startW.value - nextW;
        nextY = startY.value + startH.value - nextH;
      }
      boxX.set(nextX);
      boxY.set(nextY);
      boxW.set(nextW);
      boxH.set(nextH);
    });

  const trPan = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startX.set(boxX.value);
      startY.set(boxY.value);
      startW.set(boxW.value);
      startH.set(boxH.value);
    })
    .onUpdate((e) => {
      'worklet';
      const curRatio = ratioMode.value;
      const targetRatio = curRatio === '1:1' ? 1 : curRatio === '3:4' ? 3 / 4 : curRatio === '4:3' ? 4 / 3 : null;

      let nextW = Math.max(MIN_SIZE, Math.min(boundRight.value - startX.value, startW.value + e.translationX));
      let nextY = Math.min(startY.value + startH.value - MIN_SIZE, Math.max(boundTop.value, startY.value + e.translationY));
      let nextH = startY.value + startH.value - nextY;

      if (targetRatio !== null) {
        const side = Math.min(nextW, nextH * targetRatio);
        nextW = side;
        nextH = side / targetRatio;
        nextY = startY.value + startH.value - nextH;
      }
      boxY.set(nextY);
      boxW.set(nextW);
      boxH.set(nextH);
    });

  const blPan = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startX.set(boxX.value);
      startY.set(boxY.value);
      startW.set(boxW.value);
      startH.set(boxH.value);
    })
    .onUpdate((e) => {
      'worklet';
      const curRatio = ratioMode.value;
      const targetRatio = curRatio === '1:1' ? 1 : curRatio === '3:4' ? 3 / 4 : curRatio === '4:3' ? 4 / 3 : null;

      let nextX = Math.min(startX.value + startW.value - MIN_SIZE, Math.max(boundLeft.value, startX.value + e.translationX));
      let nextW = startX.value + startW.value - nextX;
      let nextH = Math.max(MIN_SIZE, Math.min(boundBottom.value - startY.value, startH.value + e.translationY));

      if (targetRatio !== null) {
        const side = Math.min(nextW, nextH * targetRatio);
        nextW = side;
        nextH = side / targetRatio;
        nextX = startX.value + startW.value - nextW;
      }
      boxX.set(nextX);
      boxW.set(nextW);
      boxH.set(nextH);
    });

  const brPan = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startX.set(boxX.value);
      startY.set(boxY.value);
      startW.set(boxW.value);
      startH.set(boxH.value);
    })
    .onUpdate((e) => {
      'worklet';
      const curRatio = ratioMode.value;
      const targetRatio = curRatio === '1:1' ? 1 : curRatio === '3:4' ? 3 / 4 : curRatio === '4:3' ? 4 / 3 : null;

      let nextW = Math.max(MIN_SIZE, Math.min(boundRight.value - startX.value, startW.value + e.translationX));
      let nextH = Math.max(MIN_SIZE, Math.min(boundBottom.value - startY.value, startH.value + e.translationY));

      if (targetRatio !== null) {
        const side = Math.min(nextW, nextH * targetRatio);
        nextW = side;
        nextH = side / targetRatio;
      }
      boxW.set(nextW);
      boxH.set(nextH);
    });

  // Animated styles for frame and mask
  const frameStyle = useAnimatedStyle(() => ({
    left: boxX.value,
    top: boxY.value,
    width: boxW.value,
    height: boxH.value,
  }));

  const topMaskStyle = useAnimatedStyle(() => ({
    height: Math.max(0, boxY.value),
  }));

  const bottomMaskStyle = useAnimatedStyle(() => ({
    top: boxY.value + boxH.value,
  }));

  const leftMaskStyle = useAnimatedStyle(() => ({
    top: boxY.value,
    height: boxH.value,
    width: Math.max(0, boxX.value),
  }));

  const rightMaskStyle = useAnimatedStyle(() => ({
    top: boxY.value,
    height: boxH.value,
    left: boxX.value + boxW.value,
    right: 0,
  }));

  const tlHandleStyle = useAnimatedStyle(() => ({
    left: boxX.value - HANDLE_SIZE / 2,
    top: boxY.value - HANDLE_SIZE / 2,
  }));

  const trHandleStyle = useAnimatedStyle(() => ({
    left: boxX.value + boxW.value - HANDLE_SIZE / 2,
    top: boxY.value - HANDLE_SIZE / 2,
  }));

  const blHandleStyle = useAnimatedStyle(() => ({
    left: boxX.value - HANDLE_SIZE / 2,
    top: boxY.value + boxH.value - HANDLE_SIZE / 2,
  }));

  const brHandleStyle = useAnimatedStyle(() => ({
    left: boxX.value + boxW.value - HANDLE_SIZE / 2,
    top: boxY.value + boxH.value - HANDLE_SIZE / 2,
  }));

  // Tools
  const rotateRight = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const resetCrop = () => {
    if (metrics) {
      const b = calculateRatioBox(ratio, metrics.dispW, metrics.dispH, metrics.offsetX, metrics.offsetY);
      boxX.set(b.x);
      boxY.set(b.y);
      boxW.set(b.w);
      boxH.set(b.h);
    }
  };

  const handleRatioSelect = (newRatio: Ratio) => {
    setRatio(newRatio);
    ratioMode.set(newRatio);
    if (metrics) {
      const b = calculateRatioBox(newRatio, metrics.dispW, metrics.dispH, metrics.offsetX, metrics.offsetY);
      boxX.set(b.x);
      boxY.set(b.y);
      boxW.set(b.w);
      boxH.set(b.h);
    }
  };

  const handleDone = async () => {
    if (!metrics || processing) return;
    setProcessing(true);

    try {
      const { effW, effH, scale, offsetX, offsetY } = metrics;

      let originX = Math.round((boxX.value - offsetX) / scale);
      let originY = Math.round((boxY.value - offsetY) / scale);
      let width = Math.round(boxW.value / scale);
      let height = Math.round(boxH.value / scale);

      originX = Math.max(0, Math.min(originX, effW - 10));
      originY = Math.max(0, Math.min(originY, effH - 10));
      width = Math.max(10, Math.min(width, effW - originX));
      height = Math.max(10, Math.min(height, effH - originY));

      const actions: Action[] = [];
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }
      actions.push({
        crop: {
          originX,
          originY,
          width,
          height,
        },
      });

      // Standardize image dimension (max 1080px)
      if (width > 1080 || height > 1080) {
        actions.push({
          resize: width >= height ? { width: 1080 } : { height: 1080 },
        });
      }

      const res = await manipulateAsync(imageUri, actions, {
        compress: 0.85,
        format: SaveFormat.JPEG,
      });

      onDone(res.uri);
    } catch {
      onCancel();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <Round label="Cancelar recorte" bg="rgba(255,255,255,0.14)" onPress={onCancel}>
          <CloseIcon color="#FFFFFF" size={20} />
        </Round>
        <Txt style={styles.topTitle}>Recortar prenda</Txt>
        <Tap
          accessibilityRole="button"
          accessibilityLabel="Aplicar recorte"
          disabled={processing || !metrics}
          onPress={handleDone}
          style={styles.doneBtn}>
          {processing ? (
            <ActivityIndicator size="small" color={C.tinta} />
          ) : (
            <>
              <CheckIcon size={20} color={C.tinta} />
              <Text style={styles.doneText}>Listo</Text>
            </>
          )}
        </Tap>
      </View>

      {/* Main Crop Workspace */}
      <View
        style={styles.workspace}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setContainer({ width, height });
        }}>
        {metrics && (
          <View
            style={[
              styles.imageContainer,
              {
                width: metrics.dispW,
                height: metrics.dispH,
                left: metrics.offsetX,
                top: metrics.offsetY,
              },
            ]}>
            <RNImage
              source={{ uri: imageUri }}
              style={[
                StyleSheet.absoluteFill,
                {
                  transform: [{ rotate: `${rotation}deg` }],
                },
              ]}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Dark Dim Overlays (Letterbox mask) */}
        {metrics && (
          <>
            <Animated.View style={[styles.maskTop, topMaskStyle]} />
            <Animated.View style={[styles.maskBottom, bottomMaskStyle]} />
            <Animated.View style={[styles.maskSide, leftMaskStyle]} />
            <Animated.View style={[styles.maskSide, rightMaskStyle]} />

            {/* Active Crop Box Frame & Center Drag */}
            <GestureDetector gesture={centerPan}>
              <Animated.View style={[styles.cropFrame, frameStyle]}>
                {/* Rule of Thirds Grid Lines */}
                <View style={[styles.gridLineV, { left: '33.33%' }]} pointerEvents="none" />
                <View style={[styles.gridLineV, { left: '66.66%' }]} pointerEvents="none" />
                <View style={[styles.gridLineH, { top: '33.33%' }]} pointerEvents="none" />
                <View style={[styles.gridLineH, { top: '66.66%' }]} pointerEvents="none" />

                {/* Corner Indicators */}
                <View style={[styles.cornerVisual, styles.cTL]} pointerEvents="none" />
                <View style={[styles.cornerVisual, styles.cTR]} pointerEvents="none" />
                <View style={[styles.cornerVisual, styles.cBL]} pointerEvents="none" />
                <View style={[styles.cornerVisual, styles.cBR]} pointerEvents="none" />
              </Animated.View>
            </GestureDetector>

            {/* Touch Handles for Corners */}
            <GestureDetector gesture={tlPan}>
              <Animated.View style={[styles.handleTouch, tlHandleStyle]} />
            </GestureDetector>
            <GestureDetector gesture={trPan}>
              <Animated.View style={[styles.handleTouch, trHandleStyle]} />
            </GestureDetector>
            <GestureDetector gesture={blPan}>
              <Animated.View style={[styles.handleTouch, blHandleStyle]} />
            </GestureDetector>
            <GestureDetector gesture={brPan}>
              <Animated.View style={[styles.handleTouch, brHandleStyle]} />
            </GestureDetector>
          </>
        )}
      </View>

      {/* Tools Toolbar: Ratios, Rotate, Reset */}
      <View style={styles.toolbar}>
        <View style={styles.ratioGroup}>
          {(['1:1', '3:4', '4:3', 'free'] as Ratio[]).map((r) => {
            const active = ratio === r;
            const label = r === 'free' ? 'Libre' : r;
            return (
              <Tap
                key={r}
                onPress={() => handleRatioSelect(r)}
                style={[styles.ratioPill, active && styles.ratioPillActive]}>
                <Text style={[styles.ratioText, active && styles.ratioTextActive]}>{label}</Text>
              </Tap>
            );
          })}
        </View>

        <View style={styles.actionRow}>
          <Tap onPress={rotateRight} style={styles.toolBtn}>
            <RotateCwIcon color="#FFFFFF" size={20} />
            <Text style={styles.toolBtnText}>Girar 90°</Text>
          </Tap>

          <Tap onPress={resetCrop} style={styles.toolBtn}>
            <Text style={styles.toolBtnText}>Centrar</Text>
          </Tap>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#051811',
    zIndex: 9999,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.gutter,
    height: 52,
  },
  topTitle: {
    fontFamily: F.bodyBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  doneBtn: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: C.lima,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doneText: {
    fontFamily: F.bodyHeavy,
    fontSize: 15,
    color: C.tinta,
  },
  workspace: {
    flex: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  maskBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  maskSide: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  cropFrame: {
    position: 'absolute',
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderWidth: 1,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  cornerVisual: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: C.lima,
  },
  cTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  handleTouch: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    zIndex: 10,
  },
  toolbar: {
    paddingHorizontal: SIZES.gutter,
    paddingTop: 12,
    gap: 12,
  },
  ratioGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ratioPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  ratioPillActive: {
    backgroundColor: C.lima,
  },
  ratioText: {
    fontFamily: F.bodyBold,
    fontSize: 13,
    color: '#D4E8DC',
  },
  ratioTextActive: {
    color: C.tinta,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  toolBtnText: {
    fontFamily: F.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
