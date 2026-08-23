import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Platform, Share, View } from 'react-native';
import { dismissSecondChapter } from '../lib/api';
import * as dialog from '../lib/dialog';
import { colors, spacing } from '../lib/theme';
import type { SecondChapterResult } from '../lib/types';
import { Button, Card, Label, Poetic, Small, StatusPill, Title } from './ui';

async function keepNote(note: string) {
  try {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(note);
      dialog.alert('Note copied', 'Keep it somewhere that belongs to you.');
    } else {
      await Share.share({ message: note });
    }
  } catch {
    // Closing a native share sheet is not an error.
  }
}

export function SecondChapterCard({ result }: { result: SecondChapterResult }) {
  const queryClient = useQueryClient();
  const dismiss = useMutation({
    mutationFn: () => dismissSecondChapter(result.history_id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['secondChapter'] }),
    onError: (error) => dialog.alert(
      'We could not close that yet',
      error instanceof Error ? error.message : String(error),
    ),
  });

  return (
    <Card tone="paper" style={{ gap: spacing.lg }}>
      <View style={{ alignItems: 'flex-start', gap: spacing.md }}>
        <StatusPill label="Mutual · once more" tone="rose" />
        <View style={{ gap: spacing.sm }}>
          <Label style={{ color: colors.roseDeep }}>Second Chapter</Label>
          <Title style={{ color: colors.ink }}>They left the door open too.</Title>
          <Small style={{ color: colors.inkSoft }}>You both chose this independently. Here is the one note they left for you.</Small>
        </View>
      </View>

      <View style={{ borderLeftWidth: 2, borderLeftColor: colors.roseDeep, paddingLeft: spacing.md }}>
        <Poetic style={{ color: colors.ink, fontSize: 22, lineHeight: 32 }}>“{result.note}”</Poetic>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Button title="Keep this note" onPress={() => keepNote(result.note)} />
        <Button title="Close this chapter" variant="quiet" onPress={() => dismiss.mutate()} loading={dismiss.isPending} />
      </View>
    </Card>
  );
}
