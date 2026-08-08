import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Button, Input, Muted, Screen, Title } from '../components/ui';
import { supabase } from '../lib/supabase';
import { colors, spacing } from '../lib/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) return Alert.alert('Hmm', error.message);
    setStage('code');
  }

  async function verify() {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    setBusy(false);
    if (error) return Alert.alert('Hmm', error.message);
    router.replace('/');
  }

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={{ fontSize: 44, marginBottom: spacing.sm }}>✨</Text>
        <Title>MeetCute</Title>
        <Muted>
          One match a day. No photos, no chat, no swiping. Just a place, a time,
          and a maybe.
        </Muted>
        <View style={{ height: spacing.xl }} />
        {stage === 'email' ? (
          <View style={{ gap: spacing.md }}>
            <Input
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Button title="Send me a code" onPress={sendCode} loading={busy} disabled={!email.includes('@')} />
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            <Muted>We sent a 6-digit code to {email.trim()}.</Muted>
            <Input
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
            <Button title="Sign in" onPress={verify} loading={busy} disabled={code.length !== 6} />
            <Button title="Use a different email" variant="ghost" onPress={() => setStage('email')} />
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
