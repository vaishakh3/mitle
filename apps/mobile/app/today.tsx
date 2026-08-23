import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Platform, RefreshControl, Share, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { AppHeader } from '../components/AppHeader';
import { ConversationSpark } from '../components/ConversationSpark';
import { Countdown } from '../components/Countdown';
import { HowItWorks } from '../components/HowItWorks';
import { MeetDayControl } from '../components/MeetDayControl';
import { MeetCommitment } from '../components/MeetCommitment';
import { MeetFeedbackCard } from '../components/MeetFeedback';
import { MeetingPoint } from '../components/MeetingPoint';
import { MiltePulse } from '../components/MiltePulse';
import { SecondChapterCard } from '../components/SecondChapter';
import { Ticket } from '../components/Ticket';
import { Body, Button, Card, Label, PageScroll, Poetic, Rule, Screen, Small, StatusPill, Subtitle, Title } from '../components/ui';
import { getCurrentMatch, getMyPreferences, getMyProfile, getPendingFeedback, getSecondChapterResult, respondToMatch } from '../lib/api';
import { addToCalendar } from '../lib/calendar';
import * as dialog from '../lib/dialog';
import { refreshLocation } from '../lib/location';
import { registerPushToken } from '../lib/push';
import { colors, spacing } from '../lib/theme';
import type { CurrentMatch } from '../lib/types';

