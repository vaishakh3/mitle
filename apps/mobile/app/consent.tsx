import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Body, Button, Card, CheckRow, Label, PageScroll, Screen, Title } from '../components/ui';
import { upsertProfile } from '../lib/api';
import * as dialog from '../lib/dialog';
import { LEGAL_VERSION } from '../lib/legal';
import { colors, spacing } from '../lib/theme';

export default function Consent() {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [community, setCommunity] = useState(false);
  const [safety, setSafety] = useState(false);
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    try {
      const acceptedAt = new Date().toISOString();
      await upsertProfile({
        terms_accepted_at: acceptedAt,
        terms_version: LEGAL_VERSION,
        privacy_accepted_at: acceptedAt,
        privacy_version: LEGAL_VERSION,
        community_accepted_at: acceptedAt,
        community_version: LEGAL_VERSION,
        safety_acknowledged_at: acceptedAt,
        rules_acknowledged_at: acceptedAt,
      });
      router.replace('/today');
    } catch (error) {
      dialog.alert('We could not save your choices', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Updated promise" />
      <PageScroll style={{ flex: 1 }} contentContainerStyle={{ gap: spacing.md }}>
        <Label style={{ color: colors.accentText }}>A clearer promise · {LEGAL_VERSION}</Label>
        <Title>A few things changed.</Title>
        <Body>Review the current terms, privacy notice, safety promise, and community boundaries before returning to the daily draw.</Body>
        <Card style={{ gap: spacing.sm }}>
          <CheckRow checked={terms} onPress={() => setTerms((value) => !value)}>I accept the current Terms of Use.</CheckRow>
          <Button title="Read Terms" variant="quiet" onPress={() => router.push('/terms')} />
          <CheckRow checked={privacy} onPress={() => setPrivacy((value) => !value)}>I have read the current Privacy Notice.</CheckRow>
          <Button title="Read Privacy Notice" variant="quiet" onPress={() => router.push('/privacy')} />
          <CheckRow checked={community} onPress={() => setCommunity((value) => !value)}>I agree to the current Community Rules.</CheckRow>
          <Button title="Read Community Rules" variant="quiet" onPress={() => router.push('/community')} />
          <CheckRow checked={safety} onPress={() => setSafety((value) => !value)}>I am 18 or older and understand that Milte is not an emergency service or a guarantee of another person’s conduct.</CheckRow>
        </Card>
        <View style={{ height: spacing.sm }} />
        <Button title="Accept and continue" onPress={accept} loading={busy} disabled={!terms || !privacy || !community || !safety} />
      </PageScroll>
    </Screen>
  );
}
