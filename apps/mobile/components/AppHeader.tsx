import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../lib/theme';
import type { AvatarId } from '../lib/types';
import { AvatarToken } from './AvatarToken';
import { Brand, Page } from './ui';

export function AppHeader({
  back,
  title,
  actionLabel,
  avatarId,
  onAction,
}: {
  back?: boolean;
  title?: string;
  actionLabel?: string;
  avatarId?: AvatarId;
  onAction?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Page
      style={{
        paddingTop: Math.max(insets.top, spacing.md) + spacing.sm,
        paddingBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomColor: colors.borderSoft,
        borderBottomWidth: 1,
      }}
    >
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        {back ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} hitSlop={12} style={styles.control}>
            <Text style={styles.backArrow}>
              ←
            </Text>
          </Pressable>
        ) : (
          <Brand compact />
        )}
      </View>
      {!!title && (
        <Text style={styles.title}>
          {title}
        </Text>
      )}
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        {!!onAction && (!!actionLabel || !!avatarId) && (
          <Pressable accessibilityRole="button" accessibilityLabel={actionLabel ?? 'Your corner'} onPress={onAction} hitSlop={12} style={[styles.action, avatarId && styles.avatarAction]}>
            {avatarId ? <AvatarToken id={avatarId} size={40} /> : <Text style={styles.actionText}>{actionLabel}</Text>}
          </Pressable>
        )}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  control: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backArrow: { color: colors.text, fontFamily: fonts.sansBold, fontSize: 20, lineHeight: 22 },
  title: {
    color: colors.text,
    fontFamily: fonts.sansBold,
    fontSize: 14,
    letterSpacing: 0.1,
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 48,
    paddingHorizontal: 14,
  },
  avatarAction: { minWidth: 40, paddingHorizontal: 0 },
  actionText: {
    color: colors.textDim,
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
