// First-visit primer: the ritual in three beats. Dismissed once, remembered.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../lib/theme';
import { Body, Subtitle } from './ui';

const KEY = 'milte.howItWorks.dismissed';

const BEATS = [
  { lead: 'One introduction.', text: 'On an available day, one nearby stranger may be chosen. No feed and no popularity contest.' },
  { lead: 'Two private yeses.', text: 'A mutual choice reveals a named public place, one hour, and a private clue.' },
  { lead: 'Then, offline.', text: 'Day-of signals prevent guessing. When the hour ends, the live match is gone.' },
];

export function HowItWorks() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => setVisible(v !== '1'));
  }, []);

  if (!visible) return null;

  return (
    <View style={{ borderTopColor: colors.borderSoft, borderTopWidth: 1, gap: spacing.md, marginBottom: spacing.lg, paddingTop: spacing.lg }}>
        <Subtitle>How Milte works</Subtitle>
        {BEATS.map((b) => (
          <View key={b.lead} style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontFamily: fonts.sansBold, fontSize: 15 }}>{b.lead}</Text>
            <Body>{b.text}</Body>
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
              fontSize: 14,
              color: colors.text,
            }}
          >
            Got it
          </Text>
        </Pressable>
    </View>
  );
}
