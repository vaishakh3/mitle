import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';
import { Button, Card, Chip, Input, Muted, Screen, Subtitle } from '../components/ui';
import {
  deleteAccount,
  getMyInterestIds,
  getMyPreferences,
  getMyProfile,
  listInterests,
  setMyInterests,
  upsertPreferences,
  upsertProfile,
} from '../lib/api';
import { supabase } from '../lib/supabase';
import { colors, spacing } from '../lib/theme';
import type { Gender } from '../lib/types';

const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: 'woman', label: 'Women' },
  { value: 'man', label: 'Men' },
  { value: 'nonbinary', label: 'Non-binary' },
];
const RADII = [5, 10, 25, 50];
const MAX_INTERESTS = 5;

export default function Settings() {
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ['profile'], queryFn: getMyProfile });
  const prefsQ = useQuery({ queryKey: ['preferences'], queryFn: getMyPreferences });
  const interestsQ = useQuery({ queryKey: ['interests'], queryFn: listInterests });
  const myInterestsQ = useQuery({ queryKey: ['myInterests'], queryFn: getMyInterestIds });

  const [hint, setHint] = useState('');
  const [paused, setPaused] = useState(false);
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [radius, setRadius] = useState(10);
  const [picked, setPicked] = useState<number[]>([]);

  useEffect(() => {
    if (profileQ.data) {
      setHint(profileQ.data.spot_hint);
      setPaused(profileQ.data.is_paused);
    }
  }, [profileQ.data]);
  useEffect(() => {
    if (prefsQ.data) {
      setInterestedIn(prefsQ.data.interested_genders);
      setRadius(prefsQ.data.radius_km);
    }
  }, [prefsQ.data]);
  useEffect(() => {
    if (myInterestsQ.data) setPicked(myInterestsQ.data);
  }, [myInterestsQ.data]);

  const save = useMutation({
    mutationFn: async () => {
      await upsertProfile({ spot_hint: hint.trim(), is_paused: paused });
      await upsertPreferences({ interested_genders: interestedIn, radius_km: radius });
      await setMyInterests(picked);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      Alert.alert('Saved', 'Your changes take effect from the next daily match.');
    },
    onError: (err) => Alert.alert('Hmm', err instanceof Error ? err.message : String(err)),
  });

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This erases your profile, preferences, and any active match. There is no undo.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/sign-in');
            } catch (err) {
              Alert.alert('Hmm', err instanceof Error ? err.message : String(err));
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}>
        <Card>
          <Subtitle>Pause matching</Subtitle>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Muted>Take a break — no new matches while paused.</Muted>
            <Switch value={paused} onValueChange={setPaused} trackColor={{ true: colors.accent }} />
          </View>
        </Card>

        <Card>
          <Subtitle>Your spot hint</Subtitle>
          <Muted>Revealed to a committed match so they can find you.</Muted>
          <View style={{ height: spacing.sm }} />
          <Input value={hint} onChangeText={setHint} multiline placeholder='e.g. "Red scarf, probably reading a book"' />
        </Card>

        <Card>
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
          <Subtitle>Within</Subtitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {RADII.map((r) => (
              <Chip key={r} label={`${r} km`} selected={radius === r} onPress={() => setRadius(r)} />
            ))}
          </View>
        </Card>

        <Card>
          <Subtitle>Interests</Subtitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(interestsQ.data ?? []).map((i) => (
              <Chip
                key={i.id}
                label={`${i.emoji} ${i.label}`}
                selected={picked.includes(i.id)}
                onPress={() =>
                  setPicked((prev) =>
                    prev.includes(i.id)
                      ? prev.filter((x) => x !== i.id)
                      : prev.length < MAX_INTERESTS
                        ? [...prev, i.id]
                        : prev,
                  )
                }
              />
            ))}
          </View>
        </Card>

        <Button title="Save changes" onPress={() => save.mutate()} loading={save.isPending} />
        <Button
          title="Sign out"
          variant="ghost"
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace('/sign-in');
          }}
        />
        <Button title="Delete account" variant="danger" onPress={confirmDelete} />
      </ScrollView>
    </Screen>
  );
}
