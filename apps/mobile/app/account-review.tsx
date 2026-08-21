import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Body, Button, Card, Label, Page, Screen, Title } from '../components/ui';
import { signOut } from '../lib/auth';
import { colors, spacing } from '../lib/theme';

export default function AccountReview() {
  return (
    <Screen style={{ justifyContent: 'center' }}>
      <Page>
        <Card tone="warm" style={{ gap: spacing.md }}>
          <Label style={{ color: colors.amber }}>Account paused for safety review</Label>
          <Title>Matching is unavailable right now.</Title>
          <Body>Your profile is out of the draw and any active match has ended. Contact support if you need context, want to share information, or believe this is a mistake.</Body>
          <Button title="Contact support" onPress={() => router.push('/support')} />
          <Button title="Read Community Rules" variant="secondary" onPress={() => router.push('/community')} />
          <Button title="Sign out" variant="quiet" onPress={async () => { await signOut(); router.replace('/sign-in'); }} />
        </Card>
        <View style={{ height: spacing.md }} />
      </Page>
    </Screen>
  );
}
