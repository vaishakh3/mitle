import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Body, Brand, Button, Card, Input, Label, PageScroll, Poetic, Rule, Screen, Small } from '../components/ui';
import * as dialog from '../lib/dialog';
import { authErrorMessage, authErrorRetryAfter, beginEmailAuth, completeEmailAuth, isPlayReviewEmail, resendEmailAuth } from '../lib/auth';
import { formatRetryDuration } from '../lib/auth-flow';
import { colors, fonts, spacing } from '../lib/theme';

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [resendAvailableIn, setResendAvailableIn] = useState(0);
  const requestInFlight = useRef(false);
  const normalizedEmail = email.trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const reviewAccess = isPlayReviewEmail(normalizedEmail);
  const credentialValid = reviewAccess ? code.length >= 8 : code.length === 6;

  useEffect(() => {
    if (resendAvailableIn <= 0) return;
    const timer = setTimeout(() => setResendAvailableIn((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendAvailableIn]);

  async function sendCode() {
    if (!emailValid || busy || requestInFlight.current || resendAvailableIn > 0) return;
    requestInFlight.current = true;
    setBusy(true);
    try {
      const result = await beginEmailAuth(normalizedEmail);
      setStage('code');
      setResendAvailableIn(reviewAccess ? 0 : result.retryAfterSeconds);
    } catch (error) {
      setResendAvailableIn(authErrorRetryAfter(error));
      dialog.alert(authErrorRetryAfter(error) > 0 ? 'Email is temporarily busy' : 'We could not send the code', authErrorMessage(error));
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  async function resendCode() {
    if (busy || requestInFlight.current || resendAvailableIn > 0) return;
    requestInFlight.current = true;
    setBusy(true);
    try {
      const result = await resendEmailAuth();
      setResendAvailableIn(result.retryAfterSeconds);
      dialog.alert('A fresh code is on its way', `We sent it to ${normalizedEmail}. It may take a minute to arrive.`);
    } catch (error) {
      setResendAvailableIn(authErrorRetryAfter(error));
      dialog.alert(authErrorRetryAfter(error) > 0 ? 'Please wait before another code' : 'We could not resend the code', authErrorMessage(error));
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  async function verify() {
    if (!credentialValid || busy || requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    try {
      await completeEmailAuth(code.trim());
      router.replace('/');
    } catch (error) {
      const advancedToSignIn = (error as Error | undefined)?.message === 'Your account is confirmed. Enter the new sign-in code we just sent.';
      setResendAvailableIn(Math.max(resendAvailableIn, authErrorRetryAfter(error)));
      if (advancedToSignIn) setCode('');
      dialog.alert(
        advancedToSignIn ? 'One more code is on its way' : reviewAccess ? 'That review password did not work' : 'That code did not work',
        authErrorMessage(error),
      );
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <PageScroll
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: Math.max(insets.top, spacing.md) + spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.md,
            gap: spacing.xl,
          }}
        >
          <Animated.View entering={FadeIn.duration(700)}>
            <Brand />
            <View style={{ height: spacing.xl }} />
            <Label style={{ color: colors.accentText }}>One real meeting</Label>
            <Text style={{ fontFamily: fonts.serifBold, fontSize: 46, lineHeight: 51, color: colors.text, marginTop: spacing.sm }}>
              One person.{"\n"}<Text style={{ fontFamily: fonts.serifItalic, color: colors.blush }}>One real hour.</Text>
            </Text>
            <Poetic style={{ marginTop: spacing.md, maxWidth: 380 }}>
              Two private yeses reveal one public place. Then the app gets out of your way.
            </Poetic>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(550).delay(150)}>
            {stage === 'email' ? (
              <View style={{ gap: spacing.md }}>
                <Input
                  accessibilityLabel="Email address"
                  placeholder="you@somewhere.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={sendCode}
                  returnKeyType="go"
                />
                <Button
                  title={reviewAccess
                    ? 'Continue to review access'
                    : resendAvailableIn > 0
                      ? `Try again in ${formatRetryDuration(resendAvailableIn)}`
                      : 'Send my private code'}
                  onPress={sendCode}
                  loading={busy}
                  disabled={!emailValid || resendAvailableIn > 0}
                />
                <Small style={{ textAlign: 'center' }}>{reviewAccess ? 'Restricted review access for Google Play.' : 'Passwordless, private, and 18+ only.'}</Small>
                <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button title="Terms" variant="quiet" onPress={() => router.push('/terms')} />
                  <Button title="Privacy" variant="quiet" onPress={() => router.push('/privacy')} />
                  <Button title="Support" variant="quiet" onPress={() => router.push('/support')} />
                </View>
              </View>
            ) : (
              <View style={{ gap: spacing.md }}>
                <Body>{reviewAccess
                  ? <>Enter the reusable review password supplied in Google Play Console for <Text style={{ color: colors.text, fontFamily: fonts.sansBold }}>{normalizedEmail}</Text>.</>
                  : <>We sent a six-digit code to <Text style={{ color: colors.text, fontFamily: fonts.sansBold }}>{normalizedEmail}</Text>.</>}
                </Body>
                <Input
                  accessibilityLabel={reviewAccess ? 'Google Play review password' : 'Six digit sign in code'}
                  placeholder={reviewAccess ? 'Review password' : '••••••'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={reviewAccess}
                  keyboardType={reviewAccess ? 'default' : 'number-pad'}
                  maxLength={reviewAccess ? 100 : 6}
                  value={code}
                  onChangeText={(value) => setCode(reviewAccess ? value : value.replace(/\D/g, ''))}
                  onSubmitEditing={verify}
                  style={{ letterSpacing: reviewAccess ? 0 : 10, textAlign: 'center', fontSize: 22 }}
                />
                <Button title="Enter Milte" onPress={verify} loading={busy} disabled={!credentialValid} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {reviewAccess ? <View /> : <Button
                      title={resendAvailableIn > 0 ? `Resend in ${formatRetryDuration(resendAvailableIn)}` : 'Resend code'}
                      variant="quiet"
                      onPress={resendCode}
                      disabled={busy || resendAvailableIn > 0}
                    />}
                  <Button title="Use another email" variant="quiet" onPress={() => { setStage('email'); setCode(''); setResendAvailableIn(0); }} />
                </View>
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(550).delay(260)}>
            <Card tone="outlined" style={{ gap: spacing.md, paddingVertical: spacing.md }}>
              <Rule mark="01" title="No performance" body="No photos, bios, likes, or follower counts." />
              <Rule mark="02" title="Two real yeses" body="The place is revealed only after you both commit." />
              <Rule mark="03" title="Offline by design" body="When the hour ends, the match disappears." />
            </Card>
          </Animated.View>
        </PageScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}
