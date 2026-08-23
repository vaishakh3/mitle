import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  ScrollViewProps,
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
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.edgeRail} />
      {children}
    </View>
  );
}

export function Page({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.page, style]} {...rest}>
      {children}
    </View>
  );
}

export function PageScroll({ contentContainerStyle, ...rest }: ScrollViewProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.pageScroll, contentContainerStyle]}
      {...rest}
    />
  );
}

interface CardProps extends ViewProps {
  tone?: 'default' | 'warm' | 'paper' | 'outlined';
}

export function Card({ children, style, tone = 'default', ...rest }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        tone === 'warm' && styles.cardWarm,
        tone === 'paper' && styles.cardPaper,
        tone === 'outlined' && styles.cardOutlined,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Hairline({ style }: { style?: ViewProps['style'] }) {
  return <View style={[styles.hairline, style]} />;
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
export const Subtitle = makeText(type.subtitle, colors.text);
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

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View accessible accessibilityRole="text" accessibilityLabel="Milte. Meet for real." style={styles.brandLockup}>
      <Image
        accessibilityIgnoresInvertColors
        source={require('../assets/milte-symbol-reversed.png')}
        style={[styles.brandSymbol, compact && styles.brandSymbolCompact]}
      />
      <View style={{ gap: compact ? 0 : 1 }}>
        <Text style={[styles.brandWord, compact && styles.brandWordCompact]}>milte</Text>
        {!compact && <Text style={styles.brandLine}>meet for real<Text style={{ color: colors.accentText }}>.</Text></Text>}
      </View>
    </View>
  );
}

/* ---------------------------------- button --------------------------------- */

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityHint,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const busy = disabled || loading;
  const isPrimary = variant === 'primary';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!busy, busy: !!loading }}
      onPress={onPress}
      disabled={busy}
      onPressIn={() => (scale.value = withSpring(0.975, { damping: 20, stiffness: 400 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 20, stiffness: 400 }))}
      style={[
        styles.button,
        isPrimary && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'quiet' && styles.buttonQuiet,
        variant === 'danger' && styles.buttonDanger,
        busy && styles.disabled,
        animStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.paper : colors.text} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isPrimary && { color: colors.paper },
            variant === 'secondary' && { color: colors.paper },
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

export function TextButton({ label, onPress, danger = false }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10} style={styles.textButton}>
      <Text style={[styles.textButtonLabel, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
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
      style={[styles.input, focused && styles.inputFocused, props.style]}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Label>{label}</Label>
      {children}
      {!!hint && <Small>{hint}</Small>}
    </View>
  );
}

/* ----------------------------------- chip ---------------------------------- */

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}

export function Chip({ label, selected, onPress, compact = false }: ChipProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        scale.value = withSpring(0.94, { damping: 15, stiffness: 500 });
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        onPress();
      }}
      style={[styles.chip, compact && styles.chipCompact, selected && styles.chipSelected, animStyle]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </AnimatedPressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

export function ChoiceCard({
  title,
  body,
  selected,
  onPress,
}: {
  title: string;
  body: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choiceCard, selected && styles.choiceCardSelected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioCore} />}</View>
      <View style={{ flex: 1, gap: 3 }}>
        <Body style={{ color: colors.text, fontFamily: fonts.sansBold }}>{title}</Body>
        <Small>{body}</Small>
      </View>
    </Pressable>
  );
}

export function CheckRow({
  checked,
  onPress,
  children,
}: {
  checked: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.checkRow}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Small style={{ color: colors.textDim, flex: 1 }}>{children}</Small>
    </Pressable>
  );
}

/* -------------------------------- progress -------------------------------- */

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: current + 1 }} style={styles.dotsRow}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current && styles.dotCurrent,
            i < current && styles.dotDone,
          ]}
        />
      ))}
    </View>
  );
}

export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'rose' | 'amber' | 'sage';
}) {
  const color = tone === 'rose' ? colors.accentText : tone === 'amber' ? colors.amber : tone === 'sage' ? colors.sage : colors.muted;
  return (
    <View style={[styles.statusPill, { borderColor: `${color}66`, backgroundColor: `${color}14` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

export function Rule({ mark, title, body }: { mark: string; title: string; body: string }) {
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`${title}. ${body}`} style={styles.rule}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.ruleMark}>
        <Text allowFontScaling={false} numberOfLines={1} style={styles.ruleMarkText}>{mark}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Body style={{ color: colors.text, fontFamily: fonts.sansBold }}>{title}</Body>
        <Small>{body}</Small>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  edgeRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.rose },
  page: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: spacing.lg, boxSizing: 'border-box' },
  pageScroll: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  cardWarm: { backgroundColor: colors.surfaceWarm, borderColor: colors.roseDeep },
  cardPaper: { backgroundColor: colors.paper, borderColor: colors.paperShade },
  cardOutlined: { backgroundColor: 'transparent', borderColor: colors.border },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.md },
  hairline: { height: 1, backgroundColor: colors.borderSoft },
  button: {
    borderRadius: radii.sm,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandSymbol: { width: 42, height: 42 },
  brandSymbolCompact: { width: 30, height: 30 },
  brandWord: { color: colors.text, fontFamily: fonts.sansBold, fontSize: 27, lineHeight: 29, letterSpacing: -1.3 },
  brandWordCompact: { fontSize: 21, lineHeight: 23, letterSpacing: -1 },
  brandLine: { color: colors.textDim, fontFamily: fonts.sansMedium, fontSize: 11, lineHeight: 13, letterSpacing: -0.1 },
  buttonPrimary: {
    backgroundColor: colors.rose,
  },
  buttonSecondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  buttonGhost: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  buttonQuiet: { minHeight: 48, paddingVertical: 9 },
  buttonDanger: { borderWidth: 1, borderColor: 'rgba(232,93,93,0.42)', backgroundColor: 'rgba(232,93,93,0.06)' },
  buttonText: { fontSize: 15, fontFamily: fonts.sansBold, letterSpacing: 0.25 },
  disabled: { opacity: 0.42 },
  textButton: { minHeight: 48, paddingVertical: 5, justifyContent: 'center' },
  textButtonLabel: { color: colors.muted, fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  input: {
    minWidth: 0,
    backgroundColor: 'rgba(26,23,32,0.92)',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    color: colors.text,
    fontSize: 16,
    fontFamily: fonts.sans,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
  },
  inputFocused: { borderColor: colors.rose, backgroundColor: colors.surface },
  chip: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: 'center',
  },
  chipCompact: { paddingHorizontal: 13, paddingVertical: 8 },
  chipSelected: { backgroundColor: colors.paper, borderColor: colors.paper },
  chipText: { color: colors.textDim, fontSize: 14, fontFamily: fonts.sansMedium },
  chipTextSelected: { color: colors.ink, fontFamily: fonts.sansBold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  choiceCardSelected: { borderColor: colors.rose, backgroundColor: colors.surfaceWarm },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.rose },
  radioCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.rose },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: spacing.sm, minHeight: 48 },
  checkbox: { width: 22, height: 22, borderRadius: 3, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: colors.rose, borderColor: colors.rose },
  checkmark: { color: colors.paper, fontFamily: fonts.sansBold, fontSize: 14 },
  dotsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  dotCurrent: { backgroundColor: colors.rose },
  dotDone: { backgroundColor: colors.blush },
  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 11, paddingVertical: 7 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  rule: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  ruleMark: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  ruleMarkText: {
    color: colors.blush,
    fontFamily: fonts.sansBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    width: 28,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
