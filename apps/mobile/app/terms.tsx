import React from 'react';
import { View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Body, Card, Label, PageScroll, Rule, Screen, Small, Title } from '../components/ui';
import { LEGAL_VERSION } from '../lib/legal';
import { colors, spacing } from '../lib/theme';

export default function Terms() {
  return (
    <Screen>
      <AppHeader back title="Terms of Use" />
      <PageScroll style={{ flex: 1 }} contentContainerStyle={{ paddingTop: spacing.sm, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Label style={{ color: colors.accentText }}>Effective {LEGAL_VERSION}</Label>
          <Title>A real-world introduction, with real responsibilities.</Title>
          <Body>These Terms govern your use of Milte in India. By creating an account or using the service, you agree to them and to the Privacy Notice and Community Rules.</Body>
        </View>

        <View style={{ gap: spacing.sm }}><Label>Eligibility</Label><Card style={{ gap: spacing.md }}>
          <Rule mark="18+" title="Adults only" body="You must be at least 18, legally able to agree to these Terms, and provide accurate eligibility information." />
          <Rule mark="1" title="One personal account" body="Do not impersonate another person, create accounts for others, or use Milte for commercial solicitation." />
        </Card></View>

        <View style={{ gap: spacing.sm }}><Label>What Milte provides</Label><Card style={{ gap: spacing.md }}>
          <Rule mark="→" title="An introduction, not a guarantee" body="Matching, availability, venue suggestions, identity, conduct, compatibility, attendance, and outcomes are not guaranteed." />
          <Rule mark="→" title="Plans can change" body="A match or venue may be withdrawn for safety, availability, technical, or operational reasons. Check the venue yourself before leaving." />
          <Rule mark="→" title="Your choice remains yours" body="Accepting a match is not consent to contact, touch, travel, continue the date, or move somewhere private. Consent can be withdrawn at any time." />
        </Card></View>

        <View style={{ gap: spacing.sm }}><Label>Your conduct</Label><Card style={{ gap: spacing.md }}>
          <Rule mark="✓" title="Be honest and respectful" body="Follow the Community Rules, respect boundaries, use public places, and leave or seek help when you feel unsafe." />
          <Rule mark="×" title="No abuse or misuse" body="No harassment, threats, stalking, discrimination, sexual coercion, fraud, illegal activity, scraping, reverse engineering, security interference, or attempts to identify anonymous members." />
          <Rule mark="!" title="Report serious concerns" body="Use the confidential report flow when appropriate. For immediate danger, contact 112, venue staff, law enforcement, or a trusted person; Milte is not an emergency service." />
        </Card></View>

        <View style={{ gap: spacing.sm }}><Label>Accounts and enforcement</Label><Card>
          <Body>You are responsible for access to your email and device. Milte may pause, restrict, or terminate access, preserve relevant safety records, and cooperate with lawful requests when reasonably necessary to protect people, operate the service, or enforce these Terms. You may delete your account from Settings.</Body>
        </Card></View>

        <View style={{ gap: spacing.sm }}><Label>Service and liability</Label><Card>
          <Body>The service is provided on an “as available” basis to the extent permitted by law. Nothing excludes rights or remedies that cannot legally be excluded. To the maximum extent permitted by law, Milte is not responsible for another member’s conduct, off-platform activity, venue operations, travel, or indirect losses. You remain responsible for your real-world decisions.</Body>
        </Card></View>

        <View style={{ gap: spacing.sm }}><Label>Changes and disputes</Label><Card>
          <Body>Material changes will receive a new version and require renewed acceptance in the app. These Terms are governed by the laws of India, and disputes are subject to courts of competent jurisdiction in India, without limiting mandatory consumer rights. Contact support first so concerns can be addressed promptly.</Body>
        </Card></View>

        <Card tone="outlined"><Small>This release text is written for clarity and product operation. Qualified counsel must approve it before the public Play Store rollout.</Small></Card>
      </PageScroll>
    </Screen>
  );
}
