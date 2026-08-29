import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Brand, Button, Divider, Field, Input, PageScroll, Rule, Screen, Small, Title } from '../components/ui';
import * as dialog from '../lib/dialog';
import { authErrorMessage, authErrorRetryAfter, beginEmailAuth, completeEmailAuth, isPlayReviewEmail, resendEmailAuth } from '../lib/auth';
import { formatRetryDuration, isEmailCodeValid } from '../lib/auth-flow';
import { colors, fonts, spacing } from '../lib/theme';

export default function SignIn() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [resendAvailableIn, setResendAvailableIn] = useState(0);
  const requestInFlight = useRef(false);
  const normalizedEmail = email.trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const reviewAccess = isPlayReviewEmail(normalizedEmail);
  // Cognito uses different code formats for account confirmation and EMAIL_OTP
  // sign-in. Never make the UI reject a code that the provider actually sent.
  const credentialValid = reviewAccess ? code.length >= 8 : isEmailCodeValid(code);

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
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <PageScroll style={{ flex: 1 }} contentContainerStyle={[styles.content, wide && styles.contentWide]}>
            <View style={styles.topbar}>
              <Brand />
              <Small style={styles.category}>A dating app that gets out of the way.</Small>
            </View>

            <View style={[styles.main, wide && styles.mainWide]}>
              <View style={[styles.hero, wide && styles.heroWide]}>
                <View style={[styles.heroLead, wide && styles.heroLeadWide]}>
                  <View style={styles.heroCopy}>
                    <Text style={[styles.headline, wide && styles.headlineWide]}>
                      Meet one person.{"\n"}<Text style={styles.headlineAccent}>That’s the whole point.</Text>
                    </Text>
                    <Body style={styles.lede}>
                      One private introduction. Two honest yeses. One hour together in a public place.
                    </Body>
                  </View>
                  <Image
                    accessibilityIgnoresInvertColors
                    accessibilityLabel="Two different café chairs waiting at a table with chai"
                    source={require('../assets/milte-cafe-table.png')}
                    resizeMode="contain"
                    style={[styles.heroArt, wide && styles.heroArtWide]}
                  />
                </View>
                <View style={styles.promiseBand}>
                  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.colorBars}>
                    <View style={[styles.colorBar, { backgroundColor: colors.rose }]} />
                    <View style={[styles.colorBar, { backgroundColor: colors.marigold }]} />
                    <View style={[styles.colorBar, { backgroundColor: colors.blue }]} />
                  </View>
                  <Small style={styles.promise}>No feed. No popularity contest. No endless chat.</Small>
                </View>
              </View>

              <View style={[styles.authPanel, wide && styles.authPanelWide]}>
                {stage === 'email' ? (
                  <View style={{ gap: spacing.md }}>
                    <View style={{ gap: spacing.xs }}>
                      <Title style={styles.authTitle}>Start with your email.</Title>
                      <Body>Sign in or create an account with your email. No password to remember.</Body>
                    </View>
                    <Field label="Email address">
                      <Input
                        accessibilityLabel="Email address"
                        placeholder="you@example.com"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                        onSubmitEditing={sendCode}
                        returnKeyType="go"
                      />
                    </Field>
                    <Button
                      title={reviewAccess
                        ? 'Continue to review access'
                        : resendAvailableIn > 0
                          ? `Try again in ${formatRetryDuration(resendAvailableIn)}`
                          : 'Continue with email'}
                      onPress={sendCode}
                      loading={busy}
                      disabled={!emailValid || resendAvailableIn > 0}
                    />
                    <Small style={{ textAlign: 'center' }}>{reviewAccess ? 'Restricted review access for Google Play.' : 'Private, passwordless, and for adults 18+.'}</Small>
                  </View>
                ) : (
                  <View style={{ gap: spacing.md }}>
                    <View style={{ gap: spacing.xs }}>
                      <Title style={styles.authTitle}>{reviewAccess ? 'Enter the review password.' : 'Check your inbox.'}</Title>
                      <Body>{reviewAccess
                        ? <>Use the reusable review password supplied in Google Play Console for <Text style={styles.strong}>{normalizedEmail}</Text>.</>
                        : <>We sent a 6- or 8-digit code to <Text style={styles.strong}>{normalizedEmail}</Text>.</>}
                      </Body>
                    </View>
                    <Input
                      accessibilityLabel={reviewAccess ? 'Google Play review password' : 'Email verification code'}
                      placeholder={reviewAccess ? 'Review password' : '6 or 8 digits'}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete={reviewAccess ? 'off' : 'one-time-code'}
                      secureTextEntry={reviewAccess}
                      keyboardType={reviewAccess ? 'default' : 'number-pad'}
                      maxLength={reviewAccess ? 100 : 8}
                      value={code}
                      onChangeText={(value) => setCode(reviewAccess ? value : value.replace(/\D/g, ''))}
                      onSubmitEditing={verify}
                      style={reviewAccess ? undefined : styles.codeInput}
                    />
                    <Button title="Enter Milte" onPress={verify} loading={busy} disabled={!credentialValid} />
                    {!reviewAccess && <Button
                      title={resendAvailableIn > 0 ? `Resend in ${formatRetryDuration(resendAvailableIn)}` : 'Resend code'}
                      variant="ghost"
                      onPress={resendCode}
                      disabled={busy || resendAvailableIn > 0}
                    />}
                    <Button title="Use another email" variant="quiet" onPress={() => { setStage('email'); setCode(''); setResendAvailableIn(0); }} />
                  </View>
                )}
              </View>
            </View>

            <Divider />
            <View style={styles.principles}>
              <Rule mark="—" title="Private by design" body="No public photos, bios, likes, or follower counts." />
              <Rule mark="—" title="Mutual or nothing" body="The place appears only after you both choose the date." />
              <Rule mark="—" title="Built to end" body="When the hour ends, the live match disappears." />
            </View>

            <View style={styles.legalLinks}>
              <Button title="Terms" variant="quiet" onPress={() => router.push('/terms')} />
              <Button title="Privacy" variant="quiet" onPress={() => router.push('/privacy')} />
              <Button title="Safety" variant="quiet" onPress={() => router.push('/safety')} />
              <Button title="Support" variant="quiet" onPress={() => router.push('/support')} />
            </View>
          </PageScroll>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.md },
  contentWide: { maxWidth: 1040 },
  topbar: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: spacing.md },
  category: { color: colors.textDim, maxWidth: 180, textAlign: 'right' },
  hero: { alignItems: 'stretch', gap: spacing.md },
  heroWide: { flex: 1, justifyContent: 'center', paddingVertical: spacing.lg },
  heroLead: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  heroLeadWide: { gap: spacing.md },
  heroCopy: { flex: 1, gap: spacing.md },
  headline: { color: colors.text, fontFamily: fonts.serifBold, fontSize: 31, lineHeight: 33, letterSpacing: -1.25 },
  headlineWide: { fontSize: 39, lineHeight: 41, letterSpacing: -1.7 },
  headlineAccent: { color: colors.blue, fontFamily: fonts.serifBold },
  lede: { fontSize: 15, lineHeight: 22, maxWidth: 470 },
  heroArt: { height: 142, width: 126 },
  heroArtWide: { height: 220, width: 196 },
  promiseBand: { alignItems: 'center', backgroundColor: colors.text, borderRadius: 6, flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 12 },
  colorBars: { alignItems: 'stretch', flexDirection: 'row', height: 25, overflow: 'hidden', width: 12 },
  colorBar: { flex: 1 },
  promise: { color: colors.onAccent, flex: 1, fontFamily: fonts.sansBold },
  authPanel: { borderTopColor: colors.text, borderTopWidth: 2, paddingTop: spacing.lg },
  authPanelWide: { borderLeftColor: colors.border, borderLeftWidth: 1, borderTopWidth: 0, flex: 1, paddingLeft: spacing.xl, paddingTop: 0 },
  authTitle: { fontSize: 24, lineHeight: 29 },
  main: { gap: spacing.xl },
  mainWide: { alignItems: 'center', flexDirection: 'row', gap: spacing.xxl },
  strong: { color: colors.text, fontFamily: fonts.sansBold },
  codeInput: { fontSize: 22, letterSpacing: 6, textAlign: 'center' },
  principles: { gap: spacing.lg },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
