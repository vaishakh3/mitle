import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Countdown } from '../components/Countdown';
import { Button, Card, Muted, Screen, Subtitle, Title } from '../components/ui';
import { getCurrentMatch, respondToMatch } from '../lib/api';
import { refreshLocation } from '../lib/location';
import { registerPushToken } from '../lib/push';
import { colors, spacing } from '../lib/theme';
import type { CurrentMatch } from '../lib/types';

const POLL_MS = 15_000;

function windowLabel(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const day = start.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${t(start)} – ${t(end)}`;
}

export default function Today() {
  const qc = useQueryClient();
  const matchQuery = useQuery({
    queryKey: ['currentMatch'],
    queryFn: getCurrentMatch,
    refetchInterval: POLL_MS,
  });
  const match = matchQuery.data ?? null;

  // Detect the bittersweet moment a committed match fades away
  const prev = useRef<CurrentMatch | null>(null);
  const [justEnded, setJustEnded] = useState(false);
  useEffect(() => {
    if (prev.current?.status === 'committed' && match === null) setJustEnded(true);
    if (match) setJustEnded(false);
    prev.current = match;
  }, [match]);

  useEffect(() => {
    refreshLocation();
    registerPushToken();
  }, []);

  const respond = useMutation({
    mutationFn: ({ action }: { action: 'accept' | 'decline' }) =>
      respondToMatch(match!.match_id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['currentMatch'] }),
    onError: (err) => Alert.alert('Hmm', err instanceof Error ? err.message : String(err)),
  });

  function confirmDecline() {
    Alert.alert(
      'Let this one go?',
      "You won't get another match until tomorrow, and this one never comes back.",
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Let it go', style: 'destructive', onPress: () => respond.mutate({ action: 'decline' }) },
      ],
    );
  }

  let body: React.ReactNode;

  if (matchQuery.isLoading) {
    body = <Muted>Consulting fate…</Muted>;
  } else if (!match) {
    body = (
      <Card>
        <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>{justEnded ? '🕯️' : '🎲'}</Text>
        {justEnded ? (
          <>
            <Subtitle>This story now lives offline</Subtitle>
            <Muted>
              Your match has faded from the app. If you found each other, the
              rest is yours to write. A new match may find you tomorrow.
            </Muted>
          </>
        ) : (
          <>
            <Subtitle>No match yet</Subtitle>
            <Muted>
              Once a day, the algorithm quietly pairs you with someone nearby.
              No swiping. No profiles. You'll know when it happens.
            </Muted>
          </>
        )}
      </Card>
    );
  } else if (match.status === 'pending' && !match.you_accepted) {
    body = (
      <Card>
        <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>💌</Text>
        <Subtitle>You've been matched</Subtitle>
        <Muted>
          Someone nearby was chosen for you today. No name, no photo — that's
          the point. Accept, and if they accept too, we'll pick a cafe and a
          time for you both.
        </Muted>
        <View style={{ height: spacing.md }} />
        <Muted>Time left to decide</Muted>
        <Countdown
          until={match.accept_deadline}
          onDone={() => qc.invalidateQueries({ queryKey: ['currentMatch'] })}
        />
        <View style={{ height: spacing.md }} />
        <View style={{ gap: spacing.sm }}>
          <Button
            title="I'm in"
            onPress={() => respond.mutate({ action: 'accept' })}
            loading={respond.isPending}
          />
          <Button title="Not today" variant="ghost" onPress={confirmDecline} />
        </View>
      </Card>
    );
  } else if (match.status === 'pending' && match.you_accepted) {
    body = (
      <Card>
        <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>⏳</Text>
        <Subtitle>You said yes</Subtitle>
        <Muted>
          Now it's their turn. If they accept before the clock runs out, you'll
          both find out where — and when.
        </Muted>
        <View style={{ height: spacing.md }} />
        <Countdown
          until={match.accept_deadline}
          onDone={() => qc.invalidateQueries({ queryKey: ['currentMatch'] })}
        />
      </Card>
    );
  } else if (match.status === 'committed' && match.venue && match.window_start && match.window_end) {
    const live = Date.now() >= new Date(match.window_start).getTime();
    body = (
      <View style={{ gap: spacing.md }}>
        <Card>
          <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>{live ? '✨' : '📍'}</Text>
          <Subtitle>{live ? 'Go. Now.' : "It's a date (sort of)"}</Subtitle>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginVertical: 4 }}>
            {match.venue.name}
          </Text>
          <Muted>{match.venue.address}</Muted>
          <View style={{ height: spacing.sm }} />
          <Text style={{ color: colors.accentSoft, fontSize: 16, fontWeight: '600' }}>
            {windowLabel(match.window_start, match.window_end)}
          </Text>
          <View style={{ height: spacing.md }} />
          {live ? (
            <Countdown
              until={match.window_end}
              onDone={() => qc.invalidateQueries({ queryKey: ['currentMatch'] })}
            />
          ) : (
            <Countdown until={match.window_start} />
          )}
          <Muted>{live ? 'left in your window' : 'until your window opens'}</Muted>
          <View style={{ height: spacing.md }} />
          <Button
            title="Open in Maps"
            variant="ghost"
            onPress={() => Linking.openURL(match.venue!.maps_url)}
          />
        </Card>
        <Card>
          <Subtitle>How to spot them</Subtitle>
          <Text style={{ color: colors.text, fontSize: 17, fontStyle: 'italic', marginTop: 4 }}>
            “{match.their_spot_hint || 'They kept it mysterious. Trust your gut.'}”
          </Text>
          <View style={{ height: spacing.sm }} />
          <Muted>
            When the window closes, this match vanishes from the app forever.
            If you meet — trade names, socials, anything. That part is up to
            you. Meet in the open, and let a friend know where you'll be.
          </Muted>
        </Card>
      </View>
    );
  } else {
    body = <Muted>Something's in motion… pull to refresh.</Muted>;
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: 'Today',
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable hitSlop={12}>
                <Text style={{ fontSize: 20 }}>⚙️</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.md }}>
        <Title>MeetCute</Title>
        <Muted>One match. One place. One hour.</Muted>
        <View style={{ height: spacing.lg }} />
        {body}
      </ScrollView>
    </Screen>
  );
}
