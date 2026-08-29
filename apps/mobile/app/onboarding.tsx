import { useQuery } from '@tanstack/react-query';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { AvatarToken } from '../components/AvatarToken';
import {
  Body,
  Brand,
  Button,
  Card,
  CheckRow,
  Chip,
  ChipRow,
  ChoiceCard,
  Field,
  Input,
  Page,
  PageScroll,
  ProgressDots,
  Rule,
  Screen,
  Small,
  Subtitle,
  Title,
} from '../components/ui';
import { getMyProfile, listInterests, setMyInterests, upsertPreferences, upsertProfile } from '../lib/api';
import * as dialog from '../lib/dialog';
import { refreshLocation } from '../lib/location';
import { LEGAL_VERSION } from '../lib/legal';
import { AVATARS, DEFAULT_AVATAR_ID } from '../lib/avatars';
import { hourLabel, MEET_HOURS, WEEKDAYS } from '../lib/schedule';
import { colors, fonts, radii, spacing } from '../lib/theme';
import type { AvatarId, DateStyle, Gender, RelationshipIntent, SocialEnergy } from '../lib/types';
import { birthdateError } from '../lib/validation';

function formatBirthdate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateYearsAgo(years: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setHours(12, 0, 0, 0);
  return date;
}

const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'nonbinary', label: 'Non-binary' },
];
const RADII_KM = [5, 10, 25, 50];
const MAX_INTERESTS = 5;
const TOTAL_STEPS = 8;
const RELATIONSHIP_INTENTS: Array<{ value: RelationshipIntent; title: string; body: string }> = [
  { value: 'long_term', title: 'Something lasting', body: 'I am dating with a long-term relationship in mind.' },
  { value: 'open', title: 'Open, if it feels right', body: 'I care more about the person than naming the ending now.' },
  { value: 'figuring_out', title: 'Still figuring it out', body: 'I want to meet honestly without promising a destination.' },
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

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [showBirthdatePicker, setShowBirthdatePicker] = useState(false);
  const [gender, setGender] = useState<Gender | null>(null);
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_ID);
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [ageMin, setAgeMin] = useState('21');
  const [ageMax, setAgeMax] = useState('35');
  const [radius, setRadius] = useState(10);
  const [availableDays, setAvailableDays] = useState<number[]>([2, 4, 6]);
  const [preferredHour, setPreferredHour] = useState(19);
  const [relationshipIntent, setRelationshipIntent] = useState<RelationshipIntent>('open');
  const [socialEnergy, setSocialEnergy] = useState<SocialEnergy>('balanced');
  const [dateStyle, setDateStyle] = useState<DateStyle>('coffee');
  const [budgetLevel, setBudgetLevel] = useState(2);
  const [picked, setPicked] = useState<number[]>([]);
  const [hint, setHint] = useState('');
  const [located, setLocated] = useState(false);
  const [locating, setLocating] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [communityAccepted, setCommunityAccepted] = useState(false);

  const interestsQuery = useQuery({ queryKey: ['interests'], queryFn: listInterests });
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getMyProfile });
  const birthdayMessage = birthdate.length === 10 ? birthdateError(birthdate) : null;
  const birthdateValid = birthdate.length === 10 && !birthdayMessage;
  const agesValid = Number(ageMin) >= 18 && Number(ageMax) <= 99 && Number(ageMax) >= Number(ageMin);
  const latestBirthdate = dateYearsAgo(18);
  const earliestBirthdate = dateYearsAgo(99);
  const selectedBirthdate = birthdate ? new Date(`${birthdate}T12:00:00`) : dateYearsAgo(25);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  function chooseBirthdate(event: DateTimePickerEvent, value?: Date) {
    if (Platform.OS === 'android') setShowBirthdatePicker(false);
    if (event.type === 'set' && value) setBirthdate(formatBirthdate(value));
  }

  function toggleInterest(id: number) {
    setPicked((prev) => prev.includes(id) ? prev.filter((value) => value !== id) : prev.length < MAX_INTERESTS ? [...prev, id] : prev);
  }

  function toggleDay(day: number) {
    setAvailableDays((prev) => prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day]);
  }

  async function shareLocation() {
    setLocating(true);
    try {
      await upsertProfile({ display_name: name.trim(), birthdate, gender: gender!, avatar_id: avatarId, spot_hint: hint.trim() });
      const ok = await refreshLocation();
      setLocated(ok);
      if (!ok) {
        dialog.alert('Location is still off', 'Milte needs location while you use the app to find a public meeting place between you and your match. Check system permissions, then try again.');
      }
    } catch (error) {
      dialog.alert('We could not save that', error instanceof Error ? error.message : String(error));
    } finally {
      setLocating(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      const acceptedAt = new Date().toISOString();
      await upsertProfile({
        display_name: name.trim(),
        birthdate,
        gender: gender!,
        avatar_id: avatarId,
        spot_hint: hint.trim(),
        rules_acknowledged_at: acceptedAt,
        terms_accepted_at: acceptedAt,
        terms_version: LEGAL_VERSION,
        privacy_accepted_at: acceptedAt,
        privacy_version: LEGAL_VERSION,
        community_accepted_at: acceptedAt,
        community_version: LEGAL_VERSION,
        safety_acknowledged_at: acceptedAt,
      });
      await upsertPreferences({
        interested_genders: interestedIn,
        age_min: Number(ageMin),
        age_max: Number(ageMax),
        radius_km: radius,
        available_days: availableDays,
        preferred_hour: preferredHour,
        relationship_intent: relationshipIntent,
        social_energy: socialEnergy,
        date_style: dateStyle,
        budget_level: budgetLevel,
      });
      await setMyInterests(picked);
      await upsertProfile({ onboarding_complete: true });
      router.replace('/today');
    } catch (error) {
      dialog.alert('We could not finish setup', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const screens = [
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Title>First, a few private details.</Title>
        <Body>Your match never sees your name, age, birthday, or gender. These are for eligibility and support only.</Body>
      </View>
      <Field label="First name">
        <Input accessibilityLabel="First name" placeholder="What do friends call you?" value={name} onChangeText={setName} maxLength={50} autoComplete="name" />
      </Field>
      <Field label="Date of birth" hint="You must be 18 or older.">
        {Platform.OS === 'web' ? React.createElement('input', {
          'aria-label': 'Date of birth',
          type: 'date',
          min: formatBirthdate(earliestBirthdate),
          max: formatBirthdate(latestBirthdate),
          value: birthdate,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => setBirthdate(event.currentTarget.value),
          style: {
            minHeight: 56,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.sm,
            boxSizing: 'border-box',
            color: colors.text,
            fontFamily: fonts.sans,
            fontSize: 16,
            padding: `15px ${spacing.md}px`,
            width: '100%',
          },
        }) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Date of birth"
              accessibilityHint="Opens a calendar"
              accessibilityValue={{ text: birthdate || 'Not selected' }}
              onPress={() => setShowBirthdatePicker(true)}
              style={{
                minHeight: 56,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radii.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: 15,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: birthdate ? colors.text : colors.faint, fontFamily: fonts.sans, fontSize: 16 }}>
                {birthdate || 'Choose from calendar'}
              </Text>
              <Text importantForAccessibility="no" style={{ color: colors.accentText, fontFamily: fonts.sansBold, fontSize: 14 }}>Choose date</Text>
            </Pressable>
            {showBirthdatePicker && (
              <View style={{ gap: spacing.sm }}>
                <DateTimePicker
                  value={selectedBirthdate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  minimumDate={earliestBirthdate}
                  maximumDate={latestBirthdate}
                  onChange={chooseBirthdate}
                />
                {Platform.OS === 'ios' && <Button title="Done" variant="quiet" onPress={() => setShowBirthdatePicker(false)} />}
              </View>
            )}
          </>
        )}
        {!!birthdayMessage && <Small style={{ color: colors.danger }}>{birthdayMessage}</Small>}
      </Field>
      <Field label="I am a">
        <ChipRow>{GENDERS.map((item) => <Chip key={item.value} label={item.label} selected={gender === item.value} onPress={() => setGender(item.value)} />)}</ChipRow>
      </Field>
      <Button title="Continue" onPress={() => setStep(1)} disabled={!name.trim() || !birthdateValid || !gender} />
    </View>,

    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Title>Choose how Milte feels like yours.</Title>
        <Body>We made you a random, unique username. It cannot be edited, so it cannot quietly become your real name.</Body>
      </View>
      <Card style={{ alignItems: 'center', backgroundColor: colors.blueWash, borderColor: '#CAD3FF', flexDirection: isCompact ? 'column' : 'row', gap: spacing.md }}>
        <AvatarToken id={avatarId} size={86} />
        <View style={{ alignItems: isCompact ? 'center' : 'stretch', flex: isCompact ? undefined : 1, gap: spacing.xs, width: isCompact ? '100%' : undefined }}>
          <Subtitle adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={{ textAlign: isCompact ? 'center' : 'left', width: '100%' }}>@{profileQuery.data?.username ?? 'finding-your-name'}</Subtitle>
          <Small style={{ textAlign: isCompact ? 'center' : 'left' }}>Your username stays with this account. Pick the avatar that feels most like you today.</Small>
        </View>
      </Card>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' }}>
        {AVATARS.map((avatar) => (
          <AvatarToken key={avatar.id} id={avatar.id} size={72} selected={avatarId === avatar.id} onPress={() => setAvatarId(avatar.id)} />
        ))}
      </View>
      <Small style={{ color: colors.textDim }}>Your avatar and username add character inside Milte. Your name, age, birthday, and gender still stay private.</Small>
      <Button title="Use this avatar" onPress={() => setStep(2)} disabled={!profileQuery.data?.username} />
    </View>,

    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Title>Who could this be?</Title>
        <Body>These are hard filters, not suggestions. A match is possible only when both people fit each other’s choices.</Body>
      </View>
      <Field label="Interested in">
        <ChipRow>{GENDERS.map((item) => <Chip key={item.value} label={item.label} selected={interestedIn.includes(item.value)} onPress={() => setInterestedIn((prev) => prev.includes(item.value) ? prev.filter((value) => value !== item.value) : [...prev, item.value])} />)}</ChipRow>
      </Field>
      <Field label="Age range">
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <Input accessibilityLabel="Minimum age" style={{ flex: 1, textAlign: 'center' }} keyboardType="number-pad" maxLength={2} value={ageMin} onChangeText={setAgeMin} />
          <Small>to</Small>
          <Input accessibilityLabel="Maximum age" style={{ flex: 1, textAlign: 'center' }} keyboardType="number-pad" maxLength={2} value={ageMax} onChangeText={setAgeMax} />
        </View>
        {!agesValid && <Small style={{ color: colors.danger }}>Use an 18–99 range, from lower to higher.</Small>}
      </Field>
      <Field label="Maximum distance" hint="We use the smaller radius when two people differ.">
        <ChipRow>{RADII_KM.map((value) => <Chip key={value} label={`${value} km`} selected={radius === value} onPress={() => setRadius(value)} />)}</ChipRow>
      </Field>
      <Button title="Continue" onPress={() => setStep(3)} disabled={!interestedIn.length || !agesValid} />
    </View>,

    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Title>When are you actually free?</Title>
        <Body>We only put you in a draw when tomorrow works for you. Fewer maybes, fewer no-shows.</Body>
      </View>
      <Field label="Days I can usually meet">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
          {WEEKDAYS.map((day) => (
            <Pressable key={day.value} accessibilityRole="checkbox" accessibilityLabel={day.label} accessibilityState={{ checked: availableDays.includes(day.value) }} onPress={() => toggleDay(day.value)} style={{ flex: 1, height: 48, borderRadius: radii.sm, borderWidth: 1, borderColor: availableDays.includes(day.value) ? colors.text : colors.border, backgroundColor: availableDays.includes(day.value) ? colors.text : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: availableDays.includes(day.value) ? colors.onAccent : colors.textDim, fontFamily: fonts.sansBold }}>{day.short}</Text>
            </Pressable>
          ))}
        </View>
      </Field>
      <Field label="Best start time" hint="We choose the fairest hour between both preferences.">
        <ChipRow>{MEET_HOURS.map((hour) => <Chip key={hour} label={hourLabel(hour)} selected={preferredHour === hour} onPress={() => setPreferredHour(hour)} />)}</ChipRow>
      </Field>
      <Small style={{ color: colors.textDim }}>A little honesty about your calendar makes the spontaneous part work.</Small>
      <Button title="Continue" onPress={() => setStep(4)} disabled={!availableDays.length} />
    </View>,

    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Title>Private answers. Better surprises.</Title>
        <Body>These help us avoid obvious mismatches. They are never shown as a profile or used as a popularity score.</Body>
      </View>
      <Field label="What are you open to?">
        <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
          {RELATIONSHIP_INTENTS.map((item) => (
            <ChoiceCard key={item.value} title={item.title} body={item.body} selected={relationshipIntent === item.value} onPress={() => setRelationshipIntent(item.value)} />
          ))}
        </View>
      </Field>
      <Field label="My social energy">
        <ChipRow>{SOCIAL_ENERGIES.map((item) => <Chip key={item.value} label={item.label} selected={socialEnergy === item.value} onPress={() => setSocialEnergy(item.value)} />)}</ChipRow>
      </Field>
      <Field label="A first meet should feel like">
        <ChipRow>{DATE_STYLES.map((item) => <Chip key={item.value} label={item.label} selected={dateStyle === item.value} onPress={() => setDateStyle(item.value)} />)}</ChipRow>
      </Field>
      <Field label="Comfortable spend" hint="We use the lower shared comfort when choosing a venue.">
        <ChipRow>{[1, 2, 3].map((value) => <Chip key={value} label={'₹'.repeat(value)} selected={budgetLevel === value} onPress={() => setBudgetLevel(value)} />)}</ChipRow>
      </Field>
      <Button title="Continue" onPress={() => setStep(5)} />
    </View>,

    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Title>Things you genuinely like.</Title>
        <Body>Pick up to five. Shared interests nudge the match; chance still gets the final word.</Body>
      </View>
      {interestsQuery.isError ? (
        <Card accessibilityRole="alert"><Body>We could not load interests.</Body><View style={{ height: spacing.md }} /><Button title="Try again" variant="ghost" onPress={() => interestsQuery.refetch()} /></Card>
      ) : (
        <ChipRow>{(interestsQuery.data ?? []).map((item) => <Chip key={item.id} label={item.label} selected={picked.includes(item.id)} onPress={() => toggleInterest(item.id)} />)}</ChipRow>
      )}
      <Small>{picked.length} of {MAX_INTERESTS} chosen</Small>
      <Button title="Continue" onPress={() => setStep(6)} disabled={!picked.length} />
    </View>,

    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Title>How will they spot you?</Title>
        <Body>This appears only after you both say yes. Describe something visible that day—never your name, workplace, or contact details.</Body>
      </View>
      <Field label="My spot hint" hint={`${hint.trim().length}/120 characters`}>
        <Input accessibilityLabel="Spot hint" placeholder="Red scarf, probably reading a book" value={hint} onChangeText={setHint} multiline maxLength={120} style={{ minHeight: 100, textAlignVertical: 'top' }} />
      </Field>
      <Button title="Continue" onPress={() => setStep(7)} disabled={hint.trim().length < 8} />
    </View>,

    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Title>Found, never exposed.</Title>
        <Body>Your location helps us choose someone nearby and a public venue between you. It is never shown to another member.</Body>
      </View>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Two paths through the city meeting at one café table"
        source={require('../assets/milte-crossed-paths.png')}
        resizeMode="contain"
        style={{ alignSelf: 'stretch', height: 180, width: '100%' }}
      />
      <View style={{ gap: spacing.lg }}>
        <Rule mark="A" title="Public places only" body="First meets are placed in named, populated public venues." />
        <Rule mark="B" title="Leave whenever you want" body="A yes is never an obligation to stay." />
        <Rule mark="C" title="Share the plan" body="Your ticket has a one-tap safety share." />
      </View>
      {located ? (
        <Card style={{ borderColor: colors.sage }}><Body style={{ color: colors.sage }}>✓ Location is ready. Your exact coordinates stay private.</Body></Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Button title="Allow location while using the app" variant="secondary" onPress={shareLocation} loading={locating} />
          <Small>You can finish setup without location. Milte will ask again before you can enter a draw.</Small>
        </View>
      )}
      <CheckRow checked={rulesAccepted} onPress={() => setRulesAccepted((value) => !value)}>
        I am 18 or older. I will meet only when I feel comfortable, treat the other person with respect, and leave or report anything that feels wrong.
      </CheckRow>
      <CheckRow checked={termsAccepted} onPress={() => setTermsAccepted((value) => !value)}>
        I have read and accept the Terms of Use.
      </CheckRow>
      <Button title="Read the Terms" variant="quiet" onPress={() => router.push('/terms')} />
      <CheckRow checked={privacyAccepted} onPress={() => setPrivacyAccepted((value) => !value)}>
        I have read the Privacy Notice and understand how my data is used.
      </CheckRow>
      <Button title="Read the Privacy Notice" variant="quiet" onPress={() => router.push('/privacy')} />
      <CheckRow checked={communityAccepted} onPress={() => setCommunityAccepted((value) => !value)}>
        I agree to the Community Rules, including consent, respect, and public-place safety.
      </CheckRow>
      <Button title="Read the Community Rules" variant="quiet" onPress={() => router.push('/community')} />
      <Button
        title={located ? "Finish and see Today" : "Finish setup — add location later"}
        onPress={finish}
        loading={busy}
        disabled={!rulesAccepted || !termsAccepted || !privacyAccepted || !communityAccepted}
      />
    </View>,
  ];

  return (
    <Screen>
      <Page style={{ paddingTop: Math.max(insets.top, spacing.md) + spacing.md, paddingBottom: spacing.md, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {step === 0 ? <Brand compact /> : (
            <Pressable accessibilityRole="button" accessibilityLabel="Previous step" onPress={() => setStep((value) => Math.max(0, value - 1))} hitSlop={12} style={{ minHeight: 48, justifyContent: 'center' }}>
              <Text style={{ color: colors.textDim, fontFamily: fonts.sansBold, fontSize: 15 }}>← Back</Text>
            </Pressable>
          )}
          <Small>Step {step + 1} of {TOTAL_STEPS}</Small>
        </View>
        <ProgressDots total={TOTAL_STEPS} current={step} />
      </Page>
      <PageScroll ref={scrollRef} contentContainerStyle={{ paddingTop: spacing.md }}>
        <Animated.View key={step} entering={FadeInRight.duration(320)}>
          {screens[step]}
        </Animated.View>
      </PageScroll>
    </Screen>
  );
}
