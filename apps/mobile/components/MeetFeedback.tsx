// Post-window closure: one anonymous tap. Doubles as the safety-report entry
// point at the exact moment it matters.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { submitMeetFeedback } from '../lib/api';
import * as dialog from '../lib/dialog';
import { colors, fonts, spacing } from '../lib/theme';
import type { MeetOutcome, PendingFeedback } from '../lib/types';
import { Button, Card, Label, Poetic, Small } from './ui';

export function MeetFeedbackCard({ feedback }: { feedback: PendingFeedback }) {
  const qc = useQueryClient();
  const submit = useMutation({
    mutationFn: ({ outcome, reason }: { outcome: MeetOutcome; reason?: string }) =>
      submitMeetFeedback(feedback.history_id, outcome, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pendingFeedback'] }),
    onError: (err) => dialog.alert('Hmm', err instanceof Error ? err.message : String(err)),
  });

  async function report() {
    const reason = await dialog.prompt(
      'Something felt off?',
      'Tell us what happened. Reports are confidential and reviewed by a human.',
    );
    if (reason !== null) {
      submit.mutate({ outcome: 'met', reason: reason || 'reported without details' });
    }
  }

  return (
    <Animated.View entering={FadeInDown.duration(600)}>
      <Card style={{ borderColor: colors.amber }}>
        <Label style={{ color: colors.amber }}>Before it fades</Label>
        <Poetic style={{ color: colors.text, fontSize: 21, lineHeight: 30, marginTop: spacing.sm }}>
          Your window closed. Did you two find each other?
        </Poetic>
        <View style={{ height: spacing.md }} />
        <View style={{ gap: spacing.sm }}>
          <Button
            title="We met ✨"
            onPress={() => submit.mutate({ outcome: 'met' })}
            loading={submit.isPending}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                title="They didn't show"
                variant="ghost"
                onPress={() => submit.mutate({ outcome: 'no_show' })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="I couldn't go"
                variant="ghost"
                onPress={() => submit.mutate({ outcome: 'didnt_go' })}
              />
            </View>
          </View>
        </View>
        <View style={{ height: spacing.md }} />
        <Pressable onPress={report} hitSlop={8}>
          <Small style={{ textDecorationLine: 'underline' }}>
            Something felt off? Report it.
          </Small>
        </Pressable>
      </Card>
    </Animated.View>
  );
}
