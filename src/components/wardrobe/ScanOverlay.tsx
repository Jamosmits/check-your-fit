import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = colors.white;
const SCAN_LINE_COLOR = 'rgba(255, 255, 255, 0.7)';

function Corner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const isTop = position.startsWith('t');
  const isLeft = position.endsWith('l');

  return (
    <View
      style={[
        styles.corner,
        isTop ? { top: 0 } : { bottom: 0 },
        isLeft ? { left: 0 } : { right: 0 },
      ]}
    >
      <View
        style={[
          styles.cornerHorizontal,
          { backgroundColor: CORNER_COLOR },
          isTop ? { top: 0 } : { bottom: 0 },
          isLeft ? { left: 0 } : { right: 0 },
        ]}
      />
      <View
        style={[
          styles.cornerVertical,
          { backgroundColor: CORNER_COLOR },
          isTop ? { top: 0 } : { bottom: 0 },
          isLeft ? { left: 0 } : { right: 0 },
        ]}
      />
    </View>
  );
}

interface ScanOverlayProps {
  active?: boolean;
}

export function ScanOverlay({ active = true }: ScanOverlayProps) {
  const scanLineY = useSharedValue(0);

  useEffect(() => {
    if (active) {
      scanLineY.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(scanLineY);
    }
    return () => cancelAnimation(scanLineY);
  }, [active, scanLineY]);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${scanLineY.value * 100}%`,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Dark overlay */}
      <View style={styles.overlayTop} />
      <View style={styles.overlayMiddle}>
        <View style={styles.overlaySide} />
        <View style={styles.scanArea}>
          <Corner position="tl" />
          <Corner position="tr" />
          <Corner position="bl" />
          <Corner position="br" />
          {active && (
            <Animated.View style={[styles.scanLine, scanLineStyle]}>
              <View style={styles.scanLineInner} />
            </Animated.View>
          )}
        </View>
        <View style={styles.overlaySide} />
      </View>
      <View style={styles.overlayBottom} />
    </View>
  );
}

const SCAN_AREA_WIDTH = SCREEN_WIDTH * 0.8;
const SCAN_AREA_HEIGHT = SCREEN_HEIGHT * 0.55;
const SIDE_WIDTH = (SCREEN_WIDTH - SCAN_AREA_WIDTH) / 2;
const TOP_HEIGHT = (SCREEN_HEIGHT - SCAN_AREA_HEIGHT) / 3;

const styles = StyleSheet.create({
  overlayTop: {
    height: TOP_HEIGHT,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_AREA_HEIGHT,
  },
  overlaySide: {
    width: SIDE_WIDTH,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  scanArea: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerHorizontal: {
    position: 'absolute',
    height: CORNER_THICKNESS,
    width: CORNER_SIZE,
  },
  cornerVertical: {
    position: 'absolute',
    width: CORNER_THICKNESS,
    height: CORNER_SIZE,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
  },
  scanLineInner: {
    height: 2,
    backgroundColor: SCAN_LINE_COLOR,
    shadowColor: SCAN_LINE_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
});
