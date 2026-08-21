import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Body, Button, Card, Label, PageScroll, Rule, Screen, Small, Title } from '../components/ui';
import { LEGAL_VERSION } from '../lib/legal';
import { colors, spacing } from '../lib/theme';

export default function Privacy() {
  return (
    <Screen>
      <AppHeader back title="Privacy Notice" />
      <PageScroll style={{ flex: 1 }} contentContainerStyle={{ paddingTop: spacing.sm, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Label style={{ color: colors.accentText }}>Effective {LEGAL_VERSION}</Label>
          <Title>Your data should have a job—and an ending.</Title>
          <Body>This notice explains how Milte collects, uses, reveals, retains, and deletes personal data for members in India.</Body>
        </View>

        <View style={{ gap: spacing.sm }}><Label>What Milte collects</Label><Card style={{ gap: spacing.md }}>
          <Rule mark="01" title="Account & eligibility" body="Email, first name, birth date, gender, legal-consent versions and times, account state, and an internal user ID." />
          <Rule mark="02" title="Private matching choices" body="Interested genders, age range, distance, available days, preferred hour, interests, relationship intent, social energy, date style, and budget comfort." />
          <Rule mark="03" title="Area & device" body="A rounded location point and update time; a push token if you allow notifications; and ordinary AWS security and service logs." />
          <Rule mark="04" title="Meet & safety records" body="Pairing, decisions, venue plan, day-of signals, confirmation, attendance feedback, second-chapter choices, confidential reports, and support requests." />
        </Card></View>

        <View style={{ gap: spacing.sm }}><Label>Why it is used</Label><Card style={{ gap: spacing.md }}>
          <Rule mark="→" title="Provide the product" body="Authenticate you, enforce mutual boundaries, create at most one active match, choose a public place, deliver requested notifications, and support account deletion." />
          <Rule mark="→" title="Protect people and the service" body="Prevent repeat pairings, receive reports, restrict abusive accounts, investigate incidents, secure systems, and respond to lawful requests." />
          <Rule mark="→" title="Operate with consent and necessity" body="Milte uses data you provide to perform the service, your permission for device features, and legitimate safety and security needs. Legal obligations may also require limited processing." />
        </Card></View>

        <View style={{ gap: spacing.sm }}><Label>What another member can see</Label><Card tone="warm" style={{ gap: spacing.md }}>
          <Rule mark="✓" title="Only after two yeses" body="The selected public venue, one-hour window, your spot hint, day-of status, confirmation state, and time-gated recognition phrase." />
          <Rule mark="×" title="Never through the match API" body="Your name, email, birthday, gender, location point, interests, preferences, reports, feedback, legal consents, push token, or internal ID." />
        </Card></View>

        <View style={{ gap: spacing.sm }}><Label>Service providers and transfers</Label><Card>
          <Body>AWS hosts authentication, API, database, logs, venue search, and web delivery in the Mumbai region where configured. Expo’s push service processes push tokens and notification payloads when notifications are enabled. Google Maps opens only when you choose a maps link. Your device platform processes permission, calendar, sharing, and deep-link actions. These providers may process limited data under their own terms and cross-border infrastructure.</Body>
        </Card></View>

        <View style={{ gap: spacing.sm }}><Label>Retention schedule</Label><Card style={{ gap: spacing.md }}>
          <Rule mark="Live" title="Account and matching profile" body="Kept while your account is active, then deleted when you use in-app deletion. Database recovery copies can persist for up to 35 days." />
          <Rule mark="Now" title="Active match details" body="Removed from the live match at decline, expiry, report, or the end of the one-hour window. Venue, phrase, and day-of signals are not copied into match history." />
          <Rule mark="400d" title="Match outcome and private feedback" body="Retained for up to 400 days for product integrity and attendance handling, then automatically expires." />
          <Rule mark="3y" title="Pair exclusion and safety reports" body="Pair-exclusion records and confidential reports are retained for up to three years to prevent re-matching and investigate abuse; an active legal or safety matter may require a longer hold." />
          <Rule mark="30d" title="Application logs" body="Operational Lambda logs are configured for 30 days and must not include tokens, coordinates, or report text." />
        </Card></View>

        <View style={{ gap: spacing.sm }}><Label>Your choices and rights</Label><Card style={{ gap: spacing.md }}>
          <Rule mark="✓" title="Pause, update, or withdraw device access" body="Change matching choices in Your corner and control location or notification permission in system settings." />
          <Rule mark="✓" title="Delete in the product" body="Settings removes your sign-in identity, profile, preferences, interests, and active match. Limited de-identified or safety records follow the schedule above." />
          <Rule mark="✓" title="Ask for help" body="Use Support to request access, correction, deletion help, or raise a privacy concern. Identity verification may be required before disclosing account data." />
        </Card></View>

        <Button title="Account deletion instructions" variant="secondary" onPress={() => router.push('/delete-account')} />
        <Button title="Contact support" variant="ghost" onPress={() => router.push('/support')} />
        <Card tone="outlined"><Small>Material policy changes receive a new version and renewed in-app consent. Qualified counsel must approve this notice before public Play Store rollout.</Small></Card>
      </PageScroll>
    </Screen>
  );
}
