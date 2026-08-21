import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../lib/theme';
import { Brand, Page } from './ui';

export function AppHeader({
  back,
  title,
  actionLabel,
  onAction,
}: {
  back?: boolean;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Page
      style={{
        paddingTop: Math.max(insets.top, spacing.md) + spacing.sm,
        paddingBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        {back ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} hitSlop={12} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'flex-start' }}>
            <Text style={{ color: colors.textDim, fontFamily: fonts.sansBold, fontSize: 13, letterSpacing: 1.4 }}>
              ← BACK
            </Text>
          </Pressable>
        ) : (
          <Brand compact />
        )}
      </View>
      {!!title && (
        <Text style={{ color: colors.text, fontFamily: fonts.sansBold, fontSize: 13, letterSpacing: 1.4, textTransform: 'uppercase' }}>
          {title}
        </Text>
      )}
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        {!!actionLabel && !!onAction && (
          <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} hitSlop={12} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'flex-end' }}>
            <Text style={{ color: colors.muted, fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' }}>
              {actionLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </Page>
  );
}
