import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import * as dialog from '../lib/dialog';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Starfield } from '../components/Starfield';
import { Body, Button, Input, Label, Poetic, Screen } from '../components/ui';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing } from '../lib/theme';

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
    if (error) return dialog.alert('Hmm', error.message);
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
    if (error) return dialog.alert('Hmm', error.message);
    router.replace('/');
  }

  return (
    <Screen>
      <Starfield />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', padding: spacing.lg, paddingBottom: spacing.xxl }}
      >
        <Animated.View entering={FadeIn.duration(900)}>
          <Label style={{ color: colors.rose }}>A dating app, barely</Label>
          <Text
            style={{
              fontFamily: fonts.serifBold,
              fontSize: 56,
              lineHeight: 62,
              color: colors.text,
              marginTop: spacing.sm,
            }}
          >
            Meet{'\n'}
            <Text style={{ fontFamily: fonts.serifItalic, color: colors.blush }}>Cute.</Text>
          </Text>
          <Poetic style={{ marginTop: spacing.md, maxWidth: 300 }}>
            One stranger a day. No photos, no chats, no swiping — just a place,
            a time, and a maybe.
          </Poetic>
        </Animated.View>

        <View style={{ height: spacing.xl }} />

        {stage === 'email' ? (
          <Animated.View entering={FadeInDown.duration(700).delay(250)} style={{ gap: spacing.md }}>
            <Input
              placeholder="you@somewhere.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={sendCode}
            />
            <Button
              title="Begin"
              onPress={sendCode}
              loading={busy}
              disabled={!email.includes('@')}
            />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(500)} style={{ gap: spacing.md }}>
            <Body>
              A six-digit secret is on its way to{' '}
              <Body style={{ color: colors.text }}>{email.trim()}</Body>.
            </Body>
            <Input
              placeholder="••••••"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              onSubmitEditing={verify}
              style={{ letterSpacing: 12, textAlign: 'center', fontSize: 22 }}
            />
            <Button title="Step inside" onPress={verify} loading={busy} disabled={code.length !== 6} />
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg }}>
              <Button title="Resend code" variant="quiet" onPress={sendCode} />
              <Button title="Different email" variant="quiet" onPress={() => setStage('email')} />
            </View>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
