import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import {
  Body,
  Button,
  Chip,
  ChipRow,
  Input,
  Label,
  Poetic,
  ProgressDots,
  Screen,
  Small,
  Title,
} from '../components/ui';
import { listInterests, setMyInterests, upsertPreferences, upsertProfile } from '../lib/api';
import * as dialog from '../lib/dialog';
import { refreshLocation } from '../lib/location';
import { colors, spacing } from '../lib/theme';
import type { Gender } from '../lib/types';

/** "19980412" -> "1998-04-12" as you type. */
function formatBirthdate(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'nonbinary', label: 'Non-binary' },
];

const RADII_KM = [5, 10, 25, 50];
const MAX_INTERESTS = 5;
const TOTAL_STEPS = 5;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);

  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [ageMin, setAgeMin] = useState('21');
  const [ageMax, setAgeMax] = useState('35');
  const [radius, setRadius] = useState(10);

  const interestsQuery = useQuery({ queryKey: ['interests'], queryFn: listInterests });
  const [picked, setPicked] = useState<number[]>([]);

  const [hint, setHint] = useState('');
  const [located, setLocated] = useState(false);
  const [locating, setLocating] = useState(false);

  const birthdateValid = /^\d{4}-\d{2}-\d{2}$/.test(birthdate);
  const agesValid =
    Number(ageMin) >= 18 && Number(ageMax) <= 99 && Number(ageMax) >= Number(ageMin);

  function toggleInterest(id: number) {
    setPicked((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX_INTERESTS
          ? [...prev, id]
          : prev,
    );
  }

  async function shareLocation() {
    setLocating(true);
    // persist the profile first so refreshLocation has a row to update
    try {
      await upsertProfile({
        display_name: name.trim(),
        birthdate,
        gender: gender!,
        spot_hint: hint.trim(),
      });
      const ok = await refreshLocation();
      setLocated(ok);
      if (!ok) {
        dialog.alert(
          'No luck',
          'Location was blocked or unavailable. MeetCute cannot match you without it — check your browser/system permissions and try again.',
        );
      }
    } catch (err) {
      dialog.alert('Something went wrong', err instanceof Error ? err.message : String(err));
    } finally {
      setLocating(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      await upsertProfile({
        display_name: name.trim(),
        birthdate,
        gender: gender!,
        spot_hint: hint.trim(),
      });
      await upsertPreferences({
        interested_genders: interestedIn,
        age_min: Number(ageMin),
        age_max: Number(ageMax),
        radius_km: radius,
      });
      await setMyInterests(picked);
      await upsertProfile({ onboarding_complete: true });
      router.replace('/today');
    } catch (err) {
      dialog.alert('Something went wrong', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    <Animated.View key="about" entering={FadeInRight.duration(400)} style={{ gap: spacing.md }}>
      <Title>First — you.</Title>
      <Body>Kept under lock. Your match never sees any of this.</Body>
      <View style={{ height: spacing.xs }} />
      <Label>Your name</Label>
      <Input placeholder="What do friends call you?" value={name} onChangeText={setName} />
      <Label>Born on</Label>
      <Input
        placeholder="YYYY-MM-DD"
        value={birthdate}
        onChangeText={(t) => setBirthdate(formatBirthdate(t))}
        keyboardType="number-pad"
        maxLength={10}
      />
      <Label>I am a</Label>
      <ChipRow>
        {GENDERS.map((g) => (
          <Chip
            key={g.value}
            label={g.label}
            selected={gender === g.value}
            onPress={() => setGender(g.value)}
          />
        ))}
      </ChipRow>
      <View style={{ height: spacing.sm }} />
      <Button
        title="Continue"
        onPress={() => setStep(1)}
        disabled={!name.trim() || !birthdateValid || !gender}
      />
    </Animated.View>,

    <Animated.View key="prefs" entering={FadeInRight.duration(400)} style={{ gap: spacing.md }}>
      <Title>Who might it be?</Title>
      <Body>The only steering you get. The rest is left to chance.</Body>
      <View style={{ height: spacing.xs }} />
      <Label>Interested in</Label>
      <ChipRow>
        {GENDERS.map((g) => (
          <Chip
            key={g.value}
            label={g.label}
            selected={interestedIn.includes(g.value)}
            onPress={() =>
              setInterestedIn((prev) =>
                prev.includes(g.value) ? prev.filter((x) => x !== g.value) : [...prev, g.value],
              )
            }
          />
        ))}
      </ChipRow>
      <Label>Between the ages of</Label>
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <Input
          style={{ flex: 1, textAlign: 'center' }}
          keyboardType="number-pad"
          maxLength={2}
          value={ageMin}
          onChangeText={setAgeMin}
        />
        <Small>and</Small>
        <Input
          style={{ flex: 1, textAlign: 'center' }}
          keyboardType="number-pad"
          maxLength={2}
          value={ageMax}
          onChangeText={setAgeMax}
        />
      </View>
      {!agesValid && <Small style={{ color: colors.danger }}>18+, and in order.</Small>}
      <Label>Within</Label>
      <ChipRow>
        {RADII_KM.map((r) => (
          <Chip key={r} label={`${r} km`} selected={radius === r} onPress={() => setRadius(r)} />
        ))}
      </ChipRow>
      <View style={{ height: spacing.sm }} />
      <Button
        title="Continue"
        onPress={() => setStep(2)}
        disabled={interestedIn.length === 0 || !agesValid}
      />
      <Button title="Back" variant="quiet" onPress={() => setStep(0)} />
    </Animated.View>,

    <Animated.View key="interests" entering={FadeInRight.duration(400)} style={{ gap: spacing.md }}>
      <Title>Things you love</Title>
      <Body>
        Pick up to {MAX_INTERESTS}. The algorithm listens — a little. Fate does
        the rest.
      </Body>
      <View style={{ height: spacing.xs }} />
      <ChipRow>
        {(interestsQuery.data ?? []).map((i) => (
          <Chip
            key={i.id}
            label={`${i.emoji} ${i.label}`}
            selected={picked.includes(i.id)}
            onPress={() => toggleInterest(i.id)}
          />
        ))}
      </ChipRow>
      <Small>
        {picked.length}/{MAX_INTERESTS} chosen
      </Small>
      <View style={{ height: spacing.sm }} />
      <Button title="Continue" onPress={() => setStep(3)} disabled={picked.length === 0} />
      <Button title="Back" variant="quiet" onPress={() => setStep(1)} />
    </Animated.View>,

    <Animated.View key="hint" entering={FadeInRight.duration(400)} style={{ gap: spacing.md }}>
      <Title>How will they know it's you?</Title>
      <Body>
        No name. No photo. When you both commit to a meet, your match gets only
        this one line. Make it worth looking for.
      </Body>
      <Poetic style={{ color: colors.blush }}>
        "Red scarf, probably reading a book."
      </Poetic>
      <Input
        placeholder="Your one line…"
        value={hint}
        onChangeText={setHint}
        multiline
        style={{ minHeight: 80 }}
      />
      <View style={{ height: spacing.sm }} />
      <Button
        title="Continue"
        onPress={() => setStep(4)}
        disabled={hint.trim().length < 5}
      />
      <Button title="Back" variant="quiet" onPress={() => setStep(2)} />
    </Animated.View>,

    <Animated.View key="location" entering={FadeInRight.duration(400)} style={{ gap: spacing.md }}>
      <Title>Found, not searched.</Title>
      <Body>
        Matches are chosen near you, and the cafe lands between you two. That
        takes your location — roughly, quietly, never shown to anyone.
      </Body>
      <View style={{ height: spacing.xs }} />
      {located ? (
        <Body style={{ color: colors.sage }}>✓ The city knows where to find you.</Body>
      ) : (
        <Button title="Share my location" onPress={shareLocation} loading={locating} />
      )}
      <View style={{ height: spacing.sm }} />
      <Button
        title="Start my first day"
        onPress={finish}
        loading={busy}
        disabled={!located}
      />
      <Button title="Back" variant="quiet" onPress={() => setStep(3)} />
    </Animated.View>,
  ];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xxl + spacing.md }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(500)}>
          <ProgressDots total={TOTAL_STEPS} current={step} />
        </Animated.View>
        <View style={{ height: spacing.lg }} />
        {steps[step]}
      </ScrollView>
    </Screen>
  );
}
