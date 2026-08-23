import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Body, Button, Card, Chip, ChipRow, Input, Label, PageScroll, Rule, Screen, Small, Subtitle, Title } from '../components/ui';
import { getCurrentMatch, reportActiveMatch } from '../lib/api';
import * as dialog from '../lib/dialog';
import { colors, spacing } from '../lib/theme';

const CATEGORIES = [
  { value: 'safety' as const, label: 'Safety' },
  { value: 'harassment' as const, label: 'Harassment' },
  { value: 'identity' as const, label: 'Identity concern' },
  { value: 'other' as const, label: 'Other' },
];

export default function Safety() {
  const queryClient = useQueryClient();
  const matchQuery = useQuery({ queryKey: ['currentMatch'], queryFn: getCurrentMatch });
  const [reporting, setReporting] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['value']>('safety');
  const [reason, setReason] = useState('');
  const report = useMutation({
    mutationFn: () => reportActiveMatch(matchQuery.data!.match_id, category, reason.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['currentMatch'] });
      dialog.alert('Report sent', 'The match has ended. Your report is confidential and stored for safety review.');
      router.replace('/today');
    },
    onError: (error) => dialog.alert('We could not send the report', error instanceof Error ? error.message : String(error)),
  });

  async function submitReport() {
    const confirmed = await dialog.confirm('Send report and end this match?', 'The match will disappear immediately. The other person will not see what you wrote.', 'Report and end match', true);
    if (confirmed) report.mutate();
  }

  return (
    <Screen>
      <AppHeader back title="Safety" />
      <PageScroll style={{ flex: 1 }} contentContainerStyle={{ paddingTop: spacing.sm, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Label style={{ color: colors.accentText }}>You never owe a stranger your comfort</Label>
          <Title>A good maybe has an easy exit.</Title>
          <Body>Milte reduces unnecessary exposure, but no app can guarantee another person’s behaviour. Your judgment comes first—before the concept, the venue, or their feelings.</Body>
        </View>

        <Card tone="warm" style={{ gap: spacing.md }}>
          <Label style={{ color: colors.amber }}>If you are in immediate danger in India</Label>
          <Subtitle>Call emergency services now.</Subtitle>
          <Small>112 is India’s pan-India emergency number for police, fire, rescue, and health assistance. Milte cannot contact emergency services for you.</Small>
          <Button title="Call 112" variant="danger" onPress={() => Linking.openURL('tel:112')} />
        </Card>

        <View style={{ gap: spacing.sm }}><Label>Before you go</Label><Card style={{ gap: spacing.md }}>
          <Rule mark="1" title="Share the ticket" body="Send the venue, date, and return time to someone you trust." />
          <Rule mark="2" title="Own the journey" body="Arrange your own transport there and home. Keep enough battery to change the plan." />
          <Rule mark="3" title="Stay in public" body="Milte selects a named public place from current map data. Check the surroundings and do not move somewhere private if you are unsure." />
          <Rule mark="4" title="Plan one check-in" body="Ask a friend to message or call near the end of the hour." />
        </Card></View>

        <View style={{ gap: spacing.sm }}><Label>When you arrive</Label><Card style={{ gap: spacing.md }}>
          <Rule mark="A" title="Use the recognition phrase" body="Ask for the phrase shown on both tickets before settling in." />
          <Rule mark="B" title="Keep personal details personal" body="Home, workplace, phone number, and socials are yours to share—or not." />
          <Rule mark="C" title="Leave without negotiating" body="If anything feels wrong, move toward staff or other people and go." />
        </Card></View>

        {!!matchQuery.data && (
          <View style={{ gap: spacing.sm }}>
            <Label>Something wrong with this match?</Label>
            {!reporting ? (
              <Card style={{ gap: spacing.md, borderColor: colors.danger }}>
                <Subtitle>Report and end it privately.</Subtitle>
                <Small>The match disappears immediately. Your written report is not shared with the other person.</Small>
                <Button title="Start a confidential report" variant="danger" onPress={() => setReporting(true)} />
              </Card>
            ) : (
              <Card style={{ gap: spacing.md, borderColor: colors.danger }}>
                <ChipRow>{CATEGORIES.map((item) => <Chip key={item.value} label={item.label} selected={category === item.value} onPress={() => setCategory(item.value)} />)}</ChipRow>
                <Input accessibilityLabel="Report details" placeholder="Tell the reviewer what happened…" value={reason} onChangeText={setReason} multiline maxLength={1000} style={{ minHeight: 140, textAlignVertical: 'top' }} />
                <Button title="Report and end match" variant="danger" onPress={submitReport} loading={report.isPending} disabled={reason.trim().length < 10} />
                <Button title="Cancel" variant="quiet" onPress={() => setReporting(false)} />
              </Card>
            )}
          </View>
        )}

        <Card tone="outlined"><Small>Milte’s report channel is for product safety records. It is not a substitute for contacting emergency services, venue staff, law enforcement, or a trusted person when you need immediate help.</Small></Card>
      </PageScroll>
    </Screen>
  );
}
