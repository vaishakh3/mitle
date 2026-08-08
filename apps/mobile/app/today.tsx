import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Countdown } from '../components/Countdown';
import { HowItWorks } from '../components/HowItWorks';
import { MeetFeedbackCard } from '../components/MeetFeedback';
import { Orb } from '../components/Orb';
import { Starfield } from '../components/Starfield';
import { Ticket } from '../components/Ticket';
import { WaxSeal } from '../components/WaxSeal';
import { Body, Button, Card, Label, Poetic, Screen, Small, Title } from '../components/ui';
import { getCurrentMatch, getPendingFeedback, respondToMatch } from '../lib/api';
import * as dialog from '../lib/dialog';
import { refreshLocation } from '../lib/location';
import { registerPushToken } from '../lib/push';
import { colors, fonts, spacing } from '../lib/theme';
import type { CurrentMatch } from '../lib/types';

const POLL_MS = 15_000;

function Header() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl + spacing.sm,
        paddingBottom: spacing.sm,
      }}
    >
      <Text style={{ fontFamily: fonts.serifBold, fontSize: 22, color: colors.text }}>
        Meet<Text style={{ fontFamily: fonts.serifItalic, color: colors.blush }}>Cute</Text>
      </Text>
      <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
        <Text style={{ fontSize: 13, fontFamily: fonts.sansBold, letterSpacing: 2, color: colors.muted }}>
          SETTINGS
        </Text>
      </Pressable>
    </View>
  );
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function timeRange(startIso: string, endIso: string): string {
  const t = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${t(new Date(startIso))} – ${t(new Date(endIso))}`;
}

async function sharePlans(match: CurrentMatch) {
  const text = `Heads up — I'm meeting a MeetCute match at ${match.venue!.name} (${match.venue!.address}) on ${dayLabel(match.window_start!)}, ${timeRange(match.window_start!, match.window_end!)}. If you don't hear from me after, check in?`;
  try {
    if (Platform.OS === 'web') {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        dialog.alert('Copied', 'Your plans were copied — paste them to a friend.');
      }
    } else {
      await Share.share({ message: text });
    }
  } catch {
    // user cancelled the share sheet
  }
}

export default function Today() {
  const qc = useQueryClient();
  const matchQuery = useQuery({
    queryKey: ['currentMatch'],
    queryFn: getCurrentMatch,
    refetchInterval: POLL_MS,
  });
  const match = matchQuery.data ?? null;

  const feedbackQuery = useQuery({
    queryKey: ['pendingFeedback'],
    queryFn: getPendingFeedback,
    enabled: !matchQuery.isLoading && !match,
  });
  const pendingFeedback = (!match && feedbackQuery.data) || null;

  const prev = useRef<CurrentMatch | null>(null);
  const [justEnded, setJustEnded] = useState(false);
  useEffect(() => {
    if (prev.current?.status === 'committed' && match === null) {
      setJustEnded(true);
      qc.invalidateQueries({ queryKey: ['pendingFeedback'] });
    }
    if (match) setJustEnded(false);
    prev.current = match;
  }, [match, qc]);

  // The seal is per-match: a new match arrives sealed.
  const [brokenSealFor, setBrokenSealFor] = useState<string | null>(null);

  const [located, setLocated] = useState<boolean | null>(null);
  useEffect(() => {
    refreshLocation().then(setLocated);
    registerPushToken();
  }, []);

  const respond = useMutation({
    mutationFn: ({ action }: { action: 'accept' | 'decline' }) =>
      respondToMatch(match!.match_id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['currentMatch'] }),
    onError: (err) => {
      dialog.alert('Hmm', err instanceof Error ? err.message : String(err));
      qc.invalidateQueries({ queryKey: ['currentMatch'] });
    },
  });

  async function confirmDecline() {
    const ok = await dialog.confirm(
      'Let this one go?',
      'This match never comes back, and tomorrow is tomorrow.',
      'Let it go',
      true,
    );
    if (ok) respond.mutate({ action: 'decline' });
  }

  const refetch = () => qc.invalidateQueries({ queryKey: ['currentMatch'] });

  let scene: React.ReactNode;

  if (matchQuery.isLoading) {
    scene = (
      <View style={{ alignItems: 'center', paddingTop: spacing.xxl }}>
        <Orb size={90} />
      </View>
    );
  } else if (!match) {
    scene = (
      <Animated.View entering={FadeIn.duration(800)}>
        {pendingFeedback ? (
          <View style={{ marginBottom: spacing.lg }}>
            <MeetFeedbackCard feedback={pendingFeedback} />
          </View>
        ) : null}
        <HowItWorks />
        <View style={{ alignItems: 'center' }}>
          <Orb size={pendingFeedback ? 70 : 110} />
          <View style={{ height: spacing.lg }} />
          {justEnded && !pendingFeedback ? (
            <>
              <Title style={{ textAlign: 'center' }}>The rest is offline.</Title>
              <Poetic style={{ textAlign: 'center', marginTop: spacing.sm, maxWidth: 300 }}>
                Your match has faded from here forever. If you found each other,
                the story is yours now — not ours.
              </Poetic>
            </>
          ) : (
            <>
              <Title style={{ textAlign: 'center' }}>Nothing yet.</Title>
              <Poetic style={{ textAlign: 'center', marginTop: spacing.sm, maxWidth: 300 }}>
                Once a day, someone nearby is chosen for you. No browsing, no
                swiping — you'll simply know.
              </Poetic>
              <View style={{ height: spacing.md }} />
              <Small>The city is full of strangers. One of them is tomorrow's.</Small>
            </>
          )}
        </View>
      </Animated.View>
    );
  } else if (match.status === 'pending' && !match.you_accepted && brokenSealFor !== match.match_id) {
    scene = (
      <Animated.View entering={FadeIn.duration(700)} style={{ alignItems: 'center' }}>
        <Label style={{ color: colors.rose }}>Today's match</Label>
        <View style={{ height: spacing.sm }} />
        <Title style={{ textAlign: 'center' }}>A letter arrived.</Title>
        <View style={{ height: spacing.lg }} />
        <WaxSeal onBreak={() => setBrokenSealFor(match.match_id)} />
        <View style={{ height: spacing.lg }} />
        <Countdown until={match.accept_deadline} label="before it fades" onDone={refetch} />
      </Animated.View>
    );
  } else if (match.status === 'pending' && !match.you_accepted) {
    scene = (
      <Animated.View entering={FadeInUp.duration(500)}>
        <Card
          style={{
            borderColor: colors.rose,
            shadowColor: colors.rose,
            shadowOpacity: 0.25,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 0 },
            alignItems: 'center',
            paddingVertical: spacing.xl,
          }}
        >
          <Label style={{ color: colors.rose }}>Today's match</Label>
          <View style={{ height: spacing.md }} />
          <Title style={{ textAlign: 'center' }}>Someone was{'\n'}chosen for you.</Title>
          <Poetic style={{ textAlign: 'center', marginTop: spacing.md, maxWidth: 280 }}>
            You won't learn their name, or see their face. Say yes, and if they
            do too — we'll pick the place and the hour.
          </Poetic>
          <View style={{ height: spacing.lg }} />
          <Countdown until={match.accept_deadline} label="to decide" onDone={refetch} />
          <View style={{ height: spacing.lg }} />
          <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
            <Button
              title="I'm in"
              onPress={() => respond.mutate({ action: 'accept' })}
              loading={respond.isPending}
            />
            <Button title="Not today" variant="quiet" onPress={confirmDecline} />
          </View>
        </Card>
      </Animated.View>
    );
  } else if (match.status === 'pending' && match.you_accepted) {
    scene = (
      <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
        <Orb size={90} />
        <View style={{ height: spacing.lg }} />
        <Title style={{ textAlign: 'center' }}>Your yes is out there.</Title>
        <Poetic style={{ textAlign: 'center', marginTop: spacing.sm, maxWidth: 290 }}>
          Now it's their turn. If they say yes before the clock runs out, you
          both find out where — and when.
        </Poetic>
        <View style={{ height: spacing.lg }} />
        <Countdown until={match.accept_deadline} label="left for them" tone="amber" onDone={refetch} />
      </Animated.View>
    );
  } else if (match.status === 'committed' && match.venue && match.window_start && match.window_end) {
    const live = Date.now() >= new Date(match.window_start).getTime();
    scene = (
      <Animated.View entering={FadeInDown.duration(700)} style={{ gap: spacing.lg }}>
        <View style={{ alignItems: 'center' }}>
          {live ? (
            <>
              <Label style={{ color: colors.amber }}>The window is open</Label>
              <Title style={{ textAlign: 'center', marginTop: 4 }}>Go. Now. ✨</Title>
            </>
          ) : (
            <>
              <Label style={{ color: colors.rose }}>It's set</Label>
              <Title style={{ textAlign: 'center', marginTop: 4 }}>You have a maybe.</Title>
            </>
          )}
        </View>

        <Ticket
          venueName={match.venue.name}
          venueAddress={match.venue.address}
          dateLabel={dayLabel(match.window_start)}
          timeLabel={timeRange(match.window_start, match.window_end)}
          footer={
            <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
              <Countdown
                until={live ? match.window_end : match.window_start}
                label={live ? 'left in the window' : 'until it opens'}
                tone="paper"
                size={34}
                onDone={refetch}
              />
            </View>
          }
        />

        <Card>
          <Label>How to spot them</Label>
          <Poetic style={{ color: colors.text, fontSize: 21, lineHeight: 30, marginTop: spacing.sm }}>
            "{match.their_spot_hint || 'They kept it mysterious. Trust your gut.'}"
          </Poetic>
          <View style={{ height: spacing.md }} />
          <Small>
            When the window closes, this match disappears for good. If you find
            each other — names, numbers, the rest — that's yours to trade in
            person.
          </Small>
        </Card>

        <View style={{ gap: spacing.sm }}>
          <Button
            title="Open in Maps"
            variant="ghost"
            onPress={() => Linking.openURL(match.venue!.maps_url)}
          />
          <Button title="Share plans with a friend" variant="quiet" onPress={() => sharePlans(match)} />
        </View>
      </Animated.View>
    );
  } else {
    scene = (
      <View style={{ alignItems: 'center', paddingTop: spacing.xxl }}>
        <Body>Something's in motion…</Body>
      </View>
    );
  }

  return (
    <Screen>
      <Starfield count={18} />
      <Header />
      {located === false && (
        <Pressable
          onPress={() => refreshLocation().then(setLocated)}
          style={{
            marginHorizontal: spacing.lg,
            marginBottom: spacing.sm,
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.amber,
            borderWidth: 1,
            borderRadius: 14,
            padding: spacing.md,
          }}
        >
          <Small style={{ color: colors.amber }}>
            The city can't find you — matching is paused until location is on.
            Tap to try again.
          </Small>
        </Pressable>
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxl,
          flexGrow: 1,
          justifyContent: match && match.status === 'committed' ? 'flex-start' : 'center',
        }}
      >
        {scene}
      </ScrollView>
    </Screen>
  );
}
