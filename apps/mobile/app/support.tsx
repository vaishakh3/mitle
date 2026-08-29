import React, { useState } from 'react';
import { View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Body, Button, Card, Chip, ChipRow, Field, Input, Label, PageScroll, Screen, Small, Title } from '../components/ui';
import { submitSupportRequest } from '../lib/api';
import { colors, spacing } from '../lib/theme';

const CATEGORIES = [
  { value: 'account' as const, label: 'Account' },
  { value: 'privacy' as const, label: 'Privacy' },
  { value: 'safety' as const, label: 'Safety' },
  { value: 'technical' as const, label: 'Technical' },
  { value: 'other' as const, label: 'Other' },
];

export default function Support() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['value']>('account');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = await submitSupportRequest({ name: name.trim(), email: email.trim(), category, message: message.trim() });
      setReference(result.reference);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader back title="Support" />
      <PageScroll style={{ flex: 1 }} contentContainerStyle={{ paddingTop: spacing.sm, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Title>Tell Milte what you need.</Title>
          <Body>Requests are stored privately in Milte’s AWS account for an authorised operator. Do not use this form for emergencies.</Body>
        </View>

        {reference ? (
          <Card tone="warm" accessibilityLiveRegion="polite" style={{ gap: spacing.md }}>
            <Label style={{ color: colors.sage }}>Request received</Label>
            <Title>{reference}</Title>
            <Body>Keep this reference. A support operator can use the reply email you provided to follow up.</Body>
            <Button title="Send another request" variant="secondary" onPress={() => { setReference(null); setMessage(''); }} />
          </Card>
        ) : (
          <Card style={{ gap: spacing.lg }}>
            <Field label="Name (optional)"><Input value={name} onChangeText={setName} maxLength={80} autoComplete="name" /></Field>
            <Field label="Reply email"><Input value={email} onChangeText={setEmail} maxLength={254} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" /></Field>
            <Field label="What is this about?"><ChipRow>{CATEGORIES.map((item) => <Chip key={item.value} label={item.label} selected={category === item.value} onPress={() => setCategory(item.value)} />)}</ChipRow></Field>
            <Field label="Details" hint={`${message.trim().length}/2000 characters`}><Input value={message} onChangeText={setMessage} maxLength={2000} multiline placeholder="What happened, and what would help?" style={{ minHeight: 150, textAlignVertical: 'top' }} /></Field>
            {!!error && <Small accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Small>}
            <Button title="Send to support" onPress={submit} loading={busy} disabled={!emailValid || message.trim().length < 20} />
          </Card>
        )}

        <Card tone="outlined"><Small>If anyone is in immediate danger in India, call 112. This support form does not contact emergency services and is not monitored continuously.</Small></Card>
      </PageScroll>
    </Screen>
  );
}
