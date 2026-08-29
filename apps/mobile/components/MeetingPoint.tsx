import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
        <View style={styles.copy}>
          <Text style={styles.title}>Open today’s match</Text>
          <Text style={styles.note}>Your answer stays private</Text>
        </View>
        <Text accessible={false} allowFontScaling={false} style={styles.symbol}>
          m<Text style={styles.question}>?</Text>
        </Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'stretch', alignSelf: 'stretch' },
  button: {
    minHeight: 84,
    alignSelf: 'stretch',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  copy: { flex: 1, gap: 3 },
  title: { color: colors.onAccent, fontFamily: fonts.serif, fontSize: 19, lineHeight: 24 },
  note: { color: '#C9CED3', fontFamily: fonts.sans, fontSize: 13 },
  symbol: { color: colors.onAccent, fontFamily: fonts.serifBold, fontSize: 31, lineHeight: 38, letterSpacing: -2 },
  question: { color: colors.marigold, fontFamily: fonts.serifBold },
});
