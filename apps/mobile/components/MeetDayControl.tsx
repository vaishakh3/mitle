import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';
import { updateMeetSignal } from '../lib/api';
import * as dialog from '../lib/dialog';
import { colors, spacing } from '../lib/theme';
import type { CurrentMatch, MeetSignal } from '../lib/types';
import { Body, Button, Card, Chip, ChipRow, Label, Small, StatusPill, Subtitle } from './ui';

const SIGNALS: Array<{ value: MeetSignal; label: string }> = [
  { value: 'heading_there', label: 'On my way' },
  { value: 'arrived', label: 'I’m here' },
  { value: 'running_late', label: '10 min late' },
];

const SIGNAL_LABEL: Record<MeetSignal, string> = {
  heading_there: 'On the way',
  arrived: 'At the venue',
  running_late: 'About 10 min late',
  cant_make_it: 'Can’t make it',
};

export function MeetDayControl({ match }: { match: CurrentMatch }) {
  const queryClient = useQueryClient();
  const opensAt = new Date(match.window_start!).getTime();
  const closesAt = new Date(match.window_end!).getTime();
  const now = Date.now();
  const controlsOpen = now >= opensAt - 3 * 3600_000 && now <= closesAt;
  const mutation = useMutation({
    mutationFn: (signal: MeetSignal) => updateMeetSignal(match.match_id, signal),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currentMatch'] }),
    onError: (error) => dialog.alert('We could not send that update', error instanceof Error ? error.message : String(error)),
  });

  async function cancel() {
    const confirmed = await dialog.confirm(
      'Can’t make it?',
      'Tell them now. This does not reveal your identity, but it may save them a wasted trip.',
      'Send update',
      true,
    );
    if (confirmed) mutation.mutate('cant_make_it');
  }

  if (!controlsOpen) {
    return (
      <Card tone="outlined">
        <Label>Day-of check-in</Label>
        <Subtitle style={{ marginTop: spacing.sm }}>No awkward guessing.</Subtitle>
        <Small style={{ marginTop: spacing.sm }}>
          Three hours before the meet, you can quietly say you’re on the way, here, late, or unable to come. No chat and no identity revealed.
        </Small>
      </Card>
    );
  }

  return (
    <Card style={{ gap: spacing.md, borderColor: colors.amber }}>
      <View style={{ gap: spacing.sm }}>
        <Label style={{ color: colors.amber }}>Day-of check-in</Label>
        <Subtitle>Keep the maybe reliable.</Subtitle>
      </View>
      {match.their_signal ? (
        <View style={{ gap: spacing.xs }}>
          <Small>Their update</Small>
          <StatusPill
            label={SIGNAL_LABEL[match.their_signal]}
            tone={match.their_signal === 'cant_make_it' ? 'rose' : match.their_signal === 'arrived' ? 'sage' : 'amber'}
          />
        </View>
      ) : (
        <Body>They haven’t sent a day-of update yet.</Body>
      )}
      <View style={{ gap: spacing.sm }}>
        <Small>Your update</Small>
        <ChipRow>
          {SIGNALS.map((item) => (
            <Chip key={item.value} label={item.label} selected={match.your_signal === item.value} onPress={() => mutation.mutate(item.value)} />
          ))}
        </ChipRow>
      </View>
      <Button title="I can’t make it" variant="quiet" onPress={cancel} loading={mutation.isPending && match.your_signal === 'cant_make_it'} />
    </Card>
  );
}
