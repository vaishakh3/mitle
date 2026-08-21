import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Body, Button, Card, Label, PageScroll, Rule, Screen, Small, Title } from '../components/ui';
import { LEGAL_VERSION } from '../lib/legal';
import { colors, spacing } from '../lib/theme';

export default function ChildSafetyStandards() {
  return (
    <Screen>
      <AppHeader back title="Child safety standards" />
      <PageScroll style={{ flex: 1 }} contentContainerStyle={{ paddingTop: spacing.sm, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Label style={{ color: colors.accentText }}>Effective {LEGAL_VERSION}</Label>
          <Title>Adults only. Zero tolerance for exploitation.</Title>
          <Body>Milte is an 18+ dating service. Children cannot create accounts or participate in matches. We prohibit child sexual abuse and exploitation in every part of the service and in contact that begins through Milte.</Body>
        </View>

        <View style={{ gap: spacing.sm }}><Label>Prohibited conduct and content</Label><Card style={{ gap: spacing.md }}>
          <Rule mark="×" title="Child sexual abuse material" body="Never create, upload, request, possess, distribute, link to, or facilitate access to any sexual depiction or exploitation of a person under 18, including computer-generated or manipulated material." />
          <Rule mark="×" title="Grooming and sexual solicitation" body="Sexualizing a child, grooming, sextortion, arranging sexual contact, requesting intimate material, or moving a child toward private or off-platform contact is prohibited." />
          <Rule mark="×" title="Trafficking and facilitation" body="Recruitment, advertising, coercion, commercial sexual exploitation, trafficking, or helping another person evade these standards is prohibited." />
          <Rule mark="18+" title="No minors or age misrepresentation" body="Anyone under 18 must not use Milte. Accounts that indicate a minor user or deliberate age misrepresentation may be restricted while the concern is reviewed." />
        </Card></View>

        <View style={{ gap: spacing.sm }}><Label>How to report</Label><Card tone="warm" style={{ gap: spacing.md }}>
          <Body>For an active match, open Safety and choose “Start a confidential report.” The match ends immediately and that pair cannot be matched again. For any other child-safety concern, open Support, choose Safety, and include enough detail for an authorised reviewer to locate the account or event. Do not send or reproduce illegal imagery in a report.</Body>
          <Button title="Open Safety" variant="danger" onPress={() => router.push('/safety')} />
          <Button title="Contact Support" variant="secondary" onPress={() => router.push('/support')} />
        </Card></View>

        <View style={{ gap: spacing.sm }}><Label>Milte’s response</Label><Card style={{ gap: spacing.md }}>
          <Rule mark="1" title="Protect and restrict" body="Milte may end a match, restrict or remove an account, prevent repeat matching, and preserve relevant records under access controls." />
          <Rule mark="2" title="Review confidentially" body="Authorised reviewers limit access to what is necessary, protect the reporter’s identity, and do not treat an unverified report as proof." />
          <Rule mark="3" title="Report when required" body="Apparent child sexual abuse material or exploitation is handled under applicable law, including preservation and reports to appropriate regional or national authorities when legally required." />
        </Card></View>

        <Card tone="outlined"><Small>If a child or anyone else is in immediate danger in India, call 112 or contact local law enforcement. Milte’s report and support channels are not emergency services and are not monitored continuously.</Small></Card>
      </PageScroll>
    </Screen>
  );
}
