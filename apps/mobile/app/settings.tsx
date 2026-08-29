import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { AvatarToken } from '../components/AvatarToken';
import { Body, Button, Card, Chip, ChipRow, ChoiceCard, Divider, Field, Input, Label, PageScroll, Screen, Small, Subtitle, Title } from '../components/ui';
import { deleteAccount, getMyInterestIds, getMyPreferences, getMyProfile, listInterests, setMyInterests, upsertPreferences, upsertProfile } from '../lib/api';
import { signOut, useAuth } from '../lib/auth';
import * as dialog from '../lib/dialog';
import { refreshLocation } from '../lib/location';
import { AVATARS, DEFAULT_AVATAR_ID } from '../lib/avatars';
import { hourLabel, MEET_HOURS, WEEKDAYS } from '../lib/schedule';
import { colors, fonts, radii, spacing } from '../lib/theme';
import type { AvatarId, DateStyle, Gender, RelationshipIntent, SocialEnergy } from '../lib/types';

const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: 'woman', label: 'Women' },
  { value: 'man', label: 'Men' },
  { value: 'nonbinary', label: 'Non-binary people' },
];
const RADII_KM = [5, 10, 25, 50];
const MAX_INTERESTS = 5;
const RELATIONSHIP_INTENTS: Array<{ value: RelationshipIntent; title: string; body: string }> = [
  { value: 'long_term', title: 'Something lasting', body: 'Long-term is the direction I am choosing.' },
  { value: 'open', title: 'Open, if it feels right', body: 'The person matters more than naming the ending now.' },
  { value: 'figuring_out', title: 'Still figuring it out', body: 'Honest curiosity, without a promised destination.' },
];
const SOCIAL_ENERGIES: Array<{ value: SocialEnergy; label: string }> = [
  { value: 'quiet', label: 'Quiet' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'lively', label: 'Lively' },
];
const DATE_STYLES: Array<{ value: DateStyle; label: string }> = [
  { value: 'coffee', label: 'Coffee & conversation' },
  { value: 'activity', label: 'Something to do' },
  { value: 'sober', label: 'Always alcohol-free' },
  { value: 'anything', label: 'Surprise me' },
];

function SettingsLink({ title, body, onPress }: { title: string; body: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, minHeight: 48 }}>
      <View style={{ flex: 1, gap: 2 }}><Body style={{ color: colors.text, fontFamily: fonts.sansBold }}>{title}</Body><Small>{body}</Small></View>
      <Text style={{ color: colors.muted, fontFamily: fonts.sansBold, fontSize: 18 }}>→</Text>
    </Pressable>
  );
}

