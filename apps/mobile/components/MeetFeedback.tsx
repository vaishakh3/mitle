import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { View } from 'react-native';
import { submitMeetFeedback } from '../lib/api';
import * as dialog from '../lib/dialog';
import { colors, spacing } from '../lib/theme';
import type { MeetOutcome, PendingFeedback } from '../lib/types';
import { Button, Card, Chip, ChipRow, Input, Label, Poetic, Small } from './ui';

const REPORT_CATEGORIES = ['Safety', 'Harassment', 'Identity concern', 'Other'];

export function MeetFeedbackCard({ feedback }: { feedback: PendingFeedback }) {
  const queryClient = useQueryClient();
  const [reporting, setReporting] = useState(false);
  const [met, setMet] = useState(false);
  const [category, setCategory] = useState('Safety');
  const [reportOutcome, setReportOutcome] = useState<MeetOutcome>('met');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const submit = useMutation({
    mutationFn: ({ outcome, reportReason, secondChapter, secondChapterNote }: {
      outcome: MeetOutcome;
      reportReason?: string;
      secondChapter?: boolean;
      secondChapterNote?: string;
    }) => submitMeetFeedback(
      feedback.history_id,
      outcome,
      reportReason,
      secondChapter,
      secondChapterNote,
    ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pendingFeedback'] }),
        queryClient.invalidateQueries({ queryKey: ['secondChapter'] }),
      ]);
    },
    onError: (error) => dialog.alert('We could not save that', error instanceof Error ? error.message : String(error)),
  });

  if (reporting) {
    return (
      <Card style={{ borderColor: colors.danger, gap: spacing.md }}>
        <View style={{ gap: spacing.sm }}>
          <Label style={{ color: colors.danger }}>Confidential report</Label>
          <Poetic style={{ color: colors.text, fontSize: 21, lineHeight: 30 }}>Tell us what happened.</Poetic>
          <Small>This is attached to the private safety record for this match. The other person will not see it.</Small>
        </View>
        <ChipRow>
          {REPORT_CATEGORIES.map((item) => <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />)}
        </ChipRow>
        <View style={{ gap: spacing.sm }}>
          <Small>What happened with the meet?</Small>
          <ChipRow>
            <Chip label="We met" selected={reportOutcome === 'met'} onPress={() => setReportOutcome('met')} />
            <Chip label="They didn’t show" selected={reportOutcome === 'no_show'} onPress={() => setReportOutcome('no_show')} />
            <Chip label="I couldn’t go" selected={reportOutcome === 'didnt_go'} onPress={() => setReportOutcome('didnt_go')} />
          </ChipRow>
        </View>
        <Input accessibilityLabel="Report details" placeholder="Include the details a reviewer should know…" value={reason} onChangeText={setReason} multiline maxLength={1000} style={{ minHeight: 120, textAlignVertical: 'top' }} />
        <Button title="Send confidential report" variant="danger" onPress={() => submit.mutate({ outcome: reportOutcome, reportReason: `[${category}] ${reason.trim()}` })} loading={submit.isPending} disabled={reason.trim().length < 10} />
        <Button title="Back" variant="quiet" onPress={() => setReporting(false)} />
      </Card>
    );
  }

  if (met) {
    return (
      <Card tone="warm" style={{ borderColor: colors.blush, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Label style={{ color: colors.blush }}>Second Chapter</Label>
          <Poetic style={{ color: colors.text, fontSize: 23, lineHeight: 32 }}>Would you leave the door open?</Poetic>
          <Small>Your answer stays private. A note is revealed only if they independently choose yes too.</Small>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Input
            accessibilityLabel="Second Chapter note"
            placeholder="A number, a handle, or one honest sentence…"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={240}
            style={{ minHeight: 116, textAlignVertical: 'top' }}
          />
          <Small>{note.trim().length}/240 · shown only after a mutual yes</Small>
        </View>

        <Button
          title="Leave my note"
          onPress={() => submit.mutate({
            outcome: 'met',
            secondChapter: true,
            secondChapterNote: note.trim(),
          })}
          loading={submit.isPending}
          disabled={note.trim().length < 8}
        />
        <Button
          title="Close it kindly"
          variant="ghost"
          onPress={() => submit.mutate({ outcome: 'met', secondChapter: false })}
          disabled={submit.isPending}
        />
        <Button title="Back" variant="quiet" onPress={() => setMet(false)} />
      </Card>
    );
  }

  return (
    <Card style={{ borderColor: colors.amber, gap: spacing.md }}>
      <View style={{ gap: spacing.sm }}>
        <Label style={{ color: colors.amber }}>A little closure</Label>
        <Poetic style={{ color: colors.text, fontSize: 21, lineHeight: 30 }}>Did you two find each other?</Poetic>
        <Small>One private answer helps us reduce no-shows. It never becomes a public score.</Small>
      </View>
      <View style={{ gap: spacing.sm }}>
        <Button title="We met" onPress={() => setMet(true)} loading={submit.isPending} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}><Button title="They didn’t show" variant="ghost" onPress={() => submit.mutate({ outcome: 'no_show' })} /></View>
          <View style={{ flex: 1 }}><Button title="I couldn’t go" variant="ghost" onPress={() => submit.mutate({ outcome: 'didnt_go' })} /></View>
        </View>
      </View>
      <Button title="Something felt wrong" variant="quiet" onPress={() => setReporting(true)} />
    </Card>
  );
}
