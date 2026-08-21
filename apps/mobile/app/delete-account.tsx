import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Body, Button, Card, Label, PageScroll, Rule, Screen, Title } from '../components/ui';
import { colors, spacing } from '../lib/theme';

export default function DeleteAccountInfo() {
  return (
    <Screen>
      <AppHeader back title="Delete account" />
      <PageScroll style={{ flex: 1 }} contentContainerStyle={{ paddingTop: spacing.sm, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Label style={{ color: colors.accentText }}>You stay in control</Label>
          <Title>Delete Milte from inside the app.</Title>
          <Body>Sign in with your email, open Your corner, then choose Delete account. Two confirmations prevent accidental deletion.</Body>
        </View>
        <Card style={{ gap: spacing.md }}>
          <Rule mark="1" title="Open settings" body="From Today, open Your corner in the top navigation." />
          <Rule mark="2" title="Choose Delete account" body="It appears under Account, below Sign out." />
          <Rule mark="3" title="Confirm twice" body="Your sign-in identity, profile, preferences, interests, and active match are removed immediately." />
        </Card>
        <Card tone="outlined"><Body>Pair-history and confidential safety records may remain for the limited periods in the Privacy Notice to prevent re-matching, investigate reports, and meet legal obligations. They are not used to keep your account active.</Body></Card>
        <Button title="Go to sign in" onPress={() => router.push('/sign-in')} />
        <Button title="Contact support" variant="secondary" onPress={() => router.push('/support')} />
      </PageScroll>
    </Screen>
  );
}
