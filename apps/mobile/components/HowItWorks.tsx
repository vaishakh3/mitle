// First-visit primer: the ritual in three beats. Dismissed once, remembered.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, fonts, spacing } from '../lib/theme';
import { Body, Card, Label } from './ui';

const KEY = 'mc.howItWorks.dismissed';

const BEATS = [
  { n: 'I', text: 'Every day, one stranger nearby is chosen for you. No browsing. No photos.' },
  { n: 'II', text: 'Two yeses, and we book the meet-cute: a cafe, an hour, a hint to find each other.' },
  { n: 'III', text: 'When the hour ends, the match is gone for good. The rest happens in real life.' },
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
        <Label style={{ color: colors.rose }}>The ritual</Label>
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
          onPress={() => {
            AsyncStorage.setItem(KEY, '1');
            setVisible(false);
          }}
          hitSlop={8}
          style={{ alignSelf: 'flex-end', marginTop: spacing.xs }}
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
