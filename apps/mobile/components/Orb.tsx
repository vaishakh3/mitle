// The algorithm, breathing. A soft rose orb that pulses while fate deliberates.
import { LinearGradient } from 'expo-linear-gradient';
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

export function Orb({ size = 120 }: { size?: number }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [pulse]);

  const halo = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.35 }],
    opacity: 0.35 - pulse.value * 0.25,
  }));
  const core = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.05 }],
  }));

  return (
    <View style={{ width: size * 1.8, height: size * 1.8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: size,
            backgroundColor: colors.rose,
          },
          halo,
        ]}
      />
      <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, core]}>
        <LinearGradient
          colors={[colors.blush, colors.rose, colors.roseDeep]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.8, y: 1 }}
        />
      </Animated.View>
    </View>
  );
}
