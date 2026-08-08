import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Button, Chip, Input, Muted, Screen, Subtitle, Title } from '../components/ui';
import { listInterests, setMyInterests, upsertPreferences, upsertProfile } from '../lib/api';
import { refreshLocation } from '../lib/location';
import { colors, spacing } from '../lib/theme';
import type { Gender } from '../lib/types';

const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'nonbinary', label: 'Non-binary' },
];

const RADII = [5, 10, 25, 50];
const MAX_INTERESTS = 5;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // step 0: about you
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);

  // step 1: preferences
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [ageMin, setAgeMin] = useState('21');
  const [ageMax, setAgeMax] = useState('35');
  const [radius, setRadius] = useState(10);

  // step 2: interests
  const interestsQuery = useQuery({ queryKey: ['interests'], queryFn: listInterests });
  const [picked, setPicked] = useState<number[]>([]);

  // step 3: spot hint
  const [hint, setHint] = useState('');

  const birthdateValid = /^\d{4}-\d{2}-\d{2}$/.test(birthdate);

  function toggleInterest(id: number) {
    setPicked((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX_INTERESTS
          ? [...prev, id]
          : prev,
    );
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
      const located = await refreshLocation();
      if (!located) {
        Alert.alert(
          'Location needed',
          'MeetCute matches you with people nearby and picks a cafe between you. Please allow location access to continue.',
        );
        setBusy(false);
        return;
      }
      await upsertProfile({ onboarding_complete: true });
      router.replace('/today');
    } catch (err) {
      Alert.alert('Something went wrong', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    <View key="about" style={{ gap: spacing.md }}>
      <Title>About you</Title>
      <Muted>Your name stays private — your match never sees it.</Muted>
      <Input placeholder="Your name" value={name} onChangeText={setName} />
      <Input
        placeholder="Birthdate (YYYY-MM-DD)"
        value={birthdate}
        onChangeText={setBirthdate}
        keyboardType="numbers-and-punctuation"
      />
      <Subtitle>I am a…</Subtitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {GENDERS.map((g) => (
          <Chip key={g.value} label={g.label} selected={gender === g.value} onPress={() => setGender(g.value)} />
        ))}
      </View>
      <Button
        title="Next"
        onPress={() => setStep(1)}
        disabled={!name.trim() || !birthdateValid || !gender}
      />
    </View>,

    <View key="prefs" style={{ gap: spacing.md }}>
      <Title>Who are you hoping to bump into?</Title>
      <Subtitle>Interested in</Subtitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
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
      </View>
      <Subtitle>Age range</Subtitle>
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <Input style={{ flex: 1 } as any} placeholder="Min" keyboardType="number-pad" value={ageMin} onChangeText={setAgeMin} />
        <Text style={{ color: colors.muted }}>to</Text>
        <Input style={{ flex: 1 } as any} placeholder="Max" keyboardType="number-pad" value={ageMax} onChangeText={setAgeMax} />
      </View>
      <Subtitle>Within</Subtitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {RADII.map((r) => (
          <Chip key={r} label={`${r} km`} selected={radius === r} onPress={() => setRadius(r)} />
        ))}
      </View>
      <Button
        title="Next"
        onPress={() => setStep(2)}
        disabled={
          interestedIn.length === 0 ||
          Number(ageMin) < 18 ||
          Number(ageMax) < Number(ageMin)
        }
      />
      <Button title="Back" variant="ghost" onPress={() => setStep(0)} />
    </View>,

    <View key="interests" style={{ gap: spacing.md }}>
      <Title>A few things you love</Title>
      <Muted>Pick up to {MAX_INTERESTS}. The algorithm listens… a little. Fate does the rest.</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {(interestsQuery.data ?? []).map((i) => (
          <Chip
            key={i.id}
            label={`${i.emoji} ${i.label}`}
            selected={picked.includes(i.id)}
            onPress={() => toggleInterest(i.id)}
          />
        ))}
      </View>
      <Button title="Next" onPress={() => setStep(3)} disabled={picked.length === 0} />
      <Button title="Back" variant="ghost" onPress={() => setStep(1)} />
    </View>,

    <View key="hint" style={{ gap: spacing.md }}>
      <Title>How will they spot you?</Title>
      <Muted>
        Your match never sees your name or photo — only this hint, revealed when
        you both commit to a meet. Make it charming.
      </Muted>
      <Input
        placeholder='e.g. "Red scarf, probably reading a book"'
        value={hint}
        onChangeText={setHint}
        multiline
      />
      <Muted>We'll also ask for your location — matches and cafes are picked nearby.</Muted>
      <Button title="Start my first day" onPress={finish} loading={busy} disabled={hint.trim().length < 5} />
      <Button title="Back" variant="ghost" onPress={() => setStep(2)} />
    </View>,
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingVertical: spacing.xl }} showsVerticalScrollIndicator={false}>
        <Muted>{`Step ${step + 1} of ${steps.length}`}</Muted>
        <View style={{ height: spacing.md }} />
        {steps[step]}
      </ScrollView>
    </Screen>
  );
}