const POLL_MS = 15_000;

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function timeRange(startIso: string, endIso: string): string {
  const format = (date: Date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${format(new Date(startIso))} – ${format(new Date(endIso))}`;
}

async function sharePlans(match: CurrentMatch) {
  const text = `I’m meeting an anonymous Milte match at ${match.venue!.name} (${match.venue!.address}) on ${dayLabel(match.window_start!)}, ${timeRange(match.window_start!, match.window_end!)}. Milte selected this public place from current map data. Please check in with me after the hour.`;
  try {
    if (Platform.OS === 'web') {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        dialog.alert('Plan copied', 'Send it to someone you trust.');
      }
    } else {
      await Share.share({ message: text });
    }
  } catch {
    // Closing the share sheet is not an error.
  }
}

export default function Today() {
  const queryClient = useQueryClient();
  const matchQuery = useQuery({ queryKey: ['currentMatch'], queryFn: getCurrentMatch, refetchInterval: POLL_MS });
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getMyProfile });
  const preferencesQuery = useQuery({ queryKey: ['preferences'], queryFn: getMyPreferences });
  const match = matchQuery.data ?? null;
  const feedbackQuery = useQuery({ queryKey: ['pendingFeedback'], queryFn: getPendingFeedback, enabled: !matchQuery.isLoading && !match });
  const secondChapterQuery = useQuery({ queryKey: ['secondChapter'], queryFn: getSecondChapterResult, enabled: !matchQuery.isLoading && !match, refetchInterval: POLL_MS * 4 });
  const pendingFeedback = (!match && feedbackQuery.data) || null;
  const secondChapter = (!match && secondChapterQuery.data) || null;
  const previous = useRef<CurrentMatch | null>(null);
  const [justEnded, setJustEnded] = useState(false);
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const [openStateReadyFor, setOpenStateReadyFor] = useState<string | null>(null);
  const [located, setLocated] = useState<boolean | null>(null);

  useEffect(() => {
    if (previous.current?.status === 'committed' && match === null) {
      setJustEnded(true);
      queryClient.invalidateQueries({ queryKey: ['pendingFeedback'] });
    }
    if (match) setJustEnded(false);
    previous.current = match;
  }, [match, queryClient]);

  useEffect(() => {
    if (!match || match.status !== 'pending') return;
    const id = match.match_id;
    setOpenStateReadyFor(null);
    setOpenedFor(null);
    AsyncStorage.getItem(`milte.invitation.${id}`).then((value) => {
      if (value === 'open') setOpenedFor(id);
      setOpenStateReadyFor(id);
    });
  }, [match?.match_id, match?.status]);

  useEffect(() => { registerPushToken(); }, []);

  useEffect(() => {
    if (profileQuery.isLoading) return;
    const updatedAt = profileQuery.data?.location_updated_at;
    const hasFreshStoredLocation =
      profileQuery.data?.lat != null &&
      profileQuery.data?.lng != null &&
      !!updatedAt &&
      Date.now() - new Date(updatedAt).getTime() < 30 * 24 * 3600_000;
    if (hasFreshStoredLocation) setLocated(true);
    else refreshLocation().then(setLocated);
  }, [profileQuery.data?.lat, profileQuery.data?.lng, profileQuery.data?.location_updated_at, profileQuery.isLoading]);

  const respond = useMutation({
    mutationFn: ({ action }: { action: 'accept' | 'decline' }) => respondToMatch(match!.match_id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currentMatch'] }),
    onError: (error) => {
      dialog.alert('That moment passed', error instanceof Error ? error.message : String(error));
      queryClient.invalidateQueries({ queryKey: ['currentMatch'] });
    },
  });

  async function confirmDecline() {
    const ok = await dialog.confirm('Let this one go?', 'This pairing will not return. There will be another day.', 'Let it go', true);
    if (ok) respond.mutate({ action: 'decline' });
  }

  async function openPossibility(id: string) {
    setOpenedFor(id);
    await AsyncStorage.setItem(`milte.invitation.${id}`, 'open');
  }

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['currentMatch'] }),
    queryClient.invalidateQueries({ queryKey: ['pendingFeedback'] }),
    queryClient.invalidateQueries({ queryKey: ['secondChapter'] }),
  ]);

  let scene: React.ReactNode;

  if (matchQuery.isLoading) {
    scene = <View accessible accessibilityLabel="Checking today’s possibility" accessibilityLiveRegion="polite" style={{ alignItems: 'center', paddingTop: spacing.xxxl }}><MiltePulse size={82} /><Small>Checking today’s possibility…</Small></View>;
  } else if (matchQuery.isError) {
    scene = (
      <Card accessibilityRole="alert" style={{ gap: spacing.md }}>
        <Label style={{ color: colors.danger }}>Couldn’t reach the city</Label>
        <Title>Your day is still here.</Title>
        <Body>Milte could not load your match state. Check your connection and try once more.</Body>
        <Button title="Try again" onPress={() => matchQuery.refetch()} />
      </Card>
    );
  } else if (profileQuery.isError || preferencesQuery.isError) {
    scene = (
      <Card accessibilityRole="alert" style={{ gap: spacing.md }}>
        <Label style={{ color: colors.danger }}>Your private choices are unavailable</Label>
        <Title>Nothing has been changed.</Title>
        <Body>Milte could not safely determine your availability. Check your connection and try again.</Body>
        <Button title="Try again" onPress={() => Promise.all([profileQuery.refetch(), preferencesQuery.refetch()])} />
      </Card>
    );
  } else if (profileQuery.data?.is_suspended) {
    scene = (
      <Card style={{ gap: spacing.md, borderColor: colors.danger }}>
        <Label style={{ color: colors.danger }}>Account access paused</Label>
        <Title>Your account needs review.</Title>
        <Body>You are out of matching and cannot use an active plan while this review is open.</Body>
        <Button title="Review status and next steps" onPress={() => router.replace('/account-review')} />
      </Card>
    );
  } else if (!match) {
    const tomorrow = new Date(Date.now() + 24 * 3600_000).getDay();
    const paused = profileQuery.data?.is_paused;
    const availableTomorrow = preferencesQuery.data?.available_days?.includes(tomorrow) ?? true;
    scene = (
      <Animated.View entering={FadeIn.duration(500)} style={{ gap: spacing.lg }}>
        {secondChapter && <SecondChapterCard result={secondChapter} />}
        {pendingFeedback && <MeetFeedbackCard feedback={pendingFeedback} />}
        <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
          <MiltePulse size={pendingFeedback ? 66 : 94} />
          <View style={{ height: spacing.md }} />
          <StatusPill
            label={paused ? 'Matching paused' : located === null ? 'Checking location' : located === false ? 'Location needed' : availableTomorrow ? 'Ready for tomorrow' : 'Tomorrow is off'}
            tone={paused ? 'neutral' : located === true && availableTomorrow ? 'sage' : 'amber'}
          />
          <Title style={{ textAlign: 'center', marginTop: spacing.md }}>
            {justEnded ? 'The rest is offline.' : paused ? 'Taking a little room.' : located === false ? 'A place before a possibility.' : 'Nothing to perform here.'}
          </Title>
          <Poetic style={{ textAlign: 'center', marginTop: spacing.sm, maxWidth: 340 }}>
            {justEnded
              ? 'Your match has faded from the app. If you found each other, the story belongs to you now.'
              : paused
                ? 'You will stay out of the daily draw until you decide to return.'
                : located === null
                  ? 'Milte is checking whether your private location is fresh enough for tomorrow’s draw.'
                  : located === false
                    ? 'Add your location when you are ready. Until then, your account stays safely outside the draw.'
                : availableTomorrow
                  ? 'If someone nearby fits both sets of boundaries, one possibility will arrive. Until then, close the app.'
                  : 'You marked tomorrow unavailable, so we will leave it entirely yours.'}
          </Poetic>
        </View>
        {(paused || !availableTomorrow) && <Button title="Change my availability" variant="ghost" onPress={() => router.push('/settings')} />}
        <HowItWorks />
        <Card tone="outlined" style={{ gap: spacing.md }}>
          <Label>What the algorithm can see</Label>
          <Rule mark="→" title="Mutual boundaries" body="Gender, age range, distance, and a day both people can make." />
          <Rule mark="→" title="Private alignment" body="Intent, social energy, date style, budget, and interests nudge the pairing." />
          <Rule mark="?" title="Still a surprise" body="Chance remains part of every match. Compatibility is not destiny." />
          <Rule mark="×" title="Never a popularity score" body="No likes, photos, engagement, or desirability ranking." />
        </Card>
      </Animated.View>
    );
  } else if (match.status === 'pending' && !match.you_accepted && (openStateReadyFor !== match.match_id || openedFor !== match.match_id)) {
    scene = (
      <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: 'center' }}>
        <StatusPill label="Today’s match" tone="rose" />
        <Title style={{ textAlign: 'center', marginTop: spacing.md }}>Someone said maybe.</Title>
        <Poetic style={{ textAlign: 'center', marginTop: spacing.sm, maxWidth: 320 }}>No portrait. No pitch. Just one private choice, made by both of you.</Poetic>
        <View style={{ height: spacing.lg }} />
        <MeetingPoint onOpen={() => openPossibility(match.match_id)} />
        <View style={{ height: spacing.lg }} />
        <Countdown until={match.accept_deadline} label="to decide" onDone={refresh} />
      </Animated.View>
    );
  } else if (match.status === 'pending' && !match.you_accepted) {
    scene = (
      <Animated.View entering={FadeInUp.duration(430)} style={{ gap: spacing.lg }}>
        <Card tone="warm" style={{ borderColor: colors.rose, gap: spacing.lg, paddingVertical: spacing.xl }}>
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Label style={{ color: colors.accentText }}>One mutual possibility</Label>
            <Title style={{ textAlign: 'center' }}>Someone fits the shape of your yes.</Title>
            <Poetic style={{ textAlign: 'center', maxWidth: 310 }}>You won’t learn their name or see their face. If both of you choose this, Milte will select tomorrow’s public place and hour.</Poetic>
          </View>
          <Countdown until={match.accept_deadline} label="to decide" onDone={refresh} />
          <View style={{ gap: spacing.sm }}>
            <Button title="I’m open to meeting" onPress={() => respond.mutate({ action: 'accept' })} loading={respond.isPending} />
            <Button title="Not today" variant="quiet" onPress={confirmDecline} />
          </View>
        </Card>
        <Card tone="outlined"><Small style={{ textAlign: 'center' }}>Saying no is private. The other person is simply told the match did not happen.</Small></Card>
      </Animated.View>
    );
  } else if (match.status === 'pending' && match.you_accepted) {
    scene = (
      <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: 'center' }}>
        <MiltePulse size={82} />
        <StatusPill label="Your answer · yes" tone="sage" />
        <Title style={{ textAlign: 'center', marginTop: spacing.md }}>Your yes is out there.</Title>
        <Poetic style={{ textAlign: 'center', marginTop: spacing.sm, maxWidth: 320 }}>Now they get the same quiet choice. You don’t need to wait here—we’ll let you know.</Poetic>
        <View style={{ height: spacing.lg }} />
        <Card tone="outlined" style={{ alignSelf: 'stretch', gap: spacing.md }}>
          <Rule mark="✓" title="You answered" body="Your choice stays anonymous." />
          <Rule mark="…" title="Waiting on them" body="The place appears only if they choose it too." />
        </Card>
        <View style={{ height: spacing.lg }} />
        <Countdown until={match.accept_deadline} label="left for their answer" tone="amber" onDone={refresh} />
      </Animated.View>
    );
  } else if (match.status === 'committed' && match.cancelled) {
    scene = (
      <Animated.View entering={FadeIn.duration(400)} style={{ gap: spacing.lg }}>
        <Card style={{ gap: spacing.md, borderColor: colors.danger }}>
          <StatusPill label="Plan cancelled" tone="rose" />
          <Title>Do not travel to the venue.</Title>
          <Body>
            {match.cancelled_by_you
              ? 'You told the other person you cannot make it. This plan is closed and cannot be reopened.'
              : 'The other person said they cannot make it. This plan is closed; please do not go to the venue.'}
          </Body>
          <Small>No identity was revealed. Milte will clear this plan after its original window ends.</Small>
        </Card>
        <Button title="Safety center" variant="ghost" onPress={() => router.push('/safety')} />
        <Button title="Contact support" variant="quiet" onPress={() => router.push('/support')} />
      </Animated.View>
    );
  } else if (match.status === 'committed' && match.venue && match.window_start && match.window_end) {
    const now = Date.now();
    const live = now >= new Date(match.window_start).getTime();
    scene = (
      <Animated.View entering={FadeInDown.duration(520)} style={{ gap: spacing.lg }}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <StatusPill label={live ? 'The window is open' : 'Both said yes'} tone={live ? 'amber' : 'sage'} />
          <Title style={{ textAlign: 'center' }}>{live ? 'Phone down. Eyes up.' : 'Tomorrow has a place now.'}</Title>
          <Poetic style={{ textAlign: 'center' }}>{live ? 'Go find your stranger.' : 'No planning spiral. Just show up as yourself.'}</Poetic>
        </View>

        <Ticket
          venueName={match.venue.name}
          venueAddress={match.venue.address}
          dateLabel={dayLabel(match.window_start)}
          timeLabel={timeRange(match.window_start, match.window_end)}
          footer={<View style={{ marginTop: spacing.md, alignItems: 'center' }}><Countdown until={live ? match.window_end : match.window_start} label={live ? 'left in your hour' : 'until the window opens'} tone="paper" size={34} onDone={refresh} /></View>}
        />

        <Card style={{ gap: spacing.md }}>
          <View>
            <Label>How to spot them</Label>
            <Poetic style={{ color: colors.text, fontSize: 22, lineHeight: 31, marginTop: spacing.sm }}>“{match.their_spot_hint || 'Their clue is unavailable. Use the recognition phrase, and leave if you cannot identify each other safely.'}”</Poetic>
          </View>
          {!!match.meeting_phrase && (
            <Card tone="warm" style={{ padding: spacing.md }}>
              <Label style={{ color: colors.blush }}>Recognition phrase</Label>
              <Subtitle style={{ marginTop: spacing.xs, color: colors.blush }}>{match.meeting_phrase}</Subtitle>
              <Small style={{ marginTop: spacing.xs }}>Ask for this phrase before you settle in. Only this match can see it.</Small>
            </Card>
          )}
        </Card>

        <MeetCommitment match={match} />

        <MeetDayControl match={match} />

        <View style={{ gap: spacing.sm }}>
          <Button title="Open the venue in Maps" variant="secondary" onPress={() => Linking.openURL(match.venue!.maps_url)} />
          <Button title="Add the hour to my calendar" variant="ghost" onPress={() => addToCalendar(match)} />
          <Button title="Share this plan with someone" variant="ghost" onPress={() => sharePlans(match)} />
          <Button title="Safety & getting home" variant="quiet" onPress={() => router.push('/safety')} />
        </View>

        {live && <ConversationSpark />}
        <Card tone="outlined"><Small style={{ textAlign: 'center' }}>When the hour closes, the ticket disappears. If you both leave a Second Chapter note afterward, those two notes—and only those notes—are revealed.</Small></Card>
      </Animated.View>
    );
  } else {
    scene = <View style={{ alignItems: 'center', paddingTop: spacing.xxxl }}><Body>Something is in motion…</Body></View>;
  }

  return (
    <Screen>
      <AppHeader title="Today" actionLabel="Settings" onAction={() => router.push('/settings')} />
      {located === false && (
        <View style={{ paddingHorizontal: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          <Card tone="warm" style={{ padding: spacing.md, gap: spacing.sm }}>
            <Label style={{ color: colors.amber }}>Matching paused by location</Label>
            <Small>Milte can’t place you in the daily draw until location is available.</Small>
            <Button title="Try location again" variant="quiet" onPress={() => refreshLocation().then(setLocated)} />
          </Card>
        </View>
      )}
      <PageScroll
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: spacing.md }}
        refreshControl={<RefreshControl refreshing={matchQuery.isFetching && !matchQuery.isLoading} onRefresh={refresh} tintColor={colors.rose} />}
      >
        {scene}
      </PageScroll>
    </Screen>
  );
}
