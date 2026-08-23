import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
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
    opacity: 0.28 + phase.value * 0.42,
    transform: [{ scale: 0.92 + phase.value * 0.08 }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[styles.frame, { width: size, height: size }, pulseStyle]} />
      <Image
        accessibilityIgnoresInvertColors
        source={require('../assets/milte-symbol-reversed.png')}
        resizeMode="contain"
        style={{ width: size * 0.74, height: size * 0.74 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.rose,
    backgroundColor: 'transparent',
  },
});
