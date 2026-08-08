import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from 'react-native';
import { colors, spacing } from '../lib/theme';

export function Screen({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.screen, style]} {...rest}>
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

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        (disabled || pressed) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.bg : colors.text} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'primary' ? { color: colors.bg } : { color: colors.text },
            variant === 'danger' && { color: colors.danger },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      style={styles.input}
      {...props}
    />
  );
}

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && { color: colors.bg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  muted: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonGhost: { borderWidth: 1, borderColor: colors.cardBorder },
  buttonDanger: { borderWidth: 1, borderColor: colors.danger },
  buttonText: { fontSize: 16, fontWeight: '700' },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    margin: 4,
  },
  chipSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '600' },
});
