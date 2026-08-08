// A quiet, slowly twinkling starfield — the night the city meets under.
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../lib/theme';

function Star({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const opacity = useSharedValue(0.1);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0.9, { duration: 2200 + delay / 3, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.blush,
        },
        style,
      ]}
    />
  );
}

export function Starfield({ count = 26 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height * 0.85,
        size: Math.random() < 0.75 ? 2 : 3,
        delay: Math.random() * 4000,
      })),
    [count, width, height],
  );
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {stars.map((s) => (
        <Star key={s.id} {...s} />
      ))}
    </Animated.View>
  );
}