export default function Settings() {
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getMyProfile });
  const preferencesQuery = useQuery({ queryKey: ['preferences'], queryFn: getMyPreferences });
  const interestsQuery = useQuery({ queryKey: ['interests'], queryFn: listInterests });
  const myInterestsQuery = useQuery({ queryKey: ['myInterests'], queryFn: getMyInterestIds });
  const [hint, setHint] = useState('');
  const [paused, setPaused] = useState(false);
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_ID);
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [radius, setRadius] = useState(10);
  const [ageMin, setAgeMin] = useState('21');
  const [ageMax, setAgeMax] = useState('35');
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [preferredHour, setPreferredHour] = useState(19);
  const [relationshipIntent, setRelationshipIntent] = useState<RelationshipIntent>('open');
  const [socialEnergy, setSocialEnergy] = useState<SocialEnergy>('balanced');
  const [dateStyle, setDateStyle] = useState<DateStyle>('coffee');
  const [budgetLevel, setBudgetLevel] = useState(2);
  const [picked, setPicked] = useState<number[]>([]);
  const [locationBusy, setLocationBusy] = useState(false);
  const profileInitialized = useRef(false);
  const preferencesInitialized = useRef(false);
  const interestsInitialized = useRef(false);
  const agesValid = Number(ageMin) >= 18 && Number(ageMax) <= 99 && Number(ageMax) >= Number(ageMin);

  useEffect(() => {
    if (profileQuery.data && !profileInitialized.current) {
      profileInitialized.current = true;
      setHint(profileQuery.data.spot_hint);
      setPaused(profileQuery.data.is_paused);
      setAvatarId(profileQuery.data.avatar_id ?? DEFAULT_AVATAR_ID);
    }
  }, [profileQuery.data]);
  useEffect(() => {
    if (preferencesQuery.data && !preferencesInitialized.current) {
      preferencesInitialized.current = true;
      setInterestedIn(preferencesQuery.data.interested_genders);
      setRadius(preferencesQuery.data.radius_km);
      setAgeMin(String(preferencesQuery.data.age_min));
      setAgeMax(String(preferencesQuery.data.age_max));
      setAvailableDays(preferencesQuery.data.available_days ?? [0, 1, 2, 3, 4, 5, 6]);
      setPreferredHour(preferencesQuery.data.preferred_hour ?? 18);
      setRelationshipIntent(preferencesQuery.data.relationship_intent ?? 'open');
      setSocialEnergy(preferencesQuery.data.social_energy ?? 'balanced');
      setDateStyle(preferencesQuery.data.date_style ?? 'coffee');
      setBudgetLevel(preferencesQuery.data.budget_level ?? 2);
    }
  }, [preferencesQuery.data]);
  useEffect(() => {
    if (myInterestsQuery.data && !interestsInitialized.current) {
      interestsInitialized.current = true;
      setPicked(myInterestsQuery.data);
    }
  }, [myInterestsQuery.data]);

  const save = useMutation({
    mutationFn: async () => {
      await upsertProfile({ avatar_id: avatarId, spot_hint: hint.trim(), is_paused: paused });
      await upsertPreferences({
        interested_genders: interestedIn,
        radius_km: radius,
        age_min: Number(ageMin),
        age_max: Number(ageMax),
        available_days: availableDays,
        preferred_hour: preferredHour,
        relationship_intent: relationshipIntent,
        social_energy: socialEnergy,
        date_style: dateStyle,
        budget_level: budgetLevel,
      });
      await setMyInterests(picked);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      dialog.alert('Saved', 'Your next draw will use these choices.');
    },
    onError: (error) => dialog.alert('We could not save that', error instanceof Error ? error.message : String(error)),
  });

  async function updateLocation() {
    setLocationBusy(true);
    const ok = await refreshLocation();
    setLocationBusy(false);
    dialog.alert(ok ? 'Location refreshed' : 'Location is still off', ok ? 'Your next draw will use this area.' : 'Check system permissions and try again.');
  }

  async function confirmDelete() {
    const first = await dialog.confirm('Delete your account?', 'Your profile, preferences, and active match will be removed. Minimal safety records may be retained where necessary.', 'Continue', true);
    if (!first) return;
    const final = await dialog.confirm('This cannot be undone', 'If you are sure, delete Milte permanently.', 'Delete forever', true);
    if (!final) return;
    try {
      await deleteAccount();
      router.replace('/sign-in');
    } catch (error) {
      dialog.alert('We could not delete the account', error instanceof Error ? error.message : String(error));
    }
  }

  const toggleDay = (day: number) => setAvailableDays((prev) => prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day]);
  const loading = profileQuery.isLoading || preferencesQuery.isLoading || interestsQuery.isLoading || myInterestsQuery.isLoading;
  const loadError = profileQuery.isError || preferencesQuery.isError || interestsQuery.isError || myInterestsQuery.isError;

  const retryAll = () => Promise.all([
    profileQuery.refetch(),
    preferencesQuery.refetch(),
    interestsQuery.refetch(),
    myInterestsQuery.refetch(),
  ]);

  return (
    <Screen>
      <AppHeader back title="Your corner" />
      <PageScroll style={{ flex: 1 }} contentContainerStyle={{ paddingTop: spacing.sm, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Title>Make the maybe fit your life.</Title>
          <Small>{session?.user.email}</Small>
        </View>

        {loadError ? (
          <Card accessibilityRole="alert" style={{ gap: spacing.md }}>
            <Subtitle>Your choices could not be loaded.</Subtitle>
            <Body>Nothing has been changed. Check your connection and try again.</Body>
            <Button title="Try again" onPress={retryAll} />
          </Card>
        ) : loading ? <Card accessibilityLiveRegion="polite"><Body>Loading your choices…</Body></Card> : (
          <>
            <Card tone={paused ? 'warm' : 'default'}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                <View style={{ flex: 1, gap: 3 }}><Subtitle>{paused ? 'Matching is paused' : 'Matching is on'}</Subtitle><Small>{paused ? 'No new possibilities until you return.' : 'Only on the days you choose below.'}</Small></View>
                <Pressable
                  accessibilityLabel="Matching active"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: !paused }}
                  onPress={() => setPaused((value) => !value)}
                  style={{
                    alignItems: paused ? 'flex-start' : 'flex-end',
                    backgroundColor: paused ? colors.border : colors.text,
                    borderRadius: radii.pill,
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                    width: 52,
                    height: 30,
                  }}
                >
                  <View style={{ backgroundColor: colors.surface, borderRadius: 12, height: 24, width: 24 }} />
                </Pressable>
              </View>
            </Card>

            <View style={{ gap: spacing.sm }}><Label>Your avatar & username</Label><Card style={{ gap: spacing.md }}>
              <View style={{ alignItems: 'center', flexDirection: isCompact ? 'column' : 'row', gap: spacing.md }}>
                <AvatarToken id={avatarId} size={72} />
                <View style={{ alignItems: isCompact ? 'center' : 'stretch', flex: isCompact ? undefined : 1, gap: 3, width: isCompact ? '100%' : undefined }}>
                  <Subtitle adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={{ textAlign: isCompact ? 'center' : 'left', width: '100%' }}>@{profileQuery.data?.username}</Subtitle>
                  <Small style={{ textAlign: isCompact ? 'center' : 'left' }}>Random, unique, and intentionally not editable. Your avatar can change anytime.</Small>
                </View>
              </View>
              <Divider />
              <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' }}>
                {AVATARS.map((avatar) => <AvatarToken key={avatar.id} id={avatar.id} size={64} selected={avatarId === avatar.id} onPress={() => setAvatarId(avatar.id)} />)}
              </View>
            </Card></View>

            <View style={{ gap: spacing.sm }}><Label>Availability</Label><Card style={{ gap: spacing.lg }}>
              <Field label="Days that usually work">
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
                  {WEEKDAYS.map((day) => <Pressable key={day.value} accessibilityRole="checkbox" accessibilityLabel={day.label} accessibilityState={{ checked: availableDays.includes(day.value) }} onPress={() => toggleDay(day.value)} style={{ flex: 1, height: 48, borderRadius: radii.sm, borderWidth: 1, borderColor: availableDays.includes(day.value) ? colors.text : colors.border, backgroundColor: availableDays.includes(day.value) ? colors.text : colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: availableDays.includes(day.value) ? colors.onAccent : colors.textDim, fontFamily: fonts.sansBold }}>{day.short}</Text></Pressable>)}
                </View>
              </Field>
              <Field label="Best start time"><ChipRow>{MEET_HOURS.map((hour) => <Chip key={hour} label={hourLabel(hour)} selected={preferredHour === hour} onPress={() => setPreferredHour(hour)} />)}</ChipRow></Field>
            </Card></View>

            <View style={{ gap: spacing.sm }}><Label>Private fit</Label><Card style={{ gap: spacing.lg }}>
              <Field label="What I am open to"><View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>{RELATIONSHIP_INTENTS.map((item) => <ChoiceCard key={item.value} title={item.title} body={item.body} selected={relationshipIntent === item.value} onPress={() => setRelationshipIntent(item.value)} />)}</View></Field>
              <Divider />
              <Field label="My social energy"><ChipRow>{SOCIAL_ENERGIES.map((item) => <Chip key={item.value} label={item.label} selected={socialEnergy === item.value} onPress={() => setSocialEnergy(item.value)} />)}</ChipRow></Field>
              <Divider />
              <Field label="A first meet should feel like"><ChipRow>{DATE_STYLES.map((item) => <Chip key={item.value} label={item.label} selected={dateStyle === item.value} onPress={() => setDateStyle(item.value)} />)}</ChipRow></Field>
              <Divider />
              <Field label="Comfortable spend" hint="The lower shared comfort guides the venue."><ChipRow>{[1, 2, 3].map((value) => <Chip key={value} label={'₹'.repeat(value)} selected={budgetLevel === value} onPress={() => setBudgetLevel(value)} />)}</ChipRow></Field>
              <Small>These answers are used only for matching and venue fit. They never become a visible profile.</Small>
            </Card></View>

            <View style={{ gap: spacing.sm }}><Label>Your boundaries</Label><Card>
              <Field label="Interested in"><ChipRow>{GENDERS.map((item) => <Chip key={item.value} label={item.label} selected={interestedIn.includes(item.value)} onPress={() => setInterestedIn((prev) => prev.includes(item.value) ? prev.filter((value) => value !== item.value) : [...prev, item.value])} />)}</ChipRow></Field>
              <Divider />
              <Field label="Age range"><View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}><Input accessibilityLabel="Minimum age" style={{ flex: 1, textAlign: 'center' }} keyboardType="number-pad" maxLength={2} value={ageMin} onChangeText={setAgeMin} /><Small>to</Small><Input accessibilityLabel="Maximum age" style={{ flex: 1, textAlign: 'center' }} keyboardType="number-pad" maxLength={2} value={ageMax} onChangeText={setAgeMax} /></View>{!agesValid && <Small style={{ color: colors.danger }}>Use an 18–99 range, from lower to higher.</Small>}</Field>
              <Divider />
              <Field label="Maximum distance"><ChipRow>{RADII_KM.map((value) => <Chip key={value} label={`${value} km`} selected={radius === value} onPress={() => setRadius(value)} />)}</ChipRow></Field>
            </Card></View>

            <View style={{ gap: spacing.sm }}><Label>Your clue</Label><Card><Field label="Spot hint" hint={`${hint.trim().length}/120 characters`}><Input value={hint} onChangeText={setHint} multiline maxLength={120} style={{ minHeight: 88, textAlignVertical: 'top' }} placeholder="Red scarf, probably reading a book" /></Field></Card></View>

            <View style={{ gap: spacing.sm }}><Label>Common ground</Label><Card><ChipRow>{(interestsQuery.data ?? []).map((item) => <Chip key={item.id} label={item.label} selected={picked.includes(item.id)} onPress={() => setPicked((prev) => prev.includes(item.id) ? prev.filter((value) => value !== item.id) : prev.length < MAX_INTERESTS ? [...prev, item.id] : prev)} />)}</ChipRow><Small style={{ marginTop: spacing.md }}>{picked.length} of {MAX_INTERESTS} chosen</Small></Card></View>

            <Button title="Save my choices" onPress={() => save.mutate()} loading={save.isPending} disabled={!agesValid || !interestedIn.length || !availableDays.length || hint.trim().length < 8 || !picked.length} />
          </>
        )}

        <View style={{ gap: spacing.sm }}><Label>Location, safety & privacy</Label><Card>
          <SettingsLink title="Refresh my location" body="Use this area for future matches." onPress={updateLocation} />
          {locationBusy && <Small style={{ color: colors.amber }}>Finding your area…</Small>}
          <Divider />
          <SettingsLink title="Safety center" body="Before, during, and after a meet." onPress={() => router.push('/safety')} />
          <Divider />
          <SettingsLink title="Your data & privacy" body="What we keep, reveal, and delete." onPress={() => router.push('/privacy')} />
          <Divider />
          <SettingsLink title="Terms of Use" body="The agreement behind the introduction." onPress={() => router.push('/terms')} />
          <Divider />
          <SettingsLink title="Community Rules" body="Consent, respect, and easy exits." onPress={() => router.push('/community')} />
          <Divider />
          <SettingsLink title="Child safety standards" body="18+ access and zero-tolerance rules." onPress={() => router.push('/child-safety')} />
          <Divider />
          <SettingsLink title="Support" body="Account, privacy, safety, or technical help." onPress={() => router.push('/support')} />
        </Card></View>

        <View style={{ gap: spacing.sm }}><Label>Account</Label><Card>
          <SettingsLink title="Sign out" body="Your choices stay here for next time." onPress={async () => { await signOut(); router.replace('/sign-in'); }} />
          <Divider />
          <SettingsLink title="Delete account" body="Remove your profile and active match." onPress={confirmDelete} />
          <Divider />
          <SettingsLink title="Deletion instructions" body="A public explanation of what is removed." onPress={() => router.push('/delete-account')} />
        </Card></View>
      </PageScroll>
    </Screen>
  );
}
