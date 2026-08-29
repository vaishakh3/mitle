import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../lib/theme';

export function MiltePulse({ size = 96 }: { size?: number }) {
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [phase]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + phase.value * 0.65,
  }));

  return (
    <View style={{ width: size, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.line, { width: size }]} />
      <Animated.View style={[styles.dot, pulseStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    backgroundColor: colors.text,
    height: 1,
  },
  dot: { backgroundColor: colors.rose, borderRadius: 6, height: 12, width: 12 },
});
