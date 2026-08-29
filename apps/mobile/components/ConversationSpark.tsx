import React, { useState } from 'react';
import { View } from 'react-native';
import { colors, spacing } from '../lib/theme';
import { Button, Label, Poetic, Small } from './ui';

const PROMPTS = [
  'What’s something you changed your mind about recently?',
  'Which ordinary day from your life would you happily repeat?',
  'What are you quietly looking forward to?',
  'What place in this city feels most like yours?',
  'What’s a tiny thing that reliably makes your day better?',
  'Which friend knows you best—and what would they say about you?',
  'What would you try if you knew you couldn’t be embarrassed?',
  'What have you made time for lately that was completely worth it?',
];

export function ConversationSpark() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * PROMPTS.length));
  return (
    <View style={{ borderBottomColor: colors.borderSoft, borderBottomWidth: 1, borderTopColor: colors.borderSoft, borderTopWidth: 1, gap: spacing.md, paddingVertical: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Label style={{ color: colors.blush }}>If the silence needs a spark</Label>
        <Poetic style={{ color: colors.text, fontSize: 22, lineHeight: 31 }}>{PROMPTS[index]}</Poetic>
      </View>
      <Small>No games, no compatibility score—just a better question than “so, what do you do?”</Small>
      <Button title="Another question" variant="ghost" onPress={() => setIndex((value) => (value + 1) % PROMPTS.length)} />
    </View>
  );
}
