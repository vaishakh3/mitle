// The daily ritual: today's match arrives sealed. Press to break it open.
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts } from '../lib/theme';

const SIZE = 132;

export function WaxSeal({ onBreak }: { onBreak: () => void }) {
  const pulse = useSharedValue(0);
  const crack = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [pulse]);

  const halo = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.25 }],
    opacity: 0.3 - pulse.value * 0.22,
  }));
  const seal = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + pulse.value * 0.02 - crack.value * 0.15 },
      { rotate: `${crack.value * 12}deg` },
    ],
    opacity: 1 - crack.value,
  }));

  function breakSeal() {
    crack.value = withSequence(
      withTiming(0.12, { duration: 90 }),
      withTiming(1, { duration: 420, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onBreak)();
      }),
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable onPress={breakSeal} hitSlop={20}>
        <View style={styles.wrap}>
          <Animated.View style={[styles.halo, halo]} />
          <Animated.View style={[styles.seal, seal]}>
            <LinearGradient
              colors={[colors.rose, colors.roseDeep]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.2, y: 0.1 }}
              end={{ x: 0.9, y: 1 }}
            />
            <View style={styles.ring} />
            <Text style={styles.mark}>mc</Text>
          </Animated.View>
        </View>
      </Pressable>
      <Text style={styles.caption}>BREAK THE SEAL</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE * 1.6,
    height: SIZE * 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: SIZE * 1.35,
    height: SIZE * 1.35,
    borderRadius: SIZE,
    backgroundColor: colors.rose,
  },
  seal: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.rose,
    shadowOpacity: 0.6,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  ring: {
    position: 'absolute',
    width: SIZE - 22,
    height: SIZE - 22,
    borderRadius: (SIZE - 22) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(244,237,227,0.55)',
  },
  mark: {
    fontFamily: fonts.serifItalic,
    fontSize: 44,
    color: colors.paper,
  },
  caption: {
    marginTop: 4,
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.muted,
  },
});
