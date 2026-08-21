import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';
import { confirmMeet } from '../lib/api';
import * as dialog from '../lib/dialog';
import { colors, spacing } from '../lib/theme';
import type { CurrentMatch } from '../lib/types';
import { Body, Button, Card, Label, Small, StatusPill, Subtitle } from './ui';

export function MeetCommitment({ match }: { match: CurrentMatch }) {
  const queryClient = useQueryClient();
  const opensAt = match.confirmation_opens_at
    ? new Date(match.confirmation_opens_at).getTime()
    : Number.POSITIVE_INFINITY;
  const isOpen = Date.now() >= opensAt;
  const confirm = useMutation({
    mutationFn: () => confirmMeet(match.match_id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currentMatch'] }),
    onError: (error) => dialog.alert(
      'We could not confirm that',
      error instanceof Error ? error.message : String(error),
    ),
  });

  if (!isOpen) {
    return (
      <Card tone="outlined" style={{ gap: spacing.sm }}>
        <Label>The promise</Label>
        <Subtitle>We will ask once more tomorrow.</Subtitle>
        <Small>A final private confirmation opens 24 hours before the meet. It keeps both people from travelling on an old yes.</Small>
      </Card>
    );
  }

  return (
    <Card style={{ gap: spacing.md, borderColor: match.you_confirmed ? colors.sage : colors.blush }}>
      <View style={{ gap: spacing.sm }}>
        <Label style={{ color: match.you_confirmed ? colors.sage : colors.blush }}>The promise</Label>
        <Subtitle>{match.you_confirmed ? 'Your yes is current.' : 'Still in for this hour?'}</Subtitle>
        <Body>{match.you_confirmed ? 'We saved your confirmation.' : 'Confirm only when the plan still works. The other person sees readiness, never your identity.'}</Body>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <StatusPill label={match.you_confirmed ? 'You · confirmed' : 'You · waiting'} tone={match.you_confirmed ? 'sage' : 'amber'} />
        <StatusPill label={match.they_confirmed ? 'Them · confirmed' : 'Them · waiting'} tone={match.they_confirmed ? 'sage' : 'neutral'} />
      </View>

      {!match.you_confirmed && (
        <Button title="Confirm I’m still in" onPress={() => confirm.mutate()} loading={confirm.isPending} />
      )}
      {match.you_confirmed && !match.they_confirmed && (
        <Small>You do not need to wait here. Their answer will appear when they confirm.</Small>
      )}
    </Card>
  );
}
