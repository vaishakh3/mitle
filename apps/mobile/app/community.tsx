import React from 'react';
import { View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Body, Card, Label, PageScroll, Rule, Screen, Small, Title } from '../components/ui';
import { LEGAL_VERSION } from '../lib/legal';
import { colors, spacing } from '../lib/theme';

export default function CommunityRules() {
  return (
    <Screen>
      <AppHeader back title="Community Rules" />
      <PageScroll style={{ flex: 1 }} contentContainerStyle={{ paddingTop: spacing.sm, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Label style={{ color: colors.accentText }}>Version {LEGAL_VERSION}</Label>
          <Title>The possibility only works when the boundaries do.</Title>
          <Body>These rules apply in the app, at the venue, and to any contact that begins through Milte.</Body>
        </View>

        <Card tone="warm" style={{ gap: spacing.md }}>
          <Rule mark="01" title="Consent is specific and reversible" body="A match is only agreement to consider a one-hour public meet. Ask, listen, and accept no immediately. Consent can change at any time." />
          <Rule mark="02" title="Keep the first meet public" body="Use the revealed venue, arrange independent transport, and never pressure someone to move to a private place." />
          <Rule mark="03" title="Protect anonymity" body="Do not investigate, photograph, record, follow, publish, or share identifying details about a match without clear permission." />
          <Rule mark="04" title="No hate, harassment, or coercion" body="Threats, intimidation, sexual pressure, discriminatory conduct, repeated unwanted contact, stalking, and retaliation are prohibited." />
          <Rule mark="05" title="No scams or solicitation" body="Do not request money, sell services, recruit, promote, or use Milte for fraud, trafficking, or any illegal purpose." />
          <Rule mark="06" title="Adults only; no child exploitation" body="Anyone under 18 is prohibited. Child sexual abuse material, grooming, sextortion, sexual solicitation of minors, trafficking, and any facilitation of child exploitation are forbidden." />
          <Rule mark="07" title="Leave cleanly" body="If you cannot attend, use the day-of status. If you feel uncomfortable, leave. Do not punish or pursue someone for declining or reporting." />
        </Card>

        <View style={{ gap: spacing.sm }}><Label>What happens after a report</Label><Card style={{ gap: spacing.md }}>
          <Rule mark="→" title="The active match ends" body="The other person is not shown your report. The pair is permanently excluded from future matching." />
          <Rule mark="→" title="Safety records are preserved" body="An authorised operator can review the report, restrict an account, preserve relevant evidence, and escalate urgent or legally required matters." />
          <Rule mark="→" title="Serious or repeated violations lose access" body="Milte may suspend or remove accounts to protect people and the integrity of the service." />
        </Card></View>

        <Card tone="outlined"><Small>If you are in immediate danger in India, call 112. Reporting to Milte does not notify emergency services.</Small></Card>
      </PageScroll>
    </Screen>
  );
}
