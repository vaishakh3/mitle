import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, spacing } from '../lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MeetingPoint({ onOpen }: { onOpen: () => void }) {
  const progress = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 1 - progress.value * 0.08 }],
  }));

  function open() {
    progress.value = withSequence(
      withTiming(0.08, { duration: 90 }),
      withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onOpen)();
      }),
    );
  }

  return (
    <View style={styles.wrap}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Open today’s private possibility"
        accessibilityHint="Shows the decision screen for today’s match"
        onPress={open}
        hitSlop={18}
        style={[styles.button, animatedStyle]}
      >
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.cornerTop} />
        <Image
          accessibilityIgnoresInvertColors
          source={require('../assets/milte-symbol-reversed.png')}
          resizeMode="contain"
          style={styles.symbol}
        />
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.cornerBottom} />
      </AnimatedPressable>
      <Text style={styles.caption}>OPEN TODAY’S POSSIBILITY</Text>
      <Text style={styles.subcaption}>your answer stays private</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  button: {
    width: 176,
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  symbol: { width: 120, height: 120 },
  cornerTop: { position: 'absolute', top: -1, left: -1, width: 42, height: 4, backgroundColor: colors.rose },
  cornerBottom: { position: 'absolute', right: -1, bottom: -1, width: 4, height: 42, backgroundColor: colors.amber },
  caption: { color: colors.text, fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1.8 },
  subcaption: { color: colors.muted, fontFamily: fonts.sans, fontSize: 13 },
});
