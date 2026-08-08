import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewProps,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, fonts, radii, spacing, type } from '../lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* ---------------------------------- layout --------------------------------- */

export function Screen({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.screen, style]} {...rest}>
      <LinearGradient
        colors={[colors.bg, colors.bgDeep]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      {children}
    </View>
  );
}

export function Card({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

/* --------------------------------- typography ------------------------------- */

function makeText(base: TextStyle, color: string) {
  return function Typo({ style, children, ...rest }: TextProps) {
    return (
      <Text style={[base, { color }, style]} {...rest}>
        {children}
      </Text>
    );
  };
}

export const Display = makeText(type.display, colors.text);
export const Title = makeText(type.title, colors.text);
export const Poetic = makeText(type.poetic, colors.textDim);
export const Body = makeText(type.body, colors.textDim);
export const Small = makeText(type.small, colors.muted);

export function Label({ style, children, ...rest }: TextProps) {
  return (
    <Text
      style={[type.label, { color: colors.muted, textTransform: 'uppercase' }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

/* ---------------------------------- button --------------------------------- */

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'quiet' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isPrimary = variant === 'primary';

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => (scale.value = withSpring(0.97, { damping: 20, stiffness: 400 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 20, stiffness: 400 }))}
      style={[
        styles.button,
        isPrimary && styles.buttonPrimary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'quiet' && styles.buttonQuiet,
        variant === 'danger' && styles.buttonDanger,
        disabled && { opacity: 0.4 },
        animStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.bgDeep : colors.text} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isPrimary && { color: colors.bgDeep },
            variant === 'ghost' && { color: colors.text },
            variant === 'quiet' && { color: colors.muted, fontFamily: fonts.sansMedium },
            variant === 'danger' && { color: colors.danger },
          ]}
        >
          {title}
        </Text>
      )}
    </AnimatedPressable>
  );
}

/* ----------------------------------- input --------------------------------- */

export function Input(props: TextInputProps) {
  const [focused, setFocused] = React.useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.faint}
      selectionColor={colors.rose}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[styles.input, focused && { borderColor: colors.rose }, props.style]}
    />
  );
}

/* ----------------------------------- chip ---------------------------------- */

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={() => {
        scale.value = withSpring(0.92, { damping: 15, stiffness: 500 });
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        onPress();
      }}
      style={[styles.chip, selected && styles.chipSelected, animStyle]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </AnimatedPressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

/* -------------------------------- progress dots ----------------------------- */

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current && { backgroundColor: colors.rose, width: 22 },
            i < current && { backgroundColor: colors.blush },
          ]}
        />
      ))}
    </View>
  );
}

/* ---------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.md },
  button: {
    borderRadius: radii.pill,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  buttonPrimary: {
    backgroundColor: colors.rose,
    shadowColor: colors.rose,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  buttonGhost: { borderWidth: 1, borderColor: colors.border },
  buttonQuiet: { minHeight: 44, paddingVertical: 10 },
  buttonDanger: { borderWidth: 1, borderColor: 'rgba(232,93,93,0.4)' },
  buttonText: { fontSize: 16, fontFamily: fonts.sansBold, letterSpacing: 0.3 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: 16,
    fontFamily: fonts.sans,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
  },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipSelected: { backgroundColor: colors.rose, borderColor: colors.rose },
  chipText: { color: colors.textDim, fontSize: 14, fontFamily: fonts.sansMedium },
  chipTextSelected: { color: colors.bgDeep, fontFamily: fonts.sansBold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dotsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
});
