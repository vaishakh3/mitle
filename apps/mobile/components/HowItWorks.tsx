// First-visit primer: the ritual in three beats. Dismissed once, remembered.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, fonts, spacing } from '../lib/theme';
import { Body, Card, Label } from './ui';

const KEY = 'milte.howItWorks.dismissed';

const BEATS = [
  { n: 'I', text: 'On an available day, one nearby stranger may be chosen. No feed and no popularity contest.' },
  { n: 'II', text: 'Two yeses reveal a named public place, one hour, and a private clue to find each other.' },
  { n: 'III', text: 'Day-of signals prevent guessing. When the hour ends, the live match is gone.' },
];

export function HowItWorks() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => setVisible(v !== '1'));
  }, []);

  if (!visible) return null;

  return (
    <Animated.View entering={FadeInDown.duration(700)} style={{ marginBottom: spacing.lg }}>
      <Card>
        <Label style={{ color: colors.accentText }}>How a maybe becomes a meeting</Label>
        <View style={{ height: spacing.sm }} />
        {BEATS.map((b) => (
          <View key={b.n} style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm }}>
            <Text
              style={{
                fontFamily: fonts.serifItalic,
                fontSize: 18,
                color: colors.blush,
                width: 24,
                textAlign: 'center',
              }}
            >
              {b.n}
            </Text>
            <Body style={{ flex: 1 }}>{b.text}</Body>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss how Milte works"
          onPress={() => {
            AsyncStorage.setItem(KEY, '1');
            setVisible(false);
          }}
          hitSlop={8}
          style={{ alignSelf: 'flex-end', marginTop: spacing.xs, minHeight: 48, justifyContent: 'center' }}
        >
          <Text
            style={{
              fontFamily: fonts.sansBold,
              fontSize: 12,
              letterSpacing: 2,
              color: colors.muted,
            }}
          >
            GOT IT
          </Text>
        </Pressable>
      </Card>
    </Animated.View>
  );
}
